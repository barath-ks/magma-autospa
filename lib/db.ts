import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "[db] DATABASE_URL is not set. " +
    "Add it to .env.local for local development, or set it as an Environment Variable in your Vercel project settings."
  );
}

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});
