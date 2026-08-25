import { config } from './config.js';
import { buildApp } from './app.js';
import { initDb } from './lib/db.js';

async function main() {
  await initDb();
  console.log(`Database: ${config.databaseUrl}`);

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
