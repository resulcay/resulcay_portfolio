import { describe, expect, it } from 'vitest';
import { MAX_UPLOAD_BYTES, MEDIA_KEY, checkUpload, imageSize, sniffType } from '@/domain/media';

function png(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(64);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

function jpeg(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(64);
  // SOI, an APP0 segment of length 16, then SOF0.
  bytes.set([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  const sof = 2 + 2 + 16;
  bytes.set([0xff, 0xc0, 0x00, 0x11, 0x08], sof);
  const view = new DataView(bytes.buffer);
  view.setUint16(sof + 5, height);
  view.setUint16(sof + 7, width);
  return bytes;
}

function webpLossy(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(64);
  const text = (at: number, s: string) => bytes.set([...s].map((c) => c.charCodeAt(0)), at);
  text(0, 'RIFF');
  text(8, 'WEBP');
  text(12, 'VP8 ');
  const view = new DataView(bytes.buffer);
  view.setUint16(26, width, true);
  view.setUint16(28, height, true);
  return bytes;
}

const pdf = new TextEncoder().encode('%PDF-1.7\n...');

describe('upload rules', () => {
  it('reads the real type from the bytes', () => {
    expect(sniffType(png(10, 10))).toBe('image/png');
    expect(sniffType(jpeg(10, 10))).toBe('image/jpeg');
    expect(sniffType(webpLossy(10, 10))).toBe('image/webp');
    expect(sniffType(pdf)).toBe('application/pdf');
    expect(sniffType(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeUndefined();
  });

  it('reads image sizes', () => {
    expect(imageSize(png(1200, 800), 'image/png')).toEqual({ width: 1200, height: 800 });
    expect(imageSize(jpeg(640, 480), 'image/jpeg')).toEqual({ width: 640, height: 480 });
    expect(imageSize(webpLossy(2400, 1800), 'image/webp')).toEqual({ width: 2400, height: 1800 });
  });

  it('accepts a normal project image', () => {
    expect(checkUpload(png(1600, 1200), 'projects')).toEqual({ ok: true, type: 'image/png', size: { width: 1600, height: 1200 } });
  });

  it('refuses images that are too big or too small', () => {
    expect(checkUpload(png(5000, 1000), 'projects').ok).toBe(false);
    expect(checkUpload(png(800, 20), 'projects').ok).toBe(false);
  });

  it('keeps each folder to its own file types', () => {
    expect(checkUpload(pdf, 'projects').ok).toBe(false);
    expect(checkUpload(png(800, 600), 'cv').ok).toBe(false);
    expect(checkUpload(pdf, 'cv')).toEqual({ ok: true, type: 'application/pdf' });
  });

  it('refuses empty and oversized files', () => {
    expect(checkUpload(new Uint8Array(), 'projects').ok).toBe(false);
    const huge = new Uint8Array(MAX_UPLOAD_BYTES + 1);
    huge.set(png(800, 600));
    expect(checkUpload(huge, 'projects').ok).toBe(false);
  });

  it('only accepts media keys the server would make', () => {
    expect(MEDIA_KEY.test('projects/macyap/0b6f4b5e-1c2d-4e5f-8a9b-0c1d2e3f4a5b.webp')).toBe(true);
    expect(MEDIA_KEY.test('projects/../secrets/0b6f4b5e.webp')).toBe(false);
    expect(MEDIA_KEY.test('other/x/0b6f4b5e1c2d.webp')).toBe(false);
    expect(MEDIA_KEY.test('projects/macyap/0b6f4b5e1c2d.svg')).toBe(false);
  });
});
