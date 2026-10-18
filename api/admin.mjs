import { webHandler, method, readJson, json } from '../server/http.mjs';
import { requireOwner, requireCsrf, csrfToken } from '../server/auth.mjs';
import { readAdmin, updatePortfolio } from '../server/store.mjs';

export async function adminRequest(request) {
  method(request, ['GET', 'PUT', 'POST']);
  const owner = await requireOwner(request);
  if (request.method === 'GET') return json({ ...await readAdmin(), csrfToken: csrfToken(owner), capabilities: { uploads: Boolean(process.env.BLOB_READ_WRITE_TOKEN), maxUploadBytes: 3145728 } });
  requireCsrf(request, owner);
  const body = await readJson(request);
  await updatePortfolio({ ...body, action: request.method === 'PUT' ? 'save' : body.action }, owner.ownerId);
  return json({ ...await readAdmin(), csrfToken: csrfToken(owner), capabilities: { uploads: Boolean(process.env.BLOB_READ_WRITE_TOKEN), maxUploadBytes: 3145728 } });
}
export default webHandler(adminRequest);
