import { query, initDb } from './db.js';
import { hashPassword } from './auth.js';
import { v4 as uuid } from 'uuid';

async function setupAdmin() {
  await initDb();
  const username = process.argv[2] || 'admin';
  const password = process.argv[3] || 'password123';

  const existing = await query('SELECT id FROM users WHERE username = $1', [username]);
  if (existing.rows.length > 0) {
    console.log(`User '${username}' already exists.`);
    process.exit(0);
  }

  const hash = await hashPassword(password);
  await query(
    `INSERT INTO users (id, username, password_hash, role) VALUES ($1, $2, $3, 'super_admin')`,
    [uuid(), username, hash]
  );
  console.log(`Admin user '${username}' created.`);
  process.exit(0);
}

setupAdmin().catch((err) => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
