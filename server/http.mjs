import { SchemaError } from '../concept/rack/schema.js';

export class HttpError extends Error {
  constructor(status, message, code = 'request_failed') { super(message); this.status = status; this.code = code; }
}
export function siteOrigin() {
  const configured = process.env.SITE_URL;
  if (!configured) throw new HttpError(503, 'Set SITE_URL before using administration.', 'not_configured');
  let value;
  try { value = new URL(configured); } catch { throw new HttpError(503, 'SITE_URL must be a valid origin.', 'not_configured'); }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(value.hostname);
  if (value.username || value.password || value.pathname !== '/' || value.search || value.hash || (value.protocol !== 'https:' && !(value.protocol === 'http:' && local && !process.env.VERCEL && process.env.NODE_ENV !== 'production'))) throw new HttpError(503, 'SITE_URL must be an HTTPS origin. Local development also accepts HTTP on localhost.', 'not_configured');
  return value.origin;
}
export function assertWriteOrigin(request) {
  if (request.headers.get('origin') !== siteOrigin() || request.headers.get('sec-fetch-site') === 'cross-site') throw new HttpError(403, 'This request must come from the configured site.', 'invalid_origin');
}
export function json(data, status = 200, extra = {}) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra } });
}
export function method(request, allowed) {
  if (!allowed.includes(request.method)) throw new HttpError(405, `Use ${allowed.join(' or ')}.`, 'method_not_allowed');
}
export async function readJson(request) {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') throw new HttpError(415, 'Send application/json.');
  let value;
  try { value = await request.json(); } catch { throw new HttpError(400, 'Invalid JSON.'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, 'Send a JSON object.');
  return value;
}
export function handleErrors(handler) {
  return async request => {
    try { return await handler(request); }
    catch (error) {
      if (error instanceof SchemaError) return json({ error: 'Configuration validation failed.', code: 'validation_failed', issues: error.issues }, 422);
      if (error instanceof HttpError) return json({ error: error.message, code: error.code }, error.status);
      console.error('Portfolio API failed:', error instanceof Error ? error.name : 'Unknown error');
      return json({ error: 'The storage service could not complete this request. Check its configuration and try again.', code: 'storage_unavailable' }, 503);
    }
  };
}

// Native Vercel handlers avoid the platform's automatic form/JSON body parsing.
export function webHandler(handler, maxBytes = 1153434) {
  return { fetch: handleErrors(async request => {
    if (request.body) {
      if (Number(request.headers.get('content-length') || 0) > maxBytes) throw new HttpError(413, 'The request is too large.', 'payload_too_large');
      const reader = request.body.getReader(); const chunks = []; let size = 0;
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        size += value.length;
        if (size > maxBytes) { await reader.cancel(); throw new HttpError(413, 'The request is too large.', 'payload_too_large'); }
        chunks.push(Buffer.from(value));
      }
      request = new Request(request.url, { method: request.method, headers: request.headers, body: Buffer.concat(chunks) });
    }
    return handler(request);
  }) };
}

// The local development server adapts Node's HTTP request to the same handlers.
export function nodeHandler(handler, maxBytes = 1153434) {
  const safeHandler = handleErrors(handler);
  return async (req, res) => {
    try {
      const origin = process.env.SITE_URL || 'http://localhost:3000';
      const incoming = new URL(req.url, 'http://localhost');
      const headers = new Headers();
      for (const [name, value] of Object.entries(req.headers)) if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(', ') : value);
      let body;
      if (!['GET', 'HEAD'].includes(req.method)) {
        if (Number(req.headers['content-length'] || 0) > maxBytes) throw new HttpError(413, 'The request is too large.', 'payload_too_large');
        const chunks = []; let length = 0;
        // Some Node adapters parse JSON before invoking the handler.
        if (req.body !== undefined) { body = typeof req.body === 'string' || Buffer.isBuffer(req.body) ? req.body : JSON.stringify(req.body); if (Buffer.byteLength(body) > maxBytes) throw new HttpError(413, 'The request is too large.', 'payload_too_large'); }
        else { for await (const chunk of req) { const bytes = Buffer.from(chunk); length += bytes.length; if (length > maxBytes) throw new HttpError(413, 'The request is too large.', 'payload_too_large'); chunks.push(bytes); } body = Buffer.concat(chunks); }
      }
      const request = new Request(new URL(incoming.pathname + incoming.search, origin), { method: req.method, headers, ...(body ? { body } : {}) });
      const response = await safeHandler(request);
      res.statusCode = response.status;
      for (const [name, value] of response.headers) if (name !== 'set-cookie') res.setHeader(name, value);
      const cookies = response.headers.getSetCookie();
      if (cookies.length) res.setHeader('set-cookie', cookies);
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      res.statusCode = error.status || 500;
      res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify({ error: error.status ? error.message : 'The request could not be processed.', code: error.code || 'request_failed' }));
    }
  };
}
