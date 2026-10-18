import { readFile } from 'node:fs/promises';
import { database, initializeStore } from '../server/store.mjs';

const migration = await readFile(new URL('../db/001-portfolio.sql', import.meta.url), 'utf8');
const sql = database();
for (const statement of migration.split(';').map(value => value.trim()).filter(Boolean)) await sql.query(statement);
await initializeStore();
console.log('Portfolio tables are ready. Existing content was preserved.');
