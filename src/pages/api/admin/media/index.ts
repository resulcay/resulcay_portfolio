import type { APIRoute } from 'astro';
import { EXTENSIONS, MAX_UPLOAD_BYTES, MEDIA_KEY, UPLOAD_FOLDERS, checkUpload, type UploadFolder } from '@/domain/media';
import { slug as slugSchema } from '@/domain/schemas';
import { settings } from '@/lib/env';
import { json } from '@/lib/http';

// Uploads go to R2 under a key the server makes up, so names chosen by the
// browser never reach storage. The bytes are checked, not the file name.

const noStorage = () => json({ error: 'File storage is not configured.' }, 503);

function isFolder(value: unknown): value is UploadFolder {
  return typeof value === 'string' && Object.hasOwn(UPLOAD_FOLDERS, value);
}

export const POST: APIRoute = async ({ request }) => {
  const bucket = settings.media;
  if (!bucket) return noStorage();
  const length = Number(request.headers.get('Content-Length') ?? 0);
  if (length > MAX_UPLOAD_BYTES + 64 * 1024) return json({ error: 'Files can be at most 10 MB.' }, 413);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: 'Send the file as a form upload.' }, 400);
  }
  const file = form.get('file');
  const folder = form.get('folder');
  const group = slugSchema.safeParse(form.get('group'));
  if (!(file instanceof File)) return json({ error: 'Choose a file.' }, 422);
  if (!isFolder(folder) || !group.success) return json({ error: 'Unknown upload folder.' }, 422);
  if (file.size > MAX_UPLOAD_BYTES) return json({ error: 'Files can be at most 10 MB.' }, 413);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = checkUpload(bytes, folder);
  if (!check.ok) return json({ error: check.reason }, 422);

  const key = `${folder}/${group.data}/${crypto.randomUUID()}.${EXTENSIONS[check.type]}`;
  await bucket.put(key, bytes, {
    httpMetadata: { contentType: check.type },
    customMetadata: check.size ? { width: String(check.size.width), height: String(check.size.height) } : {},
  });
  return json({ ok: true, key, url: `/media/${key}`, type: check.type, ...check.size }, 201);
};

export const GET: APIRoute = async ({ url }) => {
  const bucket = settings.media;
  if (!bucket) return json({ configured: false, files: [] });
  const prefix = url.searchParams.get('prefix') ?? '';
  if (!/^[a-z0-9/-]{0,80}$/.test(prefix)) return json({ error: 'Bad prefix.' }, 400);
  const listed = await bucket.list({ prefix, limit: 500, include: ['httpMetadata', 'customMetadata'] });
  return json({
    configured: true,
    files: listed.objects.map((o) => ({
      key: o.key,
      url: `/media/${o.key}`,
      size: o.size,
      type: o.httpMetadata?.contentType,
      width: Number(o.customMetadata?.['width']) || undefined,
      height: Number(o.customMetadata?.['height']) || undefined,
      uploaded: o.uploaded.toISOString(),
    })),
  });
};

export const DELETE: APIRoute = async ({ url }) => {
  const bucket = settings.media;
  if (!bucket) return noStorage();
  const key = url.searchParams.get('key') ?? '';
  if (!MEDIA_KEY.test(key)) return json({ error: 'Unknown file.' }, 404);
  await bucket.delete(key);
  return json({ ok: true });
};
