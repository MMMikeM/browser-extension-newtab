import { connect } from "@tursodatabase/serverless";
import { drizzle } from "drizzle-orm/tursodatabase-serverless";
import { relations } from "./schema";
import { withReadRetry } from "./retry";

const config = {
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
  defaultQueryTimeout: 30_000,
};

export const db = drizzle({ client: withReadRetry(connect(config)), relations });

type Db = typeof db;
export type Transaction = Parameters<Parameters<Db["transaction"]>[0]>[0];

// A connection is one Turso session, so a transaction on the shared one would sweep in
// statements from concurrent requests. Each gets its own, without the read retry: a retried
// read would land on a fresh session, outside the transaction.
export const inTransaction = async <T>(run: (tx: Transaction) => Promise<T>) => {
  const connection = drizzle({ client: connect(config), relations });
  try {
    return await connection.transaction(run);
  } finally {
    await connection.$client.close();
  }
};
