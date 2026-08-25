import fs from 'fs';
import path from 'path';

// Check the database/seeds directory
const seedsDir = 'C:\\Users\\LENOVO\\Downloads\\express_power\\backend\\database\\seeds';
console.log('Seeds dir exists:', fs.existsSync(seedsDir));
if (fs.existsSync(seedsDir)) {
  console.log('Seed files:', fs.readdirSync(seedsDir));
}

// Check for any SQL files in the project
const sqlFiles = [];
function findSQL(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!entry.name.includes('node_modules') && !entry.name.includes('.git')) {
        findSQL(path.join(dir, entry.name));
      }
    } else if (entry.name.endsWith('.sql') || entry.name.endsWith('.sqlite.sql')) {
      sqlFiles.push(path.join(dir, entry.name));
    }
  }
}
findSQL('C:\\Users\\LENOVO\\Downloads\\express_power\\backend');
console.log('\nSQL files found:', sqlFiles.slice(0, 10));

// Check dist/lib for compiled seed
const distSeed = 'C:\\Users\\LENOVO\\Downloads\\express_power\\backend\\dist\\lib\\seed.js';
console.log('\nCompiled seed exists:', fs.existsSync(distSeed));