import { db } from "./db";
import { sql } from "drizzle-orm";
import { users, routes, industries, campaigns } from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function seed() {
  try {
    console.log("🌱 Starting database seed...");

    // Create tables if they don't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        business_name TEXT,
        phone TEXT,
        role TEXT NOT NULL DEFAULT 'customer',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS routes (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        zip_code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        household_count INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active'
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS industries (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        icon TEXT NOT NULL
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS campaigns (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        mail_date TIMESTAMP NOT NULL,
        status TEXT NOT NULL DEFAULT 'planning',
        total_slots INTEGER NOT NULL DEFAULT 64,
        booked_slots INTEGER NOT NULL DEFAULT 0,
        revenue INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bookings (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id),
        campaign_id VARCHAR NOT NULL REFERENCES campaigns(id),
        route_id VARCHAR NOT NULL REFERENCES routes(id),
        industry_id VARCHAR NOT NULL REFERENCES industries(id),
        business_name TEXT NOT NULL,
        license_number TEXT,
        contact_email TEXT NOT NULL,
        contact_phone TEXT,
        amount INTEGER NOT NULL DEFAULT 60000,
        status TEXT NOT NULL DEFAULT 'confirmed',
        payment_id TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log("✅ Tables created successfully");

    // Check if admin user exists
    const existingAdmin = await db.select().from(users).where(sql`username = 'admin'`).limit(1);
    
    if (existingAdmin.length === 0) {
      // Create admin user
      await db.insert(users).values({
        username: "admin",
        password: await hashPassword("admin123"),
        email: "admin@routereach.ak",
        businessName: "Route Reach AK Admin",
        role: "admin",
      });
      console.log("✅ Admin user created");
    }

    // Check if demo customer exists
    const existingCustomer = await db.select().from(users).where(sql`username = 'testcustomer'`).limit(1);
    
    if (existingCustomer.length === 0) {
      // Create demo customer
      await db.insert(users).values({
        username: "testcustomer",
        password: await hashPassword("customer123"),
        email: "customer@test.com",
        businessName: "Test Business",
        phone: "907-555-0100",
        role: "customer",
      });
      console.log("✅ Demo customer created");
    }

    // Check if routes exist
    const existingRoutes = await db.select().from(routes);
    
    if (existingRoutes.length === 0) {
      // Create routes
      await db.insert(routes).values([
        {
          zipCode: "99502",
          name: "Downtown/Midtown",
          description: "Central Anchorage business district",
          householdCount: 18500,
          status: "active",
        },
        {
          zipCode: "99507",
          name: "South Anchorage",
          description: "Residential and commercial areas",
          householdCount: 22300,
          status: "active",
        },
        {
          zipCode: "99515",
          name: "Hillside",
          description: "Hillside residential area",
          householdCount: 12800,
          status: "active",
        },
        {
          zipCode: "99516",
          name: "Abbott Loop",
          description: "Abbott Loop area",
          householdCount: 15600,
          status: "active",
        },
      ]);
      console.log("✅ Routes created");
    }

    // Check if industries exist
    const existingIndustries = await db.select().from(industries);
    
    if (existingIndustries.length === 0) {
      // Create industries
      await db.insert(industries).values([
        { name: "Restaurants", description: "Food service establishments", icon: "utensils", status: "active" },
        { name: "Retail", description: "Retail stores and shops", icon: "shopping-bag", status: "active" },
        { name: "Healthcare", description: "Medical and health services", icon: "heart", status: "active" },
        { name: "Professional Services", description: "Legal, accounting, consulting", icon: "briefcase", status: "active" },
        { name: "Home Services", description: "Plumbing, HVAC, electrical", icon: "home", status: "active" },
        { name: "Automotive", description: "Auto repair and services", icon: "car", status: "active" },
        { name: "Beauty & Wellness", description: "Salons, spas, gyms", icon: "sparkles", status: "active" },
        { name: "Real Estate", description: "Property sales and management", icon: "building", status: "active" },
        { name: "Education", description: "Schools and training centers", icon: "graduation-cap", status: "active" },
        { name: "Financial Services", description: "Banking and insurance", icon: "dollar-sign", status: "active" },
        { name: "Technology", description: "IT and tech services", icon: "cpu", status: "active" },
        { name: "Entertainment", description: "Events and recreation", icon: "ticket", status: "active" },
        { name: "Pet Services", description: "Veterinary and pet care", icon: "paw-print", status: "active" },
        { name: "Construction", description: "Building and contractors", icon: "hammer", status: "active" },
        { name: "Legal Services", description: "Law firms and attorneys", icon: "scale", status: "active" },
        { name: "Other", description: "Other business types", icon: "ellipsis", status: "active" },
      ]);
      console.log("✅ Industries created");
    }

    // Check if campaigns exist
    const existingCampaigns = await db.select().from(campaigns);
    
    if (existingCampaigns.length === 0) {
      // Create a demo campaign
      const mailDate = new Date();
      mailDate.setDate(mailDate.getDate() + 30);
      
      await db.insert(campaigns).values({
        name: "November 2025 Direct Mail",
        mailDate: mailDate,
        status: "booking_open",
        totalSlots: 64,
        bookedSlots: 0,
        revenue: 0,
      });
      console.log("✅ Demo campaign created");
    }

    console.log("🎉 Database seeding completed successfully!");
  } catch (error) {
    console.error("❌ [Seed] Error:", error instanceof Error ? error.message : error);
    throw error;
  }
}
