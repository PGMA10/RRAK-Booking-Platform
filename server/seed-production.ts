import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

neonConfig.webSocketConstructor = ws;

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

function generateId() {
  return randomBytes(16).toString("hex");
}

async function seedProduction() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is not set");
    process.exit(1);
  }

  console.log("🌱 Starting production PostgreSQL database setup...");
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log("📋 Creating tables...");
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        name TEXT,
        business_name TEXT,
        phone TEXT,
        role TEXT NOT NULL DEFAULT 'customer',
        marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
        referred_by_user_id TEXT,
        referral_code TEXT UNIQUE,
        loyalty_slots_earned INTEGER NOT NULL DEFAULT 0,
        loyalty_discounts_available INTEGER NOT NULL DEFAULT 0,
        loyalty_year_reset INTEGER NOT NULL DEFAULT ${new Date().getFullYear()},
        created_at BIGINT
      )
    `);
    console.log("  ✅ users table");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS routes (
        id TEXT PRIMARY KEY,
        zip_code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        household_count INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active'
      )
    `);
    console.log("  ✅ routes table");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS industries (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        icon TEXT NOT NULL
      )
    `);
    console.log("  ✅ industries table");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS industry_subcategories (
        id TEXT PRIMARY KEY,
        industry_id TEXT NOT NULL REFERENCES industries(id),
        name TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at BIGINT
      )
    `);
    console.log("  ✅ industry_subcategories table");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        mail_date BIGINT NOT NULL,
        print_deadline BIGINT NOT NULL,
        status TEXT NOT NULL DEFAULT 'planning',
        total_slots INTEGER NOT NULL DEFAULT 0,
        booked_slots INTEGER NOT NULL DEFAULT 0,
        revenue INTEGER NOT NULL DEFAULT 0,
        base_slot_price INTEGER,
        additional_slot_price INTEGER,
        created_at BIGINT
      )
    `);
    console.log("  ✅ campaigns table");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaign_routes (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL REFERENCES campaigns(id),
        route_id TEXT NOT NULL REFERENCES routes(id),
        created_at BIGINT
      )
    `);
    console.log("  ✅ campaign_routes table");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaign_industries (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL REFERENCES campaigns(id),
        industry_id TEXT NOT NULL REFERENCES industries(id),
        created_at BIGINT
      )
    `);
    console.log("  ✅ campaign_industries table");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        campaign_id TEXT NOT NULL REFERENCES campaigns(id),
        route_id TEXT NOT NULL REFERENCES routes(id),
        industry_id TEXT NOT NULL REFERENCES industries(id),
        industry_subcategory_id TEXT REFERENCES industry_subcategories(id),
        industry_subcategory_label TEXT,
        industry_description TEXT,
        business_name TEXT NOT NULL,
        contact_email TEXT NOT NULL,
        contact_phone TEXT,
        amount INTEGER NOT NULL DEFAULT 60000,
        quantity INTEGER NOT NULL DEFAULT 1,
        price_override INTEGER,
        price_override_note TEXT,
        status TEXT NOT NULL DEFAULT 'confirmed',
        payment_status TEXT NOT NULL DEFAULT 'pending',
        stripe_checkout_session_id TEXT,
        stripe_payment_intent_id TEXT,
        amount_paid INTEGER,
        paid_at BIGINT,
        pending_since BIGINT,
        payment_id TEXT,
        approval_status TEXT NOT NULL DEFAULT 'pending',
        approved_at BIGINT,
        rejected_at BIGINT,
        rejection_note TEXT,
        artwork_status TEXT NOT NULL DEFAULT 'pending_upload',
        artwork_file_path TEXT,
        artwork_file_name TEXT,
        artwork_uploaded_at BIGINT,
        artwork_reviewed_at BIGINT,
        artwork_rejection_reason TEXT,
        main_message TEXT,
        qr_code_destination TEXT,
        qr_code_url TEXT,
        qr_code_label TEXT,
        brand_color TEXT,
        secondary_color TEXT,
        additional_color_1 TEXT,
        additional_color_2 TEXT,
        ad_style TEXT,
        logo_file_path TEXT,
        optional_image_path TEXT,
        design_notes TEXT,
        custom_fonts TEXT,
        design_status TEXT NOT NULL DEFAULT 'pending_design',
        revision_count INTEGER NOT NULL DEFAULT 0,
        base_price_before_discounts INTEGER,
        loyalty_discount_applied BOOLEAN NOT NULL DEFAULT FALSE,
        counts_toward_loyalty BOOLEAN NOT NULL DEFAULT TRUE,
        contract_accepted BOOLEAN NOT NULL DEFAULT FALSE,
        cancellation_date BIGINT,
        refund_amount INTEGER,
        refund_status TEXT,
        contract_accepted_at BIGINT,
        contract_version TEXT,
        created_at BIGINT
      )
    `);
    console.log("  ✅ bookings table");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id TEXT PRIMARY KEY,
        bulk_booking_threshold INTEGER NOT NULL DEFAULT 3,
        bulk_booking_discount INTEGER NOT NULL DEFAULT 30000,
        loyalty_slot_threshold INTEGER NOT NULL DEFAULT 3,
        loyalty_discount_amount INTEGER NOT NULL DEFAULT 15000,
        updated_at BIGINT
      )
    `);
    console.log("  ✅ admin_settings table");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS dismissed_notifications (
        id TEXT PRIMARY KEY,
        admin_id TEXT NOT NULL REFERENCES users(id),
        notification_type TEXT NOT NULL,
        notification_key TEXT NOT NULL,
        dismissed_at BIGINT
      )
    `);
    console.log("  ✅ dismissed_notifications table");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS design_revisions (
        id TEXT PRIMARY KEY,
        booking_id TEXT NOT NULL REFERENCES bookings(id),
        version INTEGER NOT NULL,
        design_file_path TEXT,
        revision_notes TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at BIGINT,
        reviewed_at BIGINT,
        customer_feedback TEXT
      )
    `);
    console.log("  ✅ design_revisions table");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS waitlist_entries (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        campaign_id TEXT NOT NULL REFERENCES campaigns(id),
        route_id TEXT NOT NULL REFERENCES routes(id),
        industry_id TEXT NOT NULL REFERENCES industries(id),
        industry_subcategory_id TEXT REFERENCES industry_subcategories(id),
        status TEXT NOT NULL DEFAULT 'active',
        notified_at BIGINT,
        created_at BIGINT
      )
    `);
    console.log("  ✅ waitlist_entries table");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS waitlist_notifications (
        id TEXT PRIMARY KEY,
        admin_id TEXT NOT NULL REFERENCES users(id),
        message TEXT NOT NULL,
        channels TEXT NOT NULL,
        recipient_count INTEGER NOT NULL DEFAULT 0,
        recipient_user_ids TEXT NOT NULL,
        sent_at BIGINT
      )
    `);
    console.log("  ✅ waitlist_notifications table");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_notifications (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        booking_id TEXT NOT NULL REFERENCES bookings(id),
        is_handled BOOLEAN NOT NULL DEFAULT FALSE,
        handled_at BIGINT,
        created_at BIGINT
      )
    `);
    console.log("  ✅ admin_notifications table");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS customer_notes (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL REFERENCES users(id),
        note TEXT NOT NULL,
        created_by TEXT NOT NULL REFERENCES users(id),
        created_at BIGINT
      )
    `);
    console.log("  ✅ customer_notes table");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS customer_tags (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL REFERENCES users(id),
        tag TEXT NOT NULL,
        created_by TEXT NOT NULL REFERENCES users(id),
        created_at BIGINT
      )
    `);
    console.log("  ✅ customer_tags table");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS referrals (
        id TEXT PRIMARY KEY,
        referrer_id TEXT NOT NULL REFERENCES users(id),
        referred_id TEXT NOT NULL REFERENCES users(id),
        status TEXT NOT NULL DEFAULT 'pending',
        credit_amount INTEGER NOT NULL DEFAULT 10000,
        credit_used BOOLEAN NOT NULL DEFAULT FALSE,
        created_at BIGINT
      )
    `);
    console.log("  ✅ referrals table");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS pricing_rules (
        id TEXT PRIMARY KEY,
        campaign_id TEXT REFERENCES campaigns(id),
        user_id TEXT REFERENCES users(id),
        rule_type TEXT NOT NULL,
        value INTEGER NOT NULL,
        priority INTEGER NOT NULL DEFAULT 0,
        usage_limit INTEGER,
        usage_count INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        description TEXT NOT NULL,
        display_name TEXT,
        created_at BIGINT,
        created_by TEXT REFERENCES users(id)
      )
    `);
    console.log("  ✅ pricing_rules table");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS pricing_rule_applications (
        id TEXT PRIMARY KEY,
        pricing_rule_id TEXT NOT NULL REFERENCES pricing_rules(id),
        booking_id TEXT NOT NULL REFERENCES bookings(id),
        user_id TEXT NOT NULL REFERENCES users(id),
        applied_at BIGINT
      )
    `);
    console.log("  ✅ pricing_rule_applications table");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        sid VARCHAR NOT NULL PRIMARY KEY,
        sess JSON NOT NULL,
        expire TIMESTAMP(6) NOT NULL
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS IDX_session_expire ON user_sessions (expire)`);
    console.log("  ✅ user_sessions table (for session storage)");

    console.log("\n👤 Checking for admin user...");
    const adminCheck = await pool.query(`SELECT id FROM users WHERE username = 'admin'`);
    
    if (adminCheck.rows.length === 0) {
      const adminId = generateId();
      const hashedPassword = await hashPassword("admin123");
      await pool.query(
        `INSERT INTO users (id, username, password, email, business_name, role, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [adminId, "admin", hashedPassword, "admin@routereach.ak", "Route Reach AK Admin", "admin", Date.now()]
      );
      console.log("  ✅ Admin user created (username: admin, password: admin123)");
    } else {
      console.log("  ℹ️  Admin user already exists");
    }

    console.log("\n🏭 Checking for industries...");
    const industryCheck = await pool.query(`SELECT id, name FROM industries`);
    
    if (industryCheck.rows.length === 0) {
      const industriesData = [
        { name: "Construction", description: "Building and contractors", icon: "hammer" },
        { name: "Healthcare", description: "Medical and health services", icon: "heart" },
        { name: "Financial Services", description: "Banking and insurance", icon: "dollar-sign" },
        { name: "Real Estate", description: "Property sales and management", icon: "building" },
        { name: "Beauty & Wellness", description: "Salons, spas, gyms", icon: "sparkles" },
        { name: "Home Services", description: "Cleaning, landscaping, repairs", icon: "home" },
        { name: "Automotive", description: "Auto repair and services", icon: "car" },
        { name: "Food & Beverage", description: "Restaurants and catering", icon: "utensils" },
        { name: "Professional Services", description: "Legal, accounting, consulting", icon: "briefcase" },
        { name: "Retail", description: "Retail stores and shops", icon: "shopping-bag" },
        { name: "Pet Services", description: "Veterinary and pet care", icon: "paw-print" },
        { name: "Fitness & Recreation", description: "Gyms and sports facilities", icon: "dumbbell" },
        { name: "Outdoor Recreation and Tours", description: "Tours and outdoor activities", icon: "mountain" },
        { name: "Other", description: "Other business types", icon: "ellipsis" },
      ];
      
      for (const industry of industriesData) {
        const industryId = generateId();
        await pool.query(
          `INSERT INTO industries (id, name, description, icon, status) VALUES ($1, $2, $3, $4, $5)`,
          [industryId, industry.name, industry.description, industry.icon, "active"]
        );
      }
      console.log("  ✅ Industries created");
    } else {
      // Check if "Other" industry exists and add it if missing
      const hasOther = industryCheck.rows.some((i: any) => i.name === "Other");
      if (!hasOther) {
        const otherId = generateId();
        await pool.query(
          `INSERT INTO industries (id, name, description, icon, status) VALUES ($1, $2, $3, $4, $5)`,
          [otherId, "Other", "Other business types", "ellipsis", "active"]
        );
        console.log("  ✅ Added missing 'Other' industry category");
      } else {
        console.log("  ℹ️  Industries already exist");
      }
    }

    console.log("\n📋 Checking for industry subcategories...");
    const subcategoryCheck = await pool.query(`SELECT id FROM industry_subcategories LIMIT 1`);
    
    if (subcategoryCheck.rows.length === 0) {
      const industriesResult = await pool.query(`SELECT id, name FROM industries`);
      const industryMap = new Map(industriesResult.rows.map((i: any) => [i.name, i.id]));
      
      const subcategoryData = [
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
      
      let subcategoryCount = 0;
      const now = Date.now();
      
      for (const category of subcategoryData) {
        const industryId = industryMap.get(category.industryName);
        if (!industryId) {
          console.warn(`  ⚠️  Industry not found: ${category.industryName}`);
          continue;
        }
        
        for (const subcat of category.subcategories) {
          const subcatId = generateId();
          await pool.query(
            `INSERT INTO industry_subcategories (id, industry_id, name, sort_order, status, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
            [subcatId, industryId, subcat.name, subcat.sortOrder, "active", now]
          );
          subcategoryCount++;
        }
      }
      
      console.log(`  ✅ Created ${subcategoryCount} industry subcategories`);
    } else {
      console.log("  ℹ️  Industry subcategories already exist");
    }

    console.log("\n🗺️  Checking for routes...");
    const routeCheck = await pool.query(`SELECT id FROM routes LIMIT 1`);
    
    if (routeCheck.rows.length === 0) {
      const routesData = [
        { zipCode: "99502", name: "Downtown/Midtown", description: "Central Anchorage business district", householdCount: 18500 },
        { zipCode: "99507", name: "South Anchorage", description: "Residential and commercial areas", householdCount: 22300 },
        { zipCode: "99515", name: "Hillside", description: "Hillside residential area", householdCount: 12800 },
        { zipCode: "99516", name: "Abbott Loop", description: "Abbott Loop area", householdCount: 15600 },
      ];
      
      for (const route of routesData) {
        const routeId = generateId();
        await pool.query(
          `INSERT INTO routes (id, zip_code, name, description, household_count, status) VALUES ($1, $2, $3, $4, $5, $6)`,
          [routeId, route.zipCode, route.name, route.description, route.householdCount, "active"]
        );
      }
      console.log("  ✅ Routes created");
    } else {
      console.log("  ℹ️  Routes already exist");
    }

    console.log("\n🎉 Production database setup completed successfully!");
    
  } catch (error) {
    console.error("❌ Error setting up production database:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

seedProduction().catch(console.error);
