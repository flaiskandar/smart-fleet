declare module 'sql.js' {
  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database;
  }
  interface QueryExecResult {
    columns: string[];
    values: any[][];
  }
  interface Database {
    run(sql: string, params?: any[]): Database;
    exec(sql: string): QueryExecResult[];
    prepare(sql: string): Statement;
    export(): Uint8Array;
    close(): void;
  }
  interface Statement {
    reader: boolean;
    bind(params?: any[]): boolean;
    step(): boolean;
    getAsObject(): Record<string, any>;
    run(params?: any[]): void;
    free(): boolean;
  }
  export default function initSqlJs(config?: any): Promise<SqlJsStatic>;
}
