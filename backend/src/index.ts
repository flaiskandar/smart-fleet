import { config } from './config.js';
import { buildApp } from './app.js';
import { initDb, query, getDbType, convertSqlForPostgres } from './lib/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, '../database/migrations');
const SEEDS_DIR = path.resolve(__dirname, '../database/seeds');

async function runMigrations() {
  const dbType = getDbType();
  console.log(`Auto-migrating for ${dbType}...`);
  const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sqlite.sql')).sort();
  for (const file of files) {
    let sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    if (dbType === 'postgres') sql = convertSqlForPostgres(sql);
    try {
      if (dbType === 'postgres') {
        const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
        for (const stmt of statements) await query(stmt);
      } else {
        await query(sql);
      }
      console.log(`  ✓ migration ${file}`);
    } catch (err: any) {
      if (err.message?.includes('already exists')) {
        console.log(`  ⊘ migration ${file} (already applied)`);
      } else {
        console.error(`  ✗ migration ${file}:`, err.message);
      }
    }
  }
}

async function runSeeds() {
  const dbType = getDbType();
  const existing = await query('SELECT COUNT(*) as cnt FROM users');
  if (existing.rows[0]?.cnt > 0) {
    console.log('Seed skipped: users table has data');
    return;
  }
  console.log('Running seed (users table empty)...');
  const files = fs.readdirSync(SEEDS_DIR).filter(f => f.endsWith('.sqlite.sql')).sort();
  for (const file of files) {
    let sql = fs.readFileSync(path.join(SEEDS_DIR, file), 'utf8');
    if (dbType === 'postgres') sql = convertSqlForPostgres(sql);
    try {
      if (dbType === 'postgres') {
        const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
        for (const stmt of statements) await query(stmt);
      } else {
        await query(sql);
      }
      console.log(`  ✓ seed ${file}`);
    } catch (err: any) {
      console.error(`  ✗ seed ${file}:`, err.message);
    }
  }
}

async function main() {
  await initDb();

  try {
    await runMigrations();
    await runSeeds();
  } catch (err: any) {
    console.error('Migration/seed error:', err.message);
  }

  console.log(`Database: ${config.databaseUrl.replace(/:[^@]+@/, ':***@')}`);

  const app = await buildApp();

  try {
    await app.listen({ port: config.port, host: config.host });
    console.log(`Fleet API running at http://${config.host}:${config.port}`);
    console.log(`Swagger docs at http://localhost:${config.port}/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
