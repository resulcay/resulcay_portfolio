// Upload rules. The admin page checks these before sending a file and the
// server checks them again on the bytes it receives, so a renamed file or a
// hand-made request can't get past them.

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Longest side, in pixels, that the browser resizes photos down to before upload. */
export const TARGET_IMAGE_EDGE = 2400;
export const MAX_IMAGE_EDGE = 4096;
export const MIN_IMAGE_EDGE = 64;

export const IMAGE_TYPES = ['image/webp', 'image/avif', 'image/png', 'image/jpeg'] as const;
export const DOCUMENT_TYPES = ['application/pdf'] as const;
export const AUDIO_TYPES = ['audio/mpeg', 'audio/ogg', 'audio/mp4'] as const;
export const UPLOAD_TYPES = [...IMAGE_TYPES, ...DOCUMENT_TYPES, ...AUDIO_TYPES] as const;

export type ImageType = (typeof IMAGE_TYPES)[number];
export type UploadType = (typeof UPLOAD_TYPES)[number];

export const EXTENSIONS: Record<UploadType, string> = {
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'application/pdf': 'pdf',
  'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
};

/** Where an upload is filed. Each folder accepts only the kinds of file it needs. */
export const UPLOAD_FOLDERS = {
  projects: IMAGE_TYPES,
  site: IMAGE_TYPES,
  cv: DOCUMENT_TYPES,
  music: AUDIO_TYPES,
} as const satisfies Record<string, readonly UploadType[]>;

export type UploadFolder = keyof typeof UPLOAD_FOLDERS;

export function isImageType(type: string): type is ImageType {
  return (IMAGE_TYPES as readonly string[]).includes(type);
}

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  signature.every((byte, i) => bytes[offset + i] === byte);

const ascii = (bytes: Uint8Array, offset: number, length: number) =>
  String.fromCharCode(...bytes.subarray(offset, offset + length));

/** The file's real type, read from its first bytes rather than its name or header. */
export function sniffType(bytes: Uint8Array): UploadType | undefined {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return 'image/webp';
  if (ascii(bytes, 4, 4) === 'ftyp' && ['avif', 'avis'].includes(ascii(bytes, 8, 4))) return 'image/avif';
  if (ascii(bytes, 0, 5) === '%PDF-') return 'application/pdf';
  if (ascii(bytes, 0, 4) === 'OggS') return 'audio/ogg';
  if (ascii(bytes, 4, 4) === 'ftyp' && ['M4A ', 'mp42', 'isom'].includes(ascii(bytes, 8, 4))) return 'audio/mp4';
  // MP3: an ID3 tag, or straight into an MPEG audio frame (11 sync bits set).
  if (ascii(bytes, 0, 3) === 'ID3') return 'audio/mpeg';
  if (bytes[0] === 0xff && ((bytes[1] ?? 0) & 0xe0) === 0xe0) return 'audio/mpeg';
  return undefined;
}

export interface Dimensions {
  width: number;
  height: number;
}

const view = (bytes: Uint8Array) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

function pngSize(bytes: Uint8Array): Dimensions | undefined {
  if (bytes.length < 24 || ascii(bytes, 12, 4) !== 'IHDR') return undefined;
  const v = view(bytes);
  return { width: v.getUint32(16), height: v.getUint32(20) };
}

function jpegSize(bytes: Uint8Array): Dimensions | undefined {
  const v = view(bytes);
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) return undefined;
    const marker = bytes[offset + 1] ?? 0;
    // SOF0..SOF15 carry the frame size, except DHT (C4), JPG (C8) and DAC (CC).
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: v.getUint16(offset + 5), width: v.getUint16(offset + 7) };
    }
    offset += 2 + v.getUint16(offset + 2);
  }
  return undefined;
}

function webpSize(bytes: Uint8Array): Dimensions | undefined {
  if (bytes.length < 30) return undefined;
  const v = view(bytes);
  const chunk = ascii(bytes, 12, 4);
  if (chunk === 'VP8 ') {
    return { width: v.getUint16(26, true) & 0x3fff, height: v.getUint16(28, true) & 0x3fff };
  }
  if (chunk === 'VP8L') {
    const bits = v.getUint32(21, true);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === 'VP8X') {
    const read24 = (at: number) => (bytes[at] ?? 0) | ((bytes[at + 1] ?? 0) << 8) | ((bytes[at + 2] ?? 0) << 16);
    return { width: read24(24) + 1, height: read24(27) + 1 };
  }
  return undefined;
}

function avifSize(bytes: Uint8Array): Dimensions | undefined {
  // The 'ispe' box holds the image size; it sits early in the meta box.
  const limit = Math.min(bytes.length - 16, 4096);
  for (let i = 4; i < limit; i++) {
    if (ascii(bytes, i, 4) === 'ispe') {
      const v = view(bytes);
      return { width: v.getUint32(i + 8), height: v.getUint32(i + 12) };
    }
  }
  return undefined;
}

export function imageSize(bytes: Uint8Array, type: ImageType): Dimensions | undefined {
  switch (type) {
    case 'image/png':
      return pngSize(bytes);
    case 'image/jpeg':
      return jpegSize(bytes);
    case 'image/webp':
      return webpSize(bytes);
    case 'image/avif':
      return avifSize(bytes);
  }
}

export type UploadCheck =
  | { ok: true; type: UploadType; size?: Dimensions }
  | { ok: false; reason: string };

/** Every rule an upload must pass, run on the actual bytes. */
export function checkUpload(bytes: Uint8Array, folder: UploadFolder): UploadCheck {
  if (bytes.length === 0) return { ok: false, reason: 'The file is empty.' };
  if (bytes.length > MAX_UPLOAD_BYTES) return { ok: false, reason: 'Files can be at most 10 MB.' };

  const type = sniffType(bytes);
  const allowed: readonly UploadType[] = UPLOAD_FOLDERS[folder];
  if (!type || !allowed.includes(type)) {
    const names = allowed.map((t) => EXTENSIONS[t].toUpperCase()).join(', ');
    return { ok: false, reason: `This folder accepts ${names} only.` };
  }
  if (!isImageType(type)) return { ok: true, type };

  const size = imageSize(bytes, type);
  if (!size) return { ok: false, reason: "The image size couldn't be read." };
  const longest = Math.max(size.width, size.height);
  const shortest = Math.min(size.width, size.height);
  if (longest > MAX_IMAGE_EDGE) return { ok: false, reason: `Images can be at most ${MAX_IMAGE_EDGE} px on the long side.` };
  if (shortest < MIN_IMAGE_EDGE) return { ok: false, reason: `Images must be at least ${MIN_IMAGE_EDGE} px on the short side.` };
  return { ok: true, type, size };
}

/** Media keys are generated by the server; anything else is refused. */
export const MEDIA_KEY = /^(projects|site|cv|music)\/[a-z0-9-]{1,60}\/[a-z0-9-]{8,64}\.(webp|avif|png|jpg|pdf|mp3|ogg|m4a)$/;
