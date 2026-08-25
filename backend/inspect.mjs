import sql from "sql.js";
import fs from "fs";
const buf = fs.readFileSync("C:\\Users\\LENOVO\\Downloads\\express_power\\backend\\data\\fleet.db");
const db = new sql.Database(buf);
const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
console.log("Tables:", JSON.stringify(tables, null, 2));
for (const t of tables) {
  const name = t.name;
  const cnt = db.exec("SELECT COUNT(*) as c FROM " + name);
  console.log(`${name}: ${cnt[0].values[0][0]} rows`);
}