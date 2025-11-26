import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import Database from "better-sqlite3";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as schemaSqlite from "@shared/schema";
import * as schemaPg from "@shared/schema-pg";
import path from "path";

export const isProduction = process.env.NODE_ENV === 'production';
export const isDevelopment = !isProduction;

console.log(`🔧 Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
console.log(`🗄️  Database: ${isProduction ? 'PostgreSQL (Neon)' : 'SQLite (local)'}`);

let dbInstance: ReturnType<typeof drizzleSqlite> | ReturnType<typeof drizzleNeon>;
let sqliteInstance: Database.Database | null = null;
let currentSchema: typeof schemaSqlite | typeof schemaPg;

if (isProduction && process.env.DATABASE_URL) {
  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  currentSchema = schemaPg;
  dbInstance = drizzleNeon(pool, { schema: schemaPg });
  console.log("✅ Connected to PostgreSQL (Neon)");
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
