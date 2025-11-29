import { db } from "./db-sqlite";
import { users, routes, industries, campaigns, campaignRoutes, SLOTS_PER_ROUTE } from "@shared/schema";
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

async function migrateCampaignSlots() {
  try {
    console.log("🔄 Migrating campaign slots to use dynamic calculation...");
    
    // Get all campaigns
    const allCampaigns = await db.select().from(campaigns);
    
    if (allCampaigns.length === 0) {
      console.log("ℹ️  No campaigns to migrate");
      return;
    }
    
    let migratedCount = 0;
    for (const campaign of allCampaigns) {
      // Count routes for this campaign
      const campaignRouteEntries = await db
        .select()
        .from(campaignRoutes)
        .where(eq(campaignRoutes.campaignId, campaign.id));
      
      const routeCount = campaignRouteEntries.length;
      const correctTotalSlots = routeCount * SLOTS_PER_ROUTE;
      
      // Update if totalSlots is incorrect
      if (campaign.totalSlots !== correctTotalSlots) {
        await db
          .update(campaigns)
          .set({ totalSlots: correctTotalSlots })
          .where(eq(campaigns.id, campaign.id));
        
        console.log(`  ✅ Updated campaign "${campaign.name}": ${campaign.totalSlots} → ${correctTotalSlots} slots (${routeCount} routes × ${SLOTS_PER_ROUTE})`);
        migratedCount++;
      }
    }
    
    if (migratedCount > 0) {
      console.log(`✅ Migrated ${migratedCount} campaign(s) to use dynamic slot calculation`);
    } else {
      console.log("ℹ️  All campaigns already using correct slot calculation");
    }
  } catch (error) {
    console.error("❌ Error migrating campaign slots:", error);
    // Don't throw - migration failure shouldn't break seed process
  }
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
        name: "John Smith",
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

    // Check if industries exist and match expected taxonomy
    const existingIndustries = await db.select().from(industries);
    const EXPECTED_INDUSTRY_COUNT = 14;
    
    if (existingIndustries.length === 0) {
      // Create industries
      await db.insert(industries).values([
        { id: generateId(), name: "Construction", description: "Building and contractors", icon: "hammer", status: "active" },
        { id: generateId(), name: "Healthcare", description: "Medical and health services", icon: "heart", status: "active" },
        { id: generateId(), name: "Financial Services", description: "Banking and insurance", icon: "dollar-sign", status: "active" },
        { id: generateId(), name: "Real Estate", description: "Property sales and management", icon: "building", status: "active" },
        { id: generateId(), name: "Beauty & Wellness", description: "Salons, spas, aesthetics", icon: "sparkles", status: "active" },
        { id: generateId(), name: "Home Services", description: "Cleaning, landscaping, pest control", icon: "home", status: "active" },
        { id: generateId(), name: "Automotive", description: "Auto repair and services", icon: "car", status: "active" },
        { id: generateId(), name: "Food & Beverage", description: "Restaurants, catering, bars", icon: "utensils", status: "active" },
        { id: generateId(), name: "Professional Services", description: "Legal, IT, consulting", icon: "briefcase", status: "active" },
        { id: generateId(), name: "Retail", description: "Retail stores and shops", icon: "shopping-bag", status: "active" },
        { id: generateId(), name: "Pet Services", description: "Veterinary and pet care", icon: "paw-print", status: "active" },
        { id: generateId(), name: "Fitness & Recreation", description: "Gyms, yoga, sports facilities", icon: "dumbbell", status: "active" },
        { id: generateId(), name: "Outdoor Recreation and Tours", description: "Hunting, fishing, scenic tours", icon: "mountain", status: "active" },
        { id: generateId(), name: "Other", description: "Other business types", icon: "ellipsis", status: "active" },
      ]);
      console.log("✅ 14 Industries created");
    } else {
      // Check if "Other" industry exists and add it if missing
      const otherIndustry = existingIndustries.find(i => i.name === "Other");
      if (!otherIndustry) {
        await db.insert(industries).values({
          id: generateId(),
          name: "Other",
          description: "Other business types",
          icon: "ellipsis",
          status: "active"
        });
        console.log("✅ Added missing 'Other' industry category");
      }
      
      if (existingIndustries.length !== EXPECTED_INDUSTRY_COUNT && existingIndustries.length !== EXPECTED_INDUSTRY_COUNT - 1) {
        console.log(`⚠️  Warning: Found ${existingIndustries.length} industries, expected ${EXPECTED_INDUSTRY_COUNT}. Database may have legacy industry data.`);
      }
    }

    // Seed industry subcategories after industries are created
    const { seedIndustrySubcategories } = await import("./db-sqlite");
    seedIndustrySubcategories();

    console.log("ℹ️  Campaign seeding disabled - campaigns can be manually created in admin panel");
    
    // Migrate existing campaigns to recalculate totalSlots based on routes × SLOTS_PER_ROUTE
    await migrateCampaignSlots();

    console.log("🎉 SQLite database seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding SQLite database:", error);
    throw error;
  }
}
