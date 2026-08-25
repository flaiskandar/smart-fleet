import fs from 'fs';
import path from 'path';

// Read key route files to understand schema
const routesDir = 'C:\\Users\\LENOVO\\Downloads\\express_power\\backend\\src\\routes';
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.ts'));

for (const file of files) {
  const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
  const creates = content.match(/CREATE TABLE[^;]+;/gi);
  const inserts = content.match(/INSERT INTO[^;]+;/gi);
  const schema_checks = content.match(/SELECT\s+.*FROM\s+/gi);

  if (creates) {
    console.log(`=== ${file} - CREATE TABLE ===`);
    creates.forEach(c => console.log(c.substring(0, 300)));
  }
  if (inserts) {
    console.log(`=== ${file} - INSERT ===`);
    inserts.forEach(i => console.log(i.substring(0, 200)));
  }
}