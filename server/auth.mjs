import { Auth } from '@auth/core';
import GitHub from '@auth/core/providers/github';
import { getToken } from '@auth/core/jwt';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { HttpError, assertWriteOrigin, siteOrigin } from './http.mjs';

export const OWNER_GITHUB_ID = '143251500';
export function authConfigured() {
  return Boolean(process.env.SITE_URL && process.env.AUTH_SECRET?.length >= 32 && process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET);
}
export function authConfig() {
  const origin = siteOrigin();
  if (!authConfigured()) throw new HttpError(503, 'Set AUTH_SECRET, AUTH_GITHUB_ID and AUTH_GITHUB_SECRET to enable GitHub sign-in.', 'not_configured');
  return {
    basePath: '/api/auth', trustHost: true, secret: process.env.AUTH_SECRET,
    useSecureCookies: origin.startsWith('https:'),
    session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
    providers: [GitHub({
      clientId: process.env.AUTH_GITHUB_ID, clientSecret: process.env.AUTH_GITHUB_SECRET,
      authorization: { params: { scope: 'read:user' } }, checks: ['state', 'pkce'],
      // The owner check needs only the immutable ID, never private email access.
      userinfo: { url: 'https://api.github.com/user', async request({ tokens }) {
        const response = await fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${tokens.access_token}`, 'User-Agent': 'christian-portfolio-admin', Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error('GitHub profile lookup failed');
        return response.json();
      } },
    })],
    callbacks: {
      signIn({ account, profile }) { return account?.provider === 'github' && String(profile?.id) === OWNER_GITHUB_ID; },
      jwt({ token, account, profile }) {
        if (account) { token.ownerId = String(profile?.id); token.csrfNonce = randomUUID(); }
        // Ignore client session updates and never store OAuth access tokens.
        return token;
      },
      session({ session, token }) { session.user = { name: token.name, id: token.ownerId }; return session; },
      redirect({ url }) { try { const target = new URL(url, origin); if (target.origin === origin) return target.href; } catch { /* Fall back to the admin page. */ } return `${origin}/admin.html`; },
    },
  };
}
export async function authRequest(request) {
  if (!['GET', 'POST'].includes(request.method)) throw new HttpError(405, 'Use GET or POST.');
  if (request.method === 'POST') assertWriteOrigin(request);
  const config = authConfig();
  const url = new URL(request.url);
  const route = url.searchParams.get('authPath');
  if (route !== null) {
    if (!/^[a-z0-9/-]+$/.test(route)) throw new HttpError(400, 'Invalid authentication route.');
    url.pathname = `/api/auth/${route}`; url.searchParams.delete('authPath');
    request = new Request(url, request);
  }
  request = new Request(new URL(url.pathname + url.search, siteOrigin()), request);
  // Never derive callback origins from forwarded host headers.
  const headers = new Headers(request.headers); headers.delete('x-forwarded-host'); headers.delete('x-forwarded-proto'); headers.set('host', new URL(siteOrigin()).host);
  return Auth(new Request(request, { headers }), config);
}
export async function requireOwner(request) {
  authConfig();
  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET, secureCookie: siteOrigin().startsWith('https:') });
  if (!token || token.ownerId !== OWNER_GITHUB_ID || !token.csrfNonce) throw new HttpError(401, 'Sign in with the owner GitHub account.', 'unauthorized');
  return token;
}
export function csrfToken(token) { return createHmac('sha256', process.env.AUTH_SECRET).update(`portfolio-write:${token.csrfNonce}`).digest('hex'); }
export function requireCsrf(request, token) {
  assertWriteOrigin(request);
  const submitted = request.headers.get('x-csrf-token') || '';
  const expected = csrfToken(token);
  if (!/^[a-f0-9]{64}$/.test(submitted) || !timingSafeEqual(Buffer.from(submitted), Buffer.from(expected))) throw new HttpError(403, 'Refresh the admin page before saving.', 'invalid_csrf');
}
