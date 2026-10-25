import { MAX_UPLOAD_BYTES, TARGET_IMAGE_EDGE, UPLOAD_FOLDERS, type UploadFolder } from '@/domain/media';

export interface Uploaded {
  key: string;
  url: string;
  type: string;
  width?: number;
  height?: number;
}

/**
 * Shrinks a photo to the target size and re-encodes it as WebP. Small images
 * and anything the browser can't decode are sent as they are; the server
 * checks them either way.
 */
export async function prepareImage(file: File): Promise<Blob> {
  if (file.type === 'image/avif') return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  const scale = Math.min(1, TARGET_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const webp = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.85));
  if (!webp || webp.type !== 'image/webp') return file;
  return scale === 1 && file.size <= webp.size && file.type === 'image/webp' ? file : webp;
}

export async function upload(file: Blob, folder: UploadFolder, group: string): Promise<Uploaded> {
  const allowed: readonly string[] = UPLOAD_FOLDERS[folder];
  if (!allowed.includes(file.type)) throw new Error('This kind of file is not allowed here.');
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('Files can be at most 10 MB.');
  const body = new FormData();
  body.set('file', file);
  body.set('folder', folder);
  body.set('group', group);
  const response = await fetch('/api/admin/media', { method: 'POST', body, credentials: 'same-origin' });
  const data = (await response.json().catch(() => ({}))) as Partial<Uploaded> & { error?: string };
  if (!response.ok || !data.key || !data.url || !data.type) throw new Error(data.error ?? 'Upload failed.');
  return data as Uploaded;
}
