import { db } from "./db-sqlite";
import { users, routes, industries, campaigns } from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

// Generate UUID v4
function generateId() {
  return randomBytes(16).toString("hex");
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function seedSQLite() {
  try {
    console.log("🌱 Starting SQLite database seed...");

    // Check if admin user exists
    const existingAdmin = await db.select().from(users).where(eq(users.username, 'admin')).limit(1);
    
    if (existingAdmin.length === 0) {
      // Create admin user
      await db.insert(users).values({
        id: generateId(),
        username: "admin",
        password: await hashPassword("admin123"),
        email: "admin@routereach.ak",
        businessName: "Route Reach AK Admin",
        role: "admin",
        createdAt: new Date(),
      });
      console.log("✅ Admin user created (admin/admin123)");
    }

    // Check if demo customer exists
    const existingCustomer = await db.select().from(users).where(eq(users.username, 'testcustomer')).limit(1);
    
    if (existingCustomer.length === 0) {
      // Create demo customer
      await db.insert(users).values({
        id: generateId(),
        username: "testcustomer",
        password: await hashPassword("customer123"),
        email: "customer@test.com",
        businessName: "Test Business",
        phone: "907-555-0100",
        role: "customer",
        createdAt: new Date(),
      });
      console.log("✅ Demo customer created (testcustomer/customer123)");
    }

    // Check if routes exist
    const existingRoutes = await db.select().from(routes);
    
    if (existingRoutes.length === 0) {
      // Create routes
      await db.insert(routes).values([
        {
          id: generateId(),
          zipCode: "99502",
          name: "Downtown/Midtown",
          description: "Central Anchorage business district",
          householdCount: 18500,
          status: "active",
        },
        {
          id: generateId(),
          zipCode: "99507",
          name: "South Anchorage",
          description: "Residential and commercial areas",
          householdCount: 22300,
          status: "active",
        },
        {
          id: generateId(),
          zipCode: "99515",
          name: "Hillside",
          description: "Hillside residential area",
          householdCount: 12800,
          status: "active",
        },
        {
          id: generateId(),
          zipCode: "99516",
          name: "Abbott Loop",
          description: "Abbott Loop area",
          householdCount: 15600,
          status: "active",
        },
      ]);
      console.log("✅ 4 Routes created");
    }

    // Check if industries exist
    const existingIndustries = await db.select().from(industries);
    
    if (existingIndustries.length === 0) {
      // Create industries
      await db.insert(industries).values([
        { id: generateId(), name: "Restaurants", description: "Food service establishments", icon: "utensils", status: "active" },
        { id: generateId(), name: "Retail", description: "Retail stores and shops", icon: "shopping-bag", status: "active" },
        { id: generateId(), name: "Healthcare", description: "Medical and health services", icon: "heart", status: "active" },
        { id: generateId(), name: "Professional Services", description: "Legal, accounting, consulting", icon: "briefcase", status: "active" },
        { id: generateId(), name: "Home Services", description: "Plumbing, HVAC, electrical", icon: "home", status: "active" },
        { id: generateId(), name: "Automotive", description: "Auto repair and services", icon: "car", status: "active" },
        { id: generateId(), name: "Beauty & Wellness", description: "Salons, spas, gyms", icon: "sparkles", status: "active" },
        { id: generateId(), name: "Real Estate", description: "Property sales and management", icon: "building", status: "active" },
        { id: generateId(), name: "Education", description: "Schools and training centers", icon: "graduation-cap", status: "active" },
        { id: generateId(), name: "Financial Services", description: "Banking and insurance", icon: "dollar-sign", status: "active" },
        { id: generateId(), name: "Technology", description: "IT and tech services", icon: "cpu", status: "active" },
        { id: generateId(), name: "Entertainment", description: "Events and recreation", icon: "ticket", status: "active" },
        { id: generateId(), name: "Pet Services", description: "Veterinary and pet care", icon: "paw-print", status: "active" },
        { id: generateId(), name: "Construction", description: "Building and contractors", icon: "hammer", status: "active" },
        { id: generateId(), name: "Legal Services", description: "Law firms and attorneys", icon: "scale", status: "active" },
        { id: generateId(), name: "Other", description: "Other business types", icon: "ellipsis", status: "active" },
      ]);
      console.log("✅ 16 Industries created");
    }

    // Check if campaigns exist
    const existingCampaigns = await db.select().from(campaigns);
    
    if (existingCampaigns.length === 0) {
      // Create demo campaigns with realistic dates
      const now = new Date();
      
      // Campaign 1: Next month
      const mailDate1 = new Date();
      mailDate1.setMonth(mailDate1.getMonth() + 1);
      mailDate1.setDate(15); // 15th of next month
      
      // Campaign 2: Two months out
      const mailDate2 = new Date();
      mailDate2.setMonth(mailDate2.getMonth() + 2);
      mailDate2.setDate(15); // 15th of month after next
      
      // Campaign 3: Three months out  
      const mailDate3 = new Date();
      mailDate3.setMonth(mailDate3.getMonth() + 3);
      mailDate3.setDate(15);
      
      await db.insert(campaigns).values([
        {
          id: generateId(),
          name: `${mailDate1.toLocaleString('default', { month: 'long' })} ${mailDate1.getFullYear()} Campaign`,
          mailDate: mailDate1,
          status: "booking_open",
          totalSlots: 64,
          bookedSlots: 0,
          revenue: 0,
          createdAt: now,
        },
        {
          id: generateId(),
          name: `${mailDate2.toLocaleString('default', { month: 'long' })} ${mailDate2.getFullYear()} Campaign`,
          mailDate: mailDate2,
          status: "planning",
          totalSlots: 64,
          bookedSlots: 0,
          revenue: 0,
          createdAt: now,
        },
        {
          id: generateId(),
          name: `${mailDate3.toLocaleString('default', { month: 'long' })} ${mailDate3.getFullYear()} Campaign`,
          mailDate: mailDate3,
          status: "planning",
          totalSlots: 64,
          bookedSlots: 0,
          revenue: 0,
          createdAt: now,
        },
      ]);
      console.log("✅ 3 Demo campaigns created");
    }

    console.log("🎉 SQLite database seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding SQLite database:", error);
    throw error;
  }
}
