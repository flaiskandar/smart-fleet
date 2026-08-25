import { config } from '../config.js';

let dbType: 'sqlite' | 'postgres' = 'sqlite';
let sqliteDb: any = null;
let pgPool: any = null;

export async function initDb() {
  if (config.databaseUrl.startsWith('postgres')) {
    dbType = 'postgres';
    const pg = (await import('pg')).default;
    pgPool = new pg.Pool({ connectionString: config.databaseUrl });
    pgPool.on('error', (err: Error) => console.error('Database pool error:', err));
  } else {
    dbType = 'sqlite';
    const initSqlJs = (await import('sql.js')).default;
    const SQL = await initSqlJs();
    const fs = await import('fs');
    const path = await import('path');
    const dbPath = path.resolve(config.databaseUrl.replace('sqlite://', ''));
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      sqliteDb = new SQL.Database(buffer);
    } else {
      sqliteDb = new SQL.Database();
    }
    sqliteDb._dbPath = dbPath;
    sqliteDb._save = () => {
      const data = sqliteDb.export();
      fs.writeFileSync(dbPath, Buffer.from(data));
    };
    const ensureSqliteColumns = (table: string, cols: Record<string, string>) => {
      try {
        const exists = sqliteDb.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`);
        if (!exists.length) return;
        const res = sqliteDb.exec(`PRAGMA table_info(${table})`);
        const existing = new Set<string>(res.length ? res[0].values.map((v: any[]) => String(v[1])) : []);
        let changed = false;
        for (const [col, ddl] of Object.entries(cols)) {
          if (!existing.has(col)) {
            sqliteDb.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${ddl}`);
            changed = true;
          }
        }
        if (changed) sqliteDb._save();
      } catch (err) {
        console.error(`ensureSqliteColumns(${table}) failed:`, err);
      }
    };
    ensureSqliteColumns('quotes', { status_changed_by: 'TEXT', status_changed_at: 'TEXT' });
  }
}

function adaptSql(sql: string, params?: any[]): string {
  if (dbType === 'sqlite') {
    let result = sql;
    if (params && params.length > 0) {
      let idx = 0;
      result = result.replace(/\$(\d+)/g, () => `?`);
    }
    return result
      .replace(/\bILIKE\b/gi, 'LIKE')
      .replace(/\bNOW\(\)/gi, "datetime('now')")
      .replace(/\bTRUE\b/gi, '1')
      .replace(/\bFALSE\b/gi, '0');
  }
  return sql;
}

function parseReturning(sql: string): { baseSql: string; returningCols: string[] } | null {
  const idx = sql.toUpperCase().lastIndexOf('RETURNING');
  if (idx === -1) return null;
  const baseSql = sql.substring(0, idx);
  const returningPart = sql.substring(idx + 9).trim();
  const cols = returningPart.split(',').map(c => c.trim().replace(/\s+AS\s+.*/i, '')).filter(Boolean);
  return { baseSql, returningCols: cols.length > 0 ? cols : ['*'] };
}

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  let rows: any[] = [];
  let rowCount = 0;

  if (dbType === 'postgres') {
    const result = await pgPool.query(text, params);
    rows = result.rows;
    rowCount = result.rowCount || 0;
  } else {
    const sql = adaptSql(text, params);
    sqliteDb.exec('BEGIN');
    try {
      const returning = parseReturning(sql);
      if (returning) {
        const execSql = returning.baseSql.includes('?') ? prepareWithParams(returning.baseSql, params) : returning.baseSql;
        sqliteDb.exec(execSql);
        const tableMatch = returning.baseSql.match(/(?:FROM|INTO|UPDATE)\s+(\w+)/i);
        const tableName = tableMatch?.[1];
        if (tableName && params && params.length > 0) {
          const isInsert = returning.baseSql.toUpperCase().startsWith('INSERT');
          const idVal = String(isInsert ? params[0] : params[params.length - 1]).replace(/'/g, "''");
          const cols = returning.returningCols.join(', ');
          rows = execSelect(`SELECT ${cols} FROM ${tableName} WHERE id = '${idVal}'`);
        }
      } else {
        rows = execMulti(sql, params);
      }
      sqliteDb.exec('COMMIT');
      sqliteDb._save();
      rowCount = rows.length;
    } catch (err) {
      sqliteDb.exec('ROLLBACK');
      throw err;
    }
  }

  const duration = Date.now() - start;
  if (duration > 1000) {
    console.warn(`Slow query (${duration}ms):`, text.substring(0, 100));
  }

  return { rows, rowCount };
}

function execMulti(sql: string, params?: any[]): any[] {
  if (params && params.length > 0) {
    const stmt = sqliteDb.prepare(sql);
    const rows: any[] = [];
    stmt.bind(params);
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  } else {
    const results = sqliteDb.exec(sql);
    if (results && results.length > 0) {
      return results[0].values.map((row: any[]) => {
        const obj: Record<string, any> = {};
        results[0].columns.forEach((col: string, i: number) => { obj[col] = row[i]; });
        return obj;
      });
    }
    return [];
  }
}

function execSelect(sql: string): any[] {
  const stmt = sqliteDb.prepare(sql);
  const rows: any[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function prepareWithParams(sql: string, params?: any[]): string {
  if (!params || params.length === 0) return sql;
  let result = sql;
  for (const p of params) {
    const val = typeof p === 'string' ? `'${p.replace(/'/g, "''")}'` : String(p ?? 'NULL');
    result = result.replace('?', val);
  }
  return result;
}

export async function getClient() {
  if (dbType === 'postgres') return pgPool.connect();
  throw new Error('getClient() only available for PostgreSQL');
}

export function getDbType() {
  return dbType;
}
