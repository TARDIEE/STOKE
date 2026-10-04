// Type shim for Node's built-in SQLite module (no @types/node v22+ required).
declare module "node:sqlite" {
  export class DatabaseSync {
    constructor(path: string, options?: { open?: boolean; readOnly?: boolean });
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
  export class StatementSync {
    get(...params: unknown[]): Record<string, unknown> | undefined;
    all(...params: unknown[]): Record<string, unknown>[];
    run(...params: unknown[]): { changes: number | bigint; lastInsertRowid: number | bigint };
  }
}
