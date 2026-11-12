import { webHandler, method, json } from '../server/http.mjs';
import { readPublished } from '../server/store.mjs';

export async function portfolioRequest(request) {
  method(request, ['GET']);
  if (!process.env.DATABASE_URL) return json({ error: 'Saved portfolio storage is not configured.', code: 'not_configured', configured: false }, 503);
  return json(await readPublished(), 200, { 'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=60' });
}
export default webHandler(portfolioRequest);
