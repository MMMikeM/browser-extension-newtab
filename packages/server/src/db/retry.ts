/**
 * Fly suspends this machine when idle (fly.toml: auto_stop_machines = 'suspend'). On resume the
 * process still holds keep-alive sockets and a Turso session the far side has dropped, so the
 * first query fails in transit and an identical retry, on a fresh session, succeeds. 401 is not
 * a transport failure: a rejected token fails the same way twice.
 *
 * Keyed on the SQL rather than the method:
 * drizzle runs INSERT/UPDATE/DELETE ... RETURNING through the same all()/get() as reads, and a
 * write that failed in transit may still have been applied, so only SELECTs are replayed.
 */

const TRANSPORT_FAILURE =
  /fetch failed|other side closed|socket hang up|premature close|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE|ENOTFOUND|EAI_AGAIN|UND_ERR|HTTP error! status: (?:400|5\d\d)/i;

/** Drizzle wraps driver errors, and undici nests its own, so the reason can be several causes deep. */
export const isTransportFailure = (error: unknown): boolean => {
  for (let current = error, depth = 0; current instanceof Error && depth < 5; depth++) {
    if (TRANSPORT_FAILURE.test(current.message)) return true;
    current = current.cause;
  }
  return false;
};

const isRead = (sql: unknown) => typeof sql === "string" && /^\s*select\b/i.test(sql);

const retryOnce = async <T>(call: () => Promise<T>): Promise<T> => {
  try {
    return await call();
  } catch (error) {
    if (!isTransportFailure(error)) throw error;
    console.warn("[db] transport failure, retrying once:", (error as Error).message);
    return await call();
  }
};

type Method = (...args: unknown[]) => unknown;

/** A prepared SELECT: raw() hands the statement back for the executing call, so it stays guarded. */
const guardRead = <T extends object>(statement: T): T =>
  new Proxy(statement, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (typeof value !== "function") return value;
      const method = value as Method;
      if (property === "raw") return (...args: unknown[]) => guardRead(method.apply(target, args) as object);
      if (property === "all" || property === "get" || property === "values")
        return (...args: unknown[]) => retryOnce(async () => method.apply(target, args));
      return method.bind(target);
    },
  });

export const withReadRetry = <T extends object>(client: T): T =>
  new Proxy(client, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (typeof value !== "function") return value;
      const method = value as Method;

      if (property === "prepare")
        return async (sql: unknown, ...rest: unknown[]) => {
          if (!isRead(sql)) return method.call(target, sql, ...rest);
          // prepare is itself a round trip (a describe), so it can hit the dead socket too
          return guardRead((await retryOnce(async () => method.call(target, sql, ...rest))) as object);
        };
      if (property === "all" || property === "get")
        return (sql: unknown, ...params: unknown[]) =>
          isRead(sql)
            ? retryOnce(async () => method.call(target, sql, ...params))
            : method.call(target, sql, ...params);
      return method.bind(target);
    },
  });
