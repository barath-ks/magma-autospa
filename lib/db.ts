import { createClient } from "@libsql/client";

export const db = createClient({
  url: process.env.LIBSQL_URL || "file:local.db",
  authToken: process.env.LIBSQL_AUTH_TOKEN,
});
