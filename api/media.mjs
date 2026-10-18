import { randomUUID } from 'node:crypto';
import { put } from '@vercel/blob';
import { webHandler, HttpError, method, json } from '../server/http.mjs';
import { requireOwner, requireCsrf } from '../server/auth.mjs';

const MAX_BYTES = 3145728;
export function imageExtension(bytes, type) {
  if (type === 'image/png' && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'png';
  if (type === 'image/jpeg' && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'jpg';
  if (type === 'image/gif' && ['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString())) return 'gif';
  if (type === 'image/webp' && bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP') return 'webp';
  throw new HttpError(415, 'Choose a PNG, JPEG, WebP or GIF image matching its file type.', 'invalid_image');
}
export async function mediaRequest(request) {
  method(request, ['POST']);
  const owner = await requireOwner(request); requireCsrf(request, owner);
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new HttpError(503, 'Image upload is not configured. Use an existing HTTPS image URL, or configure a public Blob store.', 'uploads_not_configured');
  const bytes = Buffer.from(await request.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_BYTES) throw new HttpError(413, 'Images must be between 1 byte and 3 MiB.');
  const contentType = request.headers.get('content-type')?.split(';')[0].trim();
  const extension = imageExtension(bytes, contentType);
  const blob = await put(`portfolio/${randomUUID()}.${extension}`, bytes, { access: 'public', contentType, addRandomSuffix: true, allowOverwrite: false });
  return json({ url: blob.url, contentType, size: bytes.length }, 201);
}
export default webHandler(mediaRequest, MAX_BYTES);
