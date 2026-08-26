import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, initDb, getDbType, convertSqlForPostgres } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEEDS_DIR = path.resolve(__dirname, '../../database/seeds');

async function seed() {
  await initDb();
  const dbType = getDbType();
  console.log(`Seeding database (${dbType})...`);

  const ext = dbType === 'sqlite' ? '.sqlite.sql' : '.sql';
  const files = fs.readdirSync(SEEDS_DIR)
    .filter(f => f.endsWith('.sqlite.sql') || f.endsWith(ext))
    .sort();

  let found = false;
  for (const file of files) {
    let sql = fs.readFileSync(path.join(SEEDS_DIR, file), 'utf8');
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
    console.log(`  No seed files found for ${dbType}`);
  }

  if (dbType === 'sqlite') {
    console.log('  Seeding vehicle telemetry...');
    const telemetry = [
      ['vt000001-0000-0000-0000-000000000001', 'v0000001-0000-0000-0000-000000000001', 3.0700, 101.4400, 65, 72, 1],
      ['vt000001-0000-0000-0000-000000000002', 'v0000001-0000-0000-0000-000000000002', 3.1200, 101.5800, 0, 88, 1],
      ['vt000001-0000-0000-0000-000000000003', 'v0000001-0000-0000-0000-000000000003', 4.5900, 103.4100, 45, 60, 1],
      ['vt000001-0000-0000-0000-000000000004', 'v0000001-0000-0000-0000-000000000004', 2.9900, 101.3800, 80, 55, 1],
      ['vt000001-0000-0000-0000-000000000005', 'v0000001-0000-0000-0000-000000000005', 3.0500, 101.4500, 0, 50, 0],
      ['vt000001-0000-0000-0000-000000000006', 'v0000001-0000-0000-0000-000000000006', 3.0400, 101.4200, 0, 40, 0],
      ['vt000001-0000-0000-0000-000000000007', 'v0000001-0000-0000-0000-000000000007', 5.9600, 116.0600, 55, 40, 1],
      ['vt000001-0000-0000-0000-000000000008', 'v0000001-0000-0000-0000-000000000008', 3.0800, 101.5100, 35, 65, 1],
    ];
    for (const [id, vehicleId, lat, lon, speed, fuel, ignition] of telemetry) {
      await query(
        `INSERT OR IGNORE INTO vehicle_telemetry (id, vehicle_id, gps_lat, gps_lon, speed_kmh, fuel_level_pct, ignition_on, recorded_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7, datetime('now'))`,
        [id, vehicleId, lat, lon, speed, fuel, ignition]
      );
    }
    console.log('  ✓ vehicle_telemetry seeded');
  }

  console.log('Seed complete.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
