import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, initDb, getDbType, convertSqlForPostgres } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, '../../database/migrations');

async function migrate() {
  await initDb();
  const dbType = getDbType();
  console.log(`Running migrations for ${dbType}...`);

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sqlite.sql'))
    .sort();

  let found = false;
  for (const file of files) {
    let sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    if (dbType === 'postgres') sql = convertSqlForPostgres(sql);
    console.log(`  Executing: ${file}`);
    try {
      if (dbType === 'postgres') {
        const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
        for (const stmt of statements) {
          await query(stmt);
        }
        console.log(`  ✓ ${file} applied (${statements.length} statements)`);
      } else {
        await query(sql);
        console.log(`  ✓ ${file} applied`);
      }
      found = true;
    } catch (err: any) {
      console.error(`  ✗ ${file} failed:`, err.message);
      throw err;
    }
  }

  if (!found) {
    console.log(`  No migration files found for ${dbType}`);
  }

  console.log('Migrations complete.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
