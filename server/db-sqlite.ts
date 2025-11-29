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
      marketing_opt_in INTEGER NOT NULL DEFAULT 0,
      referred_by_user_id TEXT,
      referral_code TEXT UNIQUE,
      created_at INTEGER DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
    )
  `);
  
  // Add name column to existing users table if it doesn't exist
  try {
    sqlite.exec(`ALTER TABLE users ADD COLUMN name TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Add loyalty program columns to users table if they don't exist
  try {
    sqlite.exec(`ALTER TABLE users ADD COLUMN loyalty_slots_earned INTEGER NOT NULL DEFAULT 0`);
  } catch (e) {
    // Column already exists, ignore
  }
  
  try {
    sqlite.exec(`ALTER TABLE users ADD COLUMN loyalty_discounts_available INTEGER NOT NULL DEFAULT 0`);
  } catch (e) {
    // Column already exists, ignore
  }
  
  try {
    sqlite.exec(`ALTER TABLE users ADD COLUMN loyalty_year_reset INTEGER NOT NULL DEFAULT ${new Date().getFullYear()}`);
  } catch (e) {
    // Column already exists, ignore
  }

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

  // Create industry_subcategories table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS industry_subcategories (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      industry_id TEXT NOT NULL REFERENCES industries(id),
      name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
    )
  `);

  // Create unique index on industry_subcategories to prevent duplicate names within an industry
  try {
    sqlite.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_industry_subcategory_unique 
      ON industry_subcategories(industry_id, LOWER(name))
    `);
  } catch (e) {
    // Index already exists, ignore
  }

  // Create index on industry_subcategories for efficient lookups by industry
  try {
    sqlite.exec(`
      CREATE INDEX IF NOT EXISTS idx_industry_subcategory_lookup 
      ON industry_subcategories(industry_id, sort_order)
    `);
  } catch (e) {
    // Index already exists, ignore
  }

  // Create campaigns table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      mail_date INTEGER NOT NULL,
      print_deadline INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'planning',
      total_slots INTEGER NOT NULL DEFAULT 64,
      booked_slots INTEGER NOT NULL DEFAULT 0,
      revenue INTEGER NOT NULL DEFAULT 0,
      base_slot_price INTEGER,
      additional_slot_price INTEGER,
      created_at INTEGER DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
    )
  `);
  
  // Create campaign_routes junction table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS campaign_routes (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      campaign_id TEXT NOT NULL REFERENCES campaigns(id),
      route_id TEXT NOT NULL REFERENCES routes(id),
      created_at INTEGER DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
    )
  `);

  // Create campaign_industries junction table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS campaign_industries (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      campaign_id TEXT NOT NULL REFERENCES campaigns(id),
      industry_id TEXT NOT NULL REFERENCES industries(id),
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
      status TEXT NOT NULL DEFAULT 'pending',
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
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN pending_since INTEGER`);
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
  
  // Add cancellation columns to existing bookings table if they don't exist
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN cancellation_date INTEGER`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN refund_amount INTEGER`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN refund_status TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }
  
  // Add quantity column to existing bookings table if it doesn't exist
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1`);
  } catch (e) {
    // Column already exists, ignore
  }
  
  // Add price override columns to existing bookings table if they don't exist
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN price_override INTEGER`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN price_override_note TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }
  
  // Add approval status columns to existing bookings table if they don't exist
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'pending'`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN approved_at INTEGER`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN rejected_at INTEGER`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN rejection_note TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }
  
  // Add industry_description to existing bookings table if it doesn't exist
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN industry_description TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }
  
  // Add industry subcategory columns to existing bookings table if they don't exist
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN industry_subcategory_id TEXT REFERENCES industry_subcategories(id)`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN industry_subcategory_label TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }
  
  // Add pricing metadata columns to existing bookings table if they don't exist
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN base_price_before_discounts INTEGER`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN loyalty_discount_applied INTEGER NOT NULL DEFAULT 0`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN counts_toward_loyalty INTEGER NOT NULL DEFAULT 1`);
  } catch (e) {
    // Column already exists, ignore
  }
  
  // Add ad design brief columns to existing bookings table if they don't exist
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN main_message TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN qr_code_destination TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN qr_code_url TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN qr_code_label TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN brand_color TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN ad_style TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN secondary_color TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN additional_color_1 TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN additional_color_2 TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN logo_file_path TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN optional_image_path TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN design_notes TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN custom_fonts TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }
  
  // Add design approval workflow columns to existing bookings table if they don't exist
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN design_status TEXT NOT NULL DEFAULT 'pending_design'`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN revision_count INTEGER NOT NULL DEFAULT 0`);
  } catch (e) {
    // Column already exists, ignore
  }
  
  // Add contract acceptance columns to existing bookings table if they don't exist
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN contract_accepted INTEGER NOT NULL DEFAULT 0`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN contract_accepted_at INTEGER`);
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN contract_version TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }
  
  // Add admin_notes column for admin internal notes
  try {
    sqlite.exec(`ALTER TABLE bookings ADD COLUMN admin_notes TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }
  
  // Add base_slot_price to campaigns table if it doesn't exist
  try {
    sqlite.exec(`ALTER TABLE campaigns ADD COLUMN base_slot_price INTEGER`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Create composite unique index on bookings for subcategory-level uniqueness
  // This enforces that only one booking can exist per campaign/route/subcategory combination
  // Note: SQLite treats NULL values as distinct in unique indexes, so multiple NULL subcategories are allowed
  try {
    sqlite.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_subcategory_unique 
      ON bookings(campaign_id, route_id, industry_subcategory_id)
      WHERE industry_subcategory_id IS NOT NULL AND status != 'cancelled' AND payment_status != 'failed'
    `);
  } catch (e) {
    // Index already exists, ignore
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

  // Create dismissed_notifications table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS dismissed_notifications (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      booking_id TEXT NOT NULL REFERENCES bookings(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      notification_type TEXT NOT NULL,
      dismissed_at INTEGER NOT NULL DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
    )
  `);

  // Create pricing_rules table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS pricing_rules (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      campaign_id TEXT REFERENCES campaigns(id),
      user_id TEXT REFERENCES users(id),
      rule_type TEXT NOT NULL,
      value INTEGER NOT NULL,
      priority INTEGER NOT NULL DEFAULT 0,
      usage_limit INTEGER,
      usage_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      description TEXT NOT NULL,
      created_at INTEGER DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)),
      created_by TEXT REFERENCES users(id)
    )
  `);

  // Add display_name to existing pricing_rules table if it doesn't exist
  try {
    sqlite.exec(`ALTER TABLE pricing_rules ADD COLUMN display_name TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Create pricing_rule_applications table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS pricing_rule_applications (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      pricing_rule_id TEXT NOT NULL REFERENCES pricing_rules(id),
      booking_id TEXT NOT NULL REFERENCES bookings(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      applied_at INTEGER DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
    )
  `);

  // Create customer_notes table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS customer_notes (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      customer_id TEXT NOT NULL REFERENCES users(id),
      note TEXT NOT NULL,
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at INTEGER DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
    )
  `);

  // Create customer_tags table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS customer_tags (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      customer_id TEXT NOT NULL REFERENCES users(id),
      tag TEXT NOT NULL,
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at INTEGER DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
    )
  `);

  // Create referrals table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS referrals (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      referrer_id TEXT NOT NULL REFERENCES users(id),
      referred_id TEXT NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'pending',
      credit_amount INTEGER NOT NULL DEFAULT 10000,
      credit_used INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
    )
  `);

  // Create design_revisions table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS design_revisions (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      booking_id TEXT NOT NULL REFERENCES bookings(id),
      revision_number INTEGER NOT NULL,
      design_file_path TEXT NOT NULL,
      status TEXT NOT NULL,
      customer_feedback TEXT,
      uploaded_by TEXT NOT NULL REFERENCES users(id),
      uploaded_at INTEGER DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)),
      reviewed_at INTEGER,
      UNIQUE(booking_id, revision_number)
    )
  `);

  // Add admin_notes column to design_revisions table if it doesn't exist
  try {
    sqlite.exec(`ALTER TABLE design_revisions ADD COLUMN admin_notes TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Create admin_settings table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS admin_settings (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      description TEXT,
      updated_at INTEGER DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)),
      updated_by TEXT REFERENCES users(id)
    )
  `);

  // Create waitlist_entries table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS waitlist_entries (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL REFERENCES users(id),
      campaign_id TEXT NOT NULL REFERENCES campaigns(id),
      route_id TEXT NOT NULL REFERENCES routes(id),
      industry_subcategory_id TEXT NOT NULL REFERENCES industry_subcategories(id),
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      notified_count INTEGER NOT NULL DEFAULT 0,
      last_notified_at INTEGER,
      last_notified_channels TEXT,
      created_at INTEGER DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
    )
  `);

  // Add industry_id column to waitlist_entries if it doesn't exist
  try {
    sqlite.exec(`ALTER TABLE waitlist_entries ADD COLUMN industry_id TEXT REFERENCES industries(id)`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Make industry_subcategory_id nullable by recreating the column constraint (SQLite limitation workaround)
  // Note: SQLite doesn't support ALTER COLUMN, so we handle this via the application layer

  // Create unique index to prevent duplicate active waitlist entries for same slot
  try {
    sqlite.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_unique_active
      ON waitlist_entries(user_id, campaign_id, route_id, industry_subcategory_id)
      WHERE status = 'active'
    `);
  } catch (e) {
    // Index already exists, ignore
  }

  // Create waitlist_notifications table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS waitlist_notifications (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      sent_by_admin_id TEXT NOT NULL REFERENCES users(id),
      campaign_id TEXT NOT NULL REFERENCES campaigns(id),
      route_id TEXT REFERENCES routes(id),
      industry_subcategory_id TEXT REFERENCES industry_subcategories(id),
      message TEXT NOT NULL,
      channels TEXT NOT NULL,
      recipient_count INTEGER NOT NULL DEFAULT 0,
      recipient_user_ids TEXT NOT NULL,
      sent_at INTEGER DEFAULT (CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
    )
  `);

  console.log("✅ SQLite tables initialized");
}

export function seedIndustrySubcategories() {
  // Expected count of subcategories (to detect if data needs updating)
  const EXPECTED_SUBCATEGORY_COUNT = 56;
  
  // Check if subcategories already exist
  const existingSubcategories = sqlite.prepare('SELECT COUNT(*) as count FROM industry_subcategories').get() as { count: number };
  
  if (existingSubcategories.count === EXPECTED_SUBCATEGORY_COUNT) {
    console.log("ℹ️  Industry subcategories already seeded");
    return;
  }

  if (existingSubcategories.count > 0) {
    console.log("🔄 Updating industry subcategories (found " + existingSubcategories.count + ", expected " + EXPECTED_SUBCATEGORY_COUNT + ")...");
    
    // Check if any bookings reference subcategories
    const bookingsWithSubcategories = sqlite.prepare('SELECT COUNT(*) as count FROM bookings WHERE industry_subcategory_id IS NOT NULL').get() as { count: number };
    
    if (bookingsWithSubcategories.count > 0) {
      console.log(`⚠️  Cannot update subcategories: ${bookingsWithSubcategories.count} bookings reference existing subcategories.`);
      console.log(`⚠️  Manual migration required. Please contact system administrator.`);
      return;
    }
    
    // Safe to delete since no bookings reference subcategories
    sqlite.prepare('DELETE FROM industry_subcategories').run();
  } else {
    console.log("🌱 Seeding industry subcategories...");
  }

  // Get all industries to map subcategories
  const industries = sqlite.prepare('SELECT id, name FROM industries').all() as Array<{id: string, name: string}>;
  const industryMap = new Map(industries.map(i => [i.name, i.id]));

  // Define subcategories for each industry category
  const subcategoryData: Array<{industryName: string, subcategories: Array<{name: string, sortOrder: number}>}> = [
    {
      industryName: "Construction",
      subcategories: [
        { name: "Electrical", sortOrder: 1 },
        { name: "Carpentry", sortOrder: 2 },
        { name: "Plumbing & HVAC", sortOrder: 3 },
        { name: "Roofing", sortOrder: 4 },
        { name: "Concrete & Masonry", sortOrder: 5 },
        { name: "General Contractor", sortOrder: 6 }
      ]
    },
    {
      industryName: "Healthcare",
      subcategories: [
        { name: "Dentist/Orthodontist", sortOrder: 1 },
        { name: "Psychiatry/Mental Health", sortOrder: 2 },
        { name: "Chiropractic", sortOrder: 3 },
        { name: "Optometry", sortOrder: 4 },
        { name: "Physical Therapy", sortOrder: 5 },
        { name: "Massage Therapy", sortOrder: 6 }
      ]
    },
    {
      industryName: "Financial Services",
      subcategories: [
        { name: "Accounting/Bookkeeping", sortOrder: 1 },
        { name: "Financial Planning", sortOrder: 2 },
        { name: "Insurance (General)", sortOrder: 3 },
        { name: "Tax Services", sortOrder: 4 }
      ]
    },
    {
      industryName: "Real Estate",
      subcategories: [
        { name: "Realtor/Agent", sortOrder: 1 },
        { name: "Loan Originator/Mortgage", sortOrder: 2 },
        { name: "Property Management", sortOrder: 3 },
        { name: "Appraisal Services", sortOrder: 4 }
      ]
    },
    {
      industryName: "Beauty & Wellness",
      subcategories: [
        { name: "Hair Salon", sortOrder: 1 },
        { name: "Spa/Massage", sortOrder: 2 },
        { name: "Beauty Supply Store", sortOrder: 3 },
        { name: "Nail Salon", sortOrder: 4 },
        { name: "Aesthetics/Med Spa", sortOrder: 5 }
      ]
    },
    {
      industryName: "Home Services",
      subcategories: [
        { name: "Cleaning Services", sortOrder: 1 },
        { name: "Landscaping/Lawn Care", sortOrder: 2 },
        { name: "Pest Control", sortOrder: 3 },
        { name: "Appliance Repair", sortOrder: 4 }
      ]
    },
    {
      industryName: "Automotive",
      subcategories: [
        { name: "Auto Repair/Mechanic", sortOrder: 1 },
        { name: "Auto Detailing", sortOrder: 2 },
        { name: "Tire Services", sortOrder: 3 },
        { name: "Auto Body/Paint", sortOrder: 4 }
      ]
    },
    {
      industryName: "Food & Beverage",
      subcategories: [
        { name: "Restaurant", sortOrder: 1 },
        { name: "Catering", sortOrder: 2 },
        { name: "Bakery/Cafe", sortOrder: 3 },
        { name: "Bar/Brewery", sortOrder: 4 }
      ]
    },
    {
      industryName: "Professional Services",
      subcategories: [
        { name: "Legal Services", sortOrder: 1 },
        { name: "IT Services", sortOrder: 2 },
        { name: "Consulting", sortOrder: 3 }
      ]
    },
    {
      industryName: "Retail",
      subcategories: [
        { name: "Clothing/Apparel", sortOrder: 1 },
        { name: "Sporting Goods", sortOrder: 2 },
        { name: "Electronics", sortOrder: 3 },
        { name: "Home Goods", sortOrder: 4 },
        { name: "Specialty Retail", sortOrder: 5 }
      ]
    },
    {
      industryName: "Pet Services",
      subcategories: [
        { name: "Veterinary Care", sortOrder: 1 },
        { name: "Pet Grooming", sortOrder: 2 },
        { name: "Dog Walking/Pet Sitting", sortOrder: 3 },
        { name: "Pet Supply Store", sortOrder: 4 }
      ]
    },
    {
      industryName: "Fitness & Recreation",
      subcategories: [
        { name: "Gym/Fitness Center", sortOrder: 1 },
        { name: "Personal Training", sortOrder: 2 },
        { name: "Yoga/Pilates Studio", sortOrder: 3 },
        { name: "Sports Facilities", sortOrder: 4 }
      ]
    },
    {
      industryName: "Outdoor Recreation and Tours",
      subcategories: [
        { name: "Hunting guides", sortOrder: 1 },
        { name: "Scenic touring (busses, Boats, ATVs and vans)", sortOrder: 2 },
        { name: "Fishing charters", sortOrder: 3 }
      ]
    }
  ];

  // Insert subcategories
  const insertStmt = sqlite.prepare(`
    INSERT INTO industry_subcategories (id, industry_id, name, sort_order, status, created_at)
    VALUES (?, ?, ?, ?, 'active', ?)
  `);

  const insertMany = sqlite.transaction((subcategories) => {
    for (const subcategory of subcategories) {
      insertStmt.run(subcategory.id, subcategory.industryId, subcategory.name, subcategory.sortOrder, subcategory.createdAt);
    }
  });

  const subcategoriesToInsert: Array<{id: string, industryId: string, name: string, sortOrder: number, createdAt: number}> = [];
  const now = Date.now();

  for (const category of subcategoryData) {
    const industryId = industryMap.get(category.industryName);
    if (!industryId) {
      console.warn(`⚠️  Industry not found: ${category.industryName}`);
      continue;
    }

    for (const subcat of category.subcategories) {
      subcategoriesToInsert.push({
        id: generateSQLiteId(),
        industryId,
        name: subcat.name,
        sortOrder: subcat.sortOrder,
        createdAt: now
      });
    }
  }

  insertMany(subcategoriesToInsert);

  console.log(`✅ Seeded ${subcategoriesToInsert.length} industry subcategories`);
}

// Helper to generate SQLite-compatible IDs
function generateSQLiteId(): string {
  return Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}
