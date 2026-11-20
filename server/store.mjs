import { neon } from '@neondatabase/serverless';
import { HttpError } from './http.mjs';
import { publicPortfolio, validatePortfolio } from '../concept/rack/schema.js';
import { seedPortfolio } from './seed.mjs';

export function database() {
  if (!process.env.DATABASE_URL) throw new HttpError(503, 'Set DATABASE_URL and run npm run db:setup to enable saved administration.', 'not_configured');
  return neon(process.env.DATABASE_URL);
}
export async function initializeStore() {
  const sql = database(); const draft = seedPortfolio(); const published = publicPortfolio(draft);
  await sql`WITH initial AS (
    INSERT INTO portfolio_state (id, revision, draft, published, published_revision)
    VALUES (1, 1, ${JSON.stringify(draft)}::jsonb, ${JSON.stringify(published)}::jsonb, 1)
    ON CONFLICT (id) DO NOTHING RETURNING revision, draft
  ) INSERT INTO portfolio_revisions (revision, config, action, actor)
    SELECT revision, draft, 'initialize', 'setup' FROM initial ON CONFLICT DO NOTHING`;
}
export async function readAdmin() {
  const sql = database();
  const [rows, history] = await Promise.all([
    sql`SELECT revision, draft, published_revision FROM portfolio_state WHERE id = 1`,
    sql`SELECT revision, action, message, actor, created_at FROM portfolio_revisions ORDER BY revision DESC LIMIT 100`,
  ]);
  if (!rows[0]) throw new HttpError(503, 'Run npm run db:setup to initialize the portfolio database.', 'not_initialized');
  return { config: validatePortfolio(rows[0].draft), revision: rows[0].revision, publishedRevision: rows[0].published_revision, history: history.map(row => ({ revision: row.revision, action: row.action, message: row.message, actor: row.actor, createdAt: row.created_at })) };
}
export async function readPublished() {
  const rows = await database()`SELECT published, published_revision FROM portfolio_state WHERE id = 1`;
  if (!rows[0]?.published) throw new HttpError(503, 'No saved portfolio has been published yet.', 'not_initialized');
  return { config: publicPortfolio(rows[0].published), revision: rows[0].published_revision };
}
export async function updatePortfolio({ expectedRevision, config, action, revision, message = '' }, actor) {
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) throw new HttpError(400, 'expectedRevision must be a positive integer.');
  if (!['save', 'publish', 'restore'].includes(action)) throw new HttpError(400, 'Unknown administration action.');
  if (typeof message !== 'string' || message.length > 500) throw new HttpError(400, 'Revision messages must be at most 500 characters.');
  const sql = database(); let draft;
  if (action === 'save') draft = validatePortfolio(config);
  else if (action === 'restore') {
    if (!Number.isSafeInteger(revision) || revision < 1) throw new HttpError(400, 'Choose a valid revision to restore.');
    const rows = await sql`SELECT config FROM portfolio_revisions WHERE revision = ${revision}`;
    if (!rows[0]) throw new HttpError(404, 'That revision is no longer available.', 'revision_not_found');
    draft = validatePortfolio(rows[0].config);
  } else {
    const rows = await sql`SELECT draft FROM portfolio_state WHERE id = 1 AND revision = ${expectedRevision}`;
    if (!rows[0]) throw new HttpError(409, 'The portfolio changed in another tab. Reload before saving.', 'revision_conflict');
    draft = validatePortfolio(rows[0].draft);
  }
  const serialized = JSON.stringify(draft);
  if (Buffer.byteLength(serialized) > 1024 * 1024) throw new HttpError(413, 'The configuration must be smaller than 1 MiB.');
  const published = action === 'publish' ? JSON.stringify(publicPortfolio(draft)) : null;
  // The compare, update and history insert run atomically in one SQL statement.
  const rows = await sql`WITH changed AS (
    UPDATE portfolio_state SET draft = ${serialized}::jsonb, revision = revision + 1,
      published = CASE WHEN ${action} = 'publish' THEN ${published}::jsonb ELSE published END,
      published_revision = CASE WHEN ${action} = 'publish' THEN revision + 1 ELSE published_revision END,
      updated_at = now()
    WHERE id = 1 AND revision = ${expectedRevision}
    RETURNING revision, draft, published_revision
  ), recorded AS (
    INSERT INTO portfolio_revisions (revision, config, action, message, actor)
    SELECT revision, draft, ${action}, ${message}, ${actor} FROM changed RETURNING revision
  ), pruned AS (
    DELETE FROM portfolio_revisions WHERE revision < (SELECT revision FROM changed) - 99
  ) SELECT changed.revision, changed.published_revision FROM changed JOIN recorded USING (revision)`;
  if (!rows[0]) throw new HttpError(409, 'The portfolio changed in another tab. Reload before saving.', 'revision_conflict');
  return { revision: rows[0].revision, publishedRevision: rows[0].published_revision };
}
