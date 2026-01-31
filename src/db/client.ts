import { sql, type QueryResultRow } from "@vercel/postgres";

export { sql };

type SqlParam = Parameters<typeof sql>[1];

export async function query<T extends QueryResultRow = QueryResultRow>(
  strings: TemplateStringsArray,
  ...values: SqlParam[]
): Promise<T[]> {
  try {
    const result = await sql(strings, ...values);
    return result.rows as T[];
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    throw new Error(message);
  }
}

export async function withDb<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    throw new Error(message);
  }
}
