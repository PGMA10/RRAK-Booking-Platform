import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "@shared/schema";
import path from "path";

// Create SQLite database file in project root
const dbPath = path.join(process.cwd(), "data.db");
const sqlite = new Database(dbPath);

// Enable foreign keys
sqlite.exec("PRAGMA foreign_keys = ON;");

export const db = drizzle(sqlite, { 
  schema,
  // Configure to handle PostgreSQL schema with SQLite
  casing: 'snake_case',
});

// Initialize database tables
export function initializeDatabase() {
  console.log("🗄️  Initializing SQLite database...");
  
  // Create users table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      business_name TEXT,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'customer',
      created_at INTEGER DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
    )
  `);

  // Create routes table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS routes (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      zip_code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      household_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active'
    )
  `);

  // Create industries table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS industries (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      icon TEXT NOT NULL
    )
  `);

  // Create campaigns table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      mail_date INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'planning',
      total_slots INTEGER NOT NULL DEFAULT 64,
      booked_slots INTEGER NOT NULL DEFAULT 0,
      revenue INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
    )
  `);

  // Create bookings table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL REFERENCES users(id),
      campaign_id TEXT NOT NULL REFERENCES campaigns(id),
      route_id TEXT NOT NULL REFERENCES routes(id),
      industry_id TEXT NOT NULL REFERENCES industries(id),
      business_name TEXT NOT NULL,
      license_number TEXT,
      contact_email TEXT NOT NULL,
      contact_phone TEXT,
      amount INTEGER NOT NULL DEFAULT 60000,
      status TEXT NOT NULL DEFAULT 'confirmed',
      payment_status TEXT NOT NULL DEFAULT 'pending',
      stripe_checkout_session_id TEXT,
      stripe_payment_intent_id TEXT,
      amount_paid INTEGER,
      paid_at INTEGER,
      payment_id TEXT,
      artwork_status TEXT NOT NULL DEFAULT 'pending_upload',
      artwork_file_path TEXT,
      artwork_file_name TEXT,
      artwork_uploaded_at INTEGER,
      artwork_reviewed_at INTEGER,
      artwork_rejection_reason TEXT,
      created_at INTEGER DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
    )
  `);
  
  // Add payment columns to existing bookings table if they don't exist
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'pending'`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN stripe_checkout_session_id TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN stripe_payment_intent_id TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN amount_paid INTEGER`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN paid_at INTEGER`);
  } catch (e) {
    // Column already exists, ignore
  }
  
  // Add artwork columns to existing bookings table if they don't exist
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN artwork_status TEXT NOT NULL DEFAULT 'pending_upload'`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN artwork_file_path TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN artwork_file_name TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN artwork_uploaded_at INTEGER`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN artwork_reviewed_at INTEGER`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN artwork_rejection_reason TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Create admin_notifications table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS admin_notifications (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      type TEXT NOT NULL,
      booking_id TEXT NOT NULL REFERENCES bookings(id),
      is_handled INTEGER NOT NULL DEFAULT 0,
      handled_at INTEGER,
      created_at INTEGER DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
    )
  `);

  console.log("✅ SQLite tables initialized");
}
