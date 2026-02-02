import postgres from "postgres";

type SqlClient = ReturnType<typeof postgres>;

let client: SqlClient | null = null;

const getConnectionString = () =>
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  null;

const getClient = (): SqlClient => {
  if (client) return client;
  const connectionString = getConnectionString();
  if (!connectionString) {
    throw new Error("POSTGRES_URL missing");
  }
  client = postgres(connectionString, { max: 1 });
  return client;
};

const joinHelper = (values: Array<unknown>, separator?: unknown) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sqlClient = getClient() as any;
  if (!values.length) return sqlClient``;
  const sep = separator ?? sqlClient`, `;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return values.reduce((acc: any, value: unknown, index: number) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fragment = value as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (index === 0) return fragment as any;
    return sqlClient`${acc}${sep}${fragment}`;
  }, sqlClient``);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sql: any = new Proxy(() => null, {
  apply(_target, _thisArg, args) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getClient() as any)(...(args as any[]));
  },
  get(_target, prop) {
    if (prop === "join") return joinHelper;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clientValue = (getClient() as any)[prop];
    if (typeof clientValue === "function") {
      return (clientValue as (...args: unknown[]) => unknown).bind(getClient());
    }
    return clientValue;
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}) as any;

export async function query<T = unknown>(
  strings: TemplateStringsArray,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...values: any[]
): Promise<T[]> {
  try {
    return (await sql(strings, ...values)) as T[];
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    throw new Error(message);
  }
}

export async function exec(sqlText: string): Promise<void> {
  try {
    await getClient().unsafe(sqlText);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    throw new Error(message);
  }
}
