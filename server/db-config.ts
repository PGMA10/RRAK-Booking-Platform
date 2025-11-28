import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import Database from "better-sqlite3";
import { Pool } from "pg";
import * as schemaSqlite from "@shared/schema";
import * as schemaPg from "@shared/schema-pg";
import path from "path";

export const isProduction = process.env.NODE_ENV === 'production';
export const isDevelopment = !isProduction;

console.log(`🔧 Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
console.log(`🗄️  Database: ${isProduction ? 'PostgreSQL' : 'SQLite (local)'}`);

let dbInstance: ReturnType<typeof drizzleSqlite> | ReturnType<typeof drizzlePg>;
let sqliteInstance: Database.Database | null = null;
let currentSchema: typeof schemaSqlite | typeof schemaPg;

if (isProduction && process.env.DATABASE_URL) {
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: 10,
    ssl: { rejectUnauthorized: false }
  });
  currentSchema = schemaPg;
  dbInstance = drizzlePg(pool, { schema: schemaPg });
  console.log("✅ Connected to PostgreSQL");
} else {
  const dbPath = path.join(process.cwd(), "data.db");
  sqliteInstance = new Database(dbPath);
  sqliteInstance.exec("PRAGMA foreign_keys = ON;");
  currentSchema = schemaSqlite;
  dbInstance = drizzleSqlite(sqliteInstance, { 
    schema: schemaSqlite,
    casing: 'snake_case',
  });
  console.log("✅ Connected to SQLite (local)");
}

export const db = dbInstance;
export const sqlite = sqliteInstance;
export const schema = currentSchema;
export type DbType = typeof db;
