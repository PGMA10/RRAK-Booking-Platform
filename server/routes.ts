import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertBookingSchema, insertRouteSchema, insertIndustrySchema, insertCampaignSchema, insertWaitlistEntrySchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import Stripe from "stripe";
import { calculatePricingQuote, recordPricingRuleApplication } from "./pricing-service";

// Reference: Stripe integration blueprint (javascript_stripe)
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-09-30.clover" as any,
});

// Helper function to parse date strings at noon AKST to avoid timezone boundary issues
// When a user selects "Nov 8" in the date picker, we store it as Nov 8 12:00 AKST
// AKST is UTC-9, so noon AKST is 21:00 UTC (9 PM UTC the same day)
function parseDateAtNoonAKST(dateString: string): Date {
  const date = new Date(dateString);
  // Create a new date at noon AKST (which is 21:00 UTC, or 9 PM UTC)
  // AKST is UTC-9, so we add 9 hours to noon to get the UTC equivalent
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 21, 0, 0, 0));
}

// Helper function to release (refund) a reserved loyalty discount
// Called when a booking with loyaltyDiscountApplied is cancelled or expires
async function releaseLoyaltyDiscount(userId: string, bookingId: string): Promise<void> {
  try {
    const user = await storage.getUser(userId);
    if (!user) return;
    
    await storage.updateUserLoyalty(userId, {
      loyaltyDiscountsAvailable: user.loyaltyDiscountsAvailable + 1,
    });
    
    console.log(`🎟️ [Loyalty] Released reserved loyalty discount for booking ${bookingId}. User ${userId} now has ${user.loyaltyDiscountsAvailable + 1} available`);
  } catch (error) {
    console.error(`❌ [Loyalty] Failed to release discount for booking ${bookingId}:`, error);
  }
}

// Process loyalty program tracking after a booking is paid
async function processLoyaltyTracking(
  userId: string,
  bookingId: string,
  _slotsBooked: number, // Not used - we track transactions, not slots
  amountPaid: number
): Promise<void> {
  // Get user details
  const user = await storage.getUser(userId);
  if (!user) return;
  
  // Get booking details to access pricing metadata
  const booking = await storage.getBookingById(bookingId);
  if (!booking) return;
  
  const currentYear = new Date().getFullYear();
  
  // Check if year has changed - reset loyalty counters if so
  let currentUserData = user;
  if (user.loyaltyYearReset !== currentYear) {
    await storage.updateUserLoyalty(userId, {
      loyaltySlotsEarned: 0,
      loyaltyDiscountsAvailable: 0,
      loyaltyYearReset: currentYear,
    });
    console.log(`🔄 [Loyalty] Reset loyalty counters for user ${userId} for year ${currentYear}`);
    
    // Refresh user data after reset to avoid using stale counters
    const updatedUser = await storage.getUser(userId);
    if (updatedUser) {
      currentUserData = updatedUser;
    }
  }
  
  // Check if a loyalty discount was applied to this booking (from stored metadata)
  const wasLoyaltyDiscountApplied = booking.loyaltyDiscountApplied === true;
  
  // NOTE: Loyalty discount is now reserved (deducted) at booking creation time,
  // not here at payment time. This ensures atomic reservation and prevents race conditions.
  // The deduction already happened, so we just log it for tracking purposes.
  if (wasLoyaltyDiscountApplied) {
    console.log(`🎟️ [Loyalty] Loyalty discount was already reserved for booking ${bookingId} at creation time`);
  }
  
  // Check if this booking counts toward earning loyalty rewards (from stored metadata)
  const countsTowardLoyalty = booking.countsTowardLoyalty === true;
  
  if (countsTowardLoyalty) {
    // Fetch loyalty threshold from admin settings
    const { db } = await import("./db-sqlite");
    const { adminSettings } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    
    const loyaltyThresholdSetting = await db.query.adminSettings.findFirst({
      where: eq(adminSettings.key, 'loyalty_slots_threshold'),
    });
    const LOYALTY_THRESHOLD = loyaltyThresholdSetting ? parseInt(loyaltyThresholdSetting.value) : 3;
    
    // NEW LOGIC: Track purchases (transactions), not slots
    // Each qualifying purchase counts as 1, regardless of how many slots were bought
    const purchaseCount = 1;
    const newPurchasesEarned = (currentUserData.loyaltyYearReset === currentYear ? currentUserData.loyaltySlotsEarned : 0) + purchaseCount;
    
    // Calculate how many new discounts were earned
    const newDiscountsEarned = Math.floor(newPurchasesEarned / LOYALTY_THRESHOLD) - 
                                Math.floor((currentUserData.loyaltyYearReset === currentYear ? currentUserData.loyaltySlotsEarned : 0) / LOYALTY_THRESHOLD);
    
    const newDiscountsAvailable = (currentUserData.loyaltyYearReset === currentYear ? currentUserData.loyaltyDiscountsAvailable : 0) + newDiscountsEarned;
    
    await storage.updateUserLoyalty(userId, {
      loyaltySlotsEarned: newPurchasesEarned, // Note: field name is legacy, but now tracks purchases
      loyaltyDiscountsAvailable: newDiscountsAvailable,
    });
    
    console.log(`⭐ [Loyalty] User ${userId} earned 1 purchase. Total: ${newPurchasesEarned}/${LOYALTY_THRESHOLD}. Discounts available: ${newDiscountsAvailable}`);
    
    if (newDiscountsEarned > 0) {
      console.log(`🎉 [Loyalty] User ${userId} earned ${newDiscountsEarned} new discount(s)!`);
    }
  } else {
    console.log(`ℹ️ [Loyalty] Booking ${bookingId} does not count toward loyalty (user-specific discount applied)`);
  }
}

// Configure multer for file uploads
// Create upload directories
const uploadsDir = path.join(process.cwd(), "uploads", "artwork");
const logosDir = path.join(process.cwd(), "uploads", "logos");
const imagesDir = path.join(process.cwd(), "uploads", "images");
const designsDir = path.join(process.cwd(), "uploads", "designs");

[uploadsDir, logosDir, imagesDir, designsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Logo upload configuration
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, logosDir);
  },
  filename: (req, file, cb) => {
    const bookingId = req.params.bookingId || 'unknown';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `logo-${bookingId}-${timestamp}${ext}`);
  },
});

const uploadLogo = multer({
  storage: logoStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
});

// Optional image upload configuration
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, imagesDir);
  },
  filename: (req, file, cb) => {
    const bookingId = req.params.bookingId || 'unknown';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `image-${bookingId}-${timestamp}${ext}`);
  },
});

const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
});

// Completed design upload configuration
const designStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, designsDir);
  },
  filename: (req, file, cb) => {
    const bookingId = req.params.bookingId || 'unknown';
    const revisionNumber = req.body.revisionNumber || '0';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `design-${bookingId}-rev${revisionNumber}-${timestamp}${ext}`);
  },
});

const uploadDesign = multer({
  storage: designStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
});

// Legacy artwork upload configuration (kept for backward compatibility)
const storage_multer = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const bookingId = req.params.bookingId || 'unknown';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${bookingId}-${timestamp}${ext}`);
  },
});

const upload = multer({
  storage: storage_multer,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      // Return false and handle the error in the route handler
      cb(null, false);
    }
  },
});

export function registerRoutes(app: Express): Server {
  // sets up /api/register, /api/login, /api/logout, /api/user
  setupAuth(app);

  // Routes
  app.get("/api/routes", async (req, res) => {
    try {
      const routes = await storage.getAllRoutes();
      res.json(routes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch routes" });
    }
  });

  app.post("/api/routes", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const routeValidationSchema = insertRouteSchema.extend({
        householdCount: z.number().int().min(1, "Household count must be at least 1"),
      });
      const routeData = routeValidationSchema.parse(req.body);
      
      // Check if zip code already exists
      const allRoutes = await storage.getAllRoutes();
      const existingRoute = allRoutes.find(r => r.zipCode === routeData.zipCode);
      if (existingRoute) {
        return res.status(400).json({ message: "Zip code already exists" });
      }

      const route = await storage.createRoute(routeData);
      res.status(201).json(route);
    } catch (error) {
      if ((error as Error).name === "ZodError") {
        return res.status(400).json({ message: "Invalid route data", errors: (error as any).errors });
      }
      res.status(500).json({ message: "Failed to create route" });
    }
  });

  app.put("/api/routes/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const routeValidationSchema = insertRouteSchema.extend({
        householdCount: z.number().int().min(1, "Household count must be at least 1"),
      }).partial();
      const routeData = routeValidationSchema.parse(req.body);
      
      // If updating zip code, check for uniqueness
      if (routeData.zipCode) {
        const allRoutes = await storage.getAllRoutes();
        const existingRoute = allRoutes.find(r => r.zipCode === routeData.zipCode && r.id !== req.params.id);
        if (existingRoute) {
          return res.status(400).json({ message: "Zip code already exists" });
        }
      }

      const updatedRoute = await storage.updateRoute(req.params.id, routeData);
      if (!updatedRoute) {
        return res.status(404).json({ message: "Route not found" });
      }
      res.json(updatedRoute);
    } catch (error) {
      if ((error as Error).name === "ZodError") {
        return res.status(400).json({ message: "Invalid route data", errors: (error as any).errors });
      }
      res.status(500).json({ message: "Failed to update route" });
    }
  });

  app.delete("/api/routes/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const deleted = await storage.deleteRoute(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Route not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete route" });
    }
  });

  // Industries
  app.get("/api/industries", async (req, res) => {
    try {
      const industries = await storage.getAllIndustries();
      res.json(industries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch industries" });
    }
  });

  app.post("/api/industries", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const industryValidationSchema = insertIndustrySchema.extend({
        name: z.string().min(1, "Industry name is required"),
        description: z.string().optional(),
        status: z.enum(["active", "inactive"]).default("active"),
      });
      const industryData = industryValidationSchema.parse(req.body);
      
      // Check if industry name already exists
      const allIndustries = await storage.getAllIndustries();
      const existingIndustry = allIndustries.find(i => i.name.toLowerCase() === industryData.name.toLowerCase());
      if (existingIndustry) {
        return res.status(400).json({ message: "Industry name already exists" });
      }

      const industry = await storage.createIndustry(industryData);
      res.status(201).json(industry);
    } catch (error) {
      if ((error as Error).name === "ZodError") {
        return res.status(400).json({ message: "Invalid industry data", errors: (error as any).errors });
      }
      res.status(500).json({ message: "Failed to create industry" });
    }
  });

  app.put("/api/industries/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const industryValidationSchema = insertIndustrySchema.extend({
        name: z.string().min(1, "Industry name is required"),
        description: z.string().optional(),
        status: z.enum(["active", "inactive"]),
      }).partial();
      const industryData = industryValidationSchema.parse(req.body);
      
      // If updating name, check for uniqueness
      if (industryData.name) {
        const allIndustries = await storage.getAllIndustries();
        const existingIndustry = allIndustries.find(i => 
          i.name.toLowerCase() === industryData.name?.toLowerCase() && i.id !== req.params.id
        );
        if (existingIndustry) {
          return res.status(400).json({ message: "Industry name already exists" });
        }
      }

      const updatedIndustry = await storage.updateIndustry(req.params.id, industryData);
      if (!updatedIndustry) {
        return res.status(404).json({ message: "Industry not found" });
      }
      res.json(updatedIndustry);
    } catch (error) {
      if ((error as Error).name === "ZodError") {
        return res.status(400).json({ message: "Invalid industry data", errors: (error as any).errors });
      }
      res.status(500).json({ message: "Failed to update industry" });
    }
  });

  app.delete("/api/industries/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const deleted = await storage.deleteIndustry(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Industry not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete industry" });
    }
  });

  // Industry Subcategories
  app.get("/api/industries/:industryId/subcategories", async (req, res) => {
    try {
      const subcategories = await storage.getSubcategoriesByIndustry(req.params.industryId);
      res.json(subcategories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch subcategories" });
    }
  });

  app.get("/api/subcategories", async (req, res) => {
    try {
      const subcategories = await storage.getAllSubcategories();
      res.json(subcategories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch subcategories" });
    }
  });

  // Campaigns
  app.get("/api/campaigns", async (req, res) => {
    try {
      const campaigns = await storage.getAllCampaigns();
      
      // Add available routes and industries for each campaign
      const campaignsWithAvailability = await Promise.all(
        campaigns.map(async (campaign) => {
          const [availableRoutes, availableIndustries] = await Promise.all([
            storage.getCampaignRoutes(campaign.id),
            storage.getCampaignIndustries(campaign.id),
          ]);
          
          return {
            ...campaign,
            availableRouteIds: availableRoutes.map(r => r.id),
            availableIndustryIds: availableIndustries.map(i => i.id),
          };
        })
      );
      
      res.json(campaignsWithAvailability);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  app.get("/api/campaigns/:id", async (req, res) => {
    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch campaign" });
    }
  });

  app.post("/api/campaigns", async (req, res) => {
    console.log("🔍 POST /api/campaigns auth check:", {
      isAuthenticated: req.isAuthenticated(),
      hasUser: !!req.user,
      userRole: req.user?.role,
      userId: req.user?.id,
      hasSession: !!req.session,
      sessionID: req.sessionID,
    });
    
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      console.log("❌ Auth failed - returning 403");
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      console.log("📅 Received campaign data:", req.body);
      
      const campaignValidationSchema = insertCampaignSchema.extend({
        name: z.string().min(1, "Campaign name is required").max(100, "Campaign name too long"),
        mailDate: z.string().transform((val) => {
          const parsed = parseDateAtNoonAKST(val);
          console.log(`📅 Parsed mailDate: "${val}" -> ${parsed.toISOString()} (${parsed})`);
          return parsed;
        }).refine((date) => {
          const now = new Date();
          return date > now;
        }, "Mail date must be in the future"),
        printDeadline: z.string().transform((val) => {
          const parsed = parseDateAtNoonAKST(val);
          console.log(`📅 Parsed printDeadline: "${val}" -> ${parsed.toISOString()} (${parsed})`);
          return parsed;
        }).refine((date) => {
          const now = new Date();
          return date > now;
        }, "Print deadline must be in the future"),
        status: z.enum(["planning", "booking_open", "booking_closed", "printed", "mailed", "completed"]).default("planning"),
        baseSlotPrice: z.number().int().positive().optional().nullable(),
      }).refine((data) => {
        return data.printDeadline < data.mailDate;
      }, {
        message: "Print deadline must be before mail date",
        path: ["printDeadline"],
      });
      
      const campaignData = campaignValidationSchema.parse(req.body);
      console.log("📅 Validated campaign data:", {
        mailDate: campaignData.mailDate,
        printDeadline: campaignData.printDeadline,
      });
      
      // Check for duplicate mail dates (only one campaign per month)
      const allCampaigns = await storage.getAllCampaigns();
      const mailDate = campaignData.mailDate;
      const existingCampaign = allCampaigns.find(c => {
        const existingDate = new Date(c.mailDate);
        return existingDate.getFullYear() === mailDate.getFullYear() && 
               existingDate.getMonth() === mailDate.getMonth();
      });
      
      if (existingCampaign) {
        return res.status(400).json({ message: "A campaign already exists for this month" });
      }

      const campaign = await storage.createCampaign(campaignData);
      res.status(201).json(campaign);
    } catch (error) {
      console.error("❌ Campaign creation error:", error);
      if ((error as Error).name === "ZodError") {
        return res.status(400).json({ message: "Invalid campaign data", errors: (error as any).errors });
      }
      res.status(500).json({ message: "Failed to create campaign", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.put("/api/campaigns/:id", async (req, res) => {
    console.log("🔍 PUT /api/campaigns/:id auth check:", {
      isAuthenticated: req.isAuthenticated(),
      hasUser: !!req.user,
      userRole: req.user?.role,
      userId: req.user?.id,
      hasSession: !!req.session,
      sessionID: req.sessionID,
    });
    
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      console.log("❌ Auth failed - returning 403");
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const campaignValidationSchema = insertCampaignSchema.extend({
        name: z.string().min(1, "Campaign name is required").max(100, "Campaign name too long"),
        mailDate: z.string().transform((val) => parseDateAtNoonAKST(val)).refine((date) => {
          const now = new Date();
          return date > now;
        }, "Mail date must be in the future"),
        printDeadline: z.string().transform((val) => parseDateAtNoonAKST(val)).refine((date) => {
          const now = new Date();
          return date > now;
        }, "Print deadline must be in the future"),
        status: z.enum(["planning", "booking_open", "booking_closed", "printed", "mailed", "completed"]),
        baseSlotPrice: z.number().int().positive().optional().nullable(),
      }).partial().refine((data) => {
        if (data.printDeadline && data.mailDate) {
          return data.printDeadline < data.mailDate;
        }
        return true;
      }, {
        message: "Print deadline must be before mail date",
        path: ["printDeadline"],
      });
      
      const campaignData = campaignValidationSchema.parse(req.body);
      
      // Validate status transitions and workflow rules
      const existingCampaign = await storage.getCampaign(req.params.id);
      if (!existingCampaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      if (campaignData.status && campaignData.status !== existingCampaign.status) {
        const validTransitions: Record<string, string[]> = {
          "planning": ["booking_open"],
          "booking_open": ["booking_closed"],
          "booking_closed": ["printed"],
          "printed": ["mailed"],
          "mailed": ["completed"],
          "completed": []
        };
        
        const allowedNext = validTransitions[existingCampaign.status];
        if (!allowedNext.includes(campaignData.status)) {
          return res.status(400).json({ 
            message: `Invalid status transition from ${existingCampaign.status} to ${campaignData.status}` 
          });
        }
      }
      
      // Prevent modifications of certain fields once campaign is booking closed or later
      if (["booking_closed", "printed", "mailed", "completed"].includes(existingCampaign.status)) {
        if (campaignData.name || campaignData.mailDate || campaignData.printDeadline) {
          return res.status(400).json({ 
            message: "Cannot modify campaign name, mail date, or print deadline after booking is closed" 
          });
        }
      }
      
      // Check for duplicate mail dates if updating mailDate
      if (campaignData.mailDate) {
        const allCampaigns = await storage.getAllCampaigns();
        const mailDate = campaignData.mailDate;
        const existingCampaign = allCampaigns.find(c => {
          const existingDate = new Date(c.mailDate);
          return existingDate.getFullYear() === mailDate.getFullYear() && 
                 existingDate.getMonth() === mailDate.getMonth() &&
                 c.id !== req.params.id;
        });
        
        if (existingCampaign) {
          return res.status(400).json({ message: "A campaign already exists for this month" });
        }
      }

      const updatedCampaign = await storage.updateCampaign(req.params.id, campaignData);
      if (!updatedCampaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      res.json(updatedCampaign);
    } catch (error) {
      if ((error as Error).name === "ZodError") {
        return res.status(400).json({ message: "Invalid campaign data", errors: (error as any).errors });
      }
      res.status(500).json({ message: "Failed to update campaign" });
    }
  });

  app.delete("/api/campaigns/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      // Check if campaign exists first
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      // Prevent deletion of campaigns that are booking closed or later in workflow
      if (["booking_closed", "printed", "mailed", "completed"].includes(campaign.status)) {
        return res.status(400).json({ 
          message: "Cannot delete campaigns that are booking closed or later in the workflow" 
        });
      }

      // Check for active (paid) bookings - don't allow deletion if there are still active bookings
      const allBookings = await storage.getAllBookings();
      const activeBookings = allBookings.filter(
        b => b.campaignId === req.params.id && b.paymentStatus === "paid" && b.status !== "cancelled"
      );
      
      if (activeBookings.length > 0) {
        return res.status(400).json({ 
          message: `Cannot delete campaign - there are ${activeBookings.length} active booking(s). Cancel all bookings first.`
        });
      }

      const deleted = await storage.deleteCampaign(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting campaign:", error);
      res.status(500).json({ message: "Failed to delete campaign" });
    }
  });

  // Recalculate campaign stats (fix out-of-sync booked slots and revenue)
  app.post("/api/campaigns/:id/recalculate", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const campaign = await storage.recalculateCampaignStats(req.params.id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      console.error("❌ Campaign recalculate error:", error);
      res.status(500).json({ message: "Failed to recalculate campaign stats" });
    }
  });

  // Recalculate ALL campaign stats (batch fix)
  app.post("/api/campaigns/recalculate-all", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const campaigns = await storage.getAllCampaigns();
      const results = await Promise.all(
        campaigns.map(c => storage.recalculateCampaignStats(c.id))
      );
      res.json({ 
        message: `Recalculated stats for ${results.length} campaigns`,
        campaigns: results.filter(Boolean)
      });
    } catch (error) {
      console.error("❌ Batch campaign recalculate error:", error);
      res.status(500).json({ message: "Failed to recalculate campaign stats" });
    }
  });

  app.post("/api/campaigns/:id/reopen", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      // Only allow reopening from booking_closed or later statuses
      const allowedStatuses = ["booking_closed", "printed", "mailed", "completed"];
      if (!allowedStatuses.includes(campaign.status)) {
        return res.status(400).json({ 
          message: "Only campaigns that are booking closed or later can be reopened" 
        });
      }
      
      // Check that print deadline is still in the future
      const now = new Date();
      const printDeadline = new Date(campaign.printDeadline);
      if (printDeadline <= now) {
        return res.status(400).json({ 
          message: "Cannot reopen campaign - print deadline has passed" 
        });
      }
      
      // Get count of existing bookings for this campaign
      const allBookings = await storage.getAllBookings();
      const existingBookingsCount = allBookings.filter(
        b => b.campaignId === req.params.id && b.paymentStatus === "paid"
      ).length;
      
      // Update status to booking_open
      const updatedCampaign = await storage.updateCampaign(req.params.id, {
        status: "booking_open"
      });
      
      res.json({
        campaign: updatedCampaign,
        existingBookingsCount
      });
    } catch (error) {
      console.error("❌ Campaign reopen error:", error);
      res.status(500).json({ message: "Failed to reopen campaign" });
    }
  });

  // Campaign Routes and Industries Management
  app.get("/api/campaigns/:id/routes", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      const routes = await storage.getCampaignRoutes(req.params.id);
      res.json(routes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch campaign routes" });
    }
  });

  app.put("/api/campaigns/:id/routes", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      const { routeIds } = req.body;
      if (!Array.isArray(routeIds)) {
        return res.status(400).json({ message: "routeIds must be an array" });
      }
      
      if (!routeIds.every(id => typeof id === 'string')) {
        return res.status(400).json({ message: "All routeIds must be strings" });
      }
      
      // Validate that all route IDs exist
      const allRoutes = await storage.getAllRoutes();
      const validRouteIds = new Set(allRoutes.map(r => r.id));
      const invalidIds = routeIds.filter(id => !validRouteIds.has(id));
      if (invalidIds.length > 0) {
        return res.status(400).json({ 
          message: "Invalid route IDs",
          invalidIds 
        });
      }
      
      await storage.setCampaignRoutes(req.params.id, routeIds);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to update campaign routes" });
    }
  });

  app.get("/api/campaigns/:id/industries", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      const industries = await storage.getCampaignIndustries(req.params.id);
      res.json(industries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch campaign industries" });
    }
  });

  app.put("/api/campaigns/:id/industries", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      const { industryIds } = req.body;
      if (!Array.isArray(industryIds)) {
        return res.status(400).json({ message: "industryIds must be an array" });
      }
      
      if (!industryIds.every(id => typeof id === 'string')) {
        return res.status(400).json({ message: "All industryIds must be strings" });
      }
      
      // Validate that all industry IDs exist
      const allIndustries = await storage.getAllIndustries();
      const validIndustryIds = new Set(allIndustries.map(i => i.id));
      const invalidIds = industryIds.filter(id => !validIndustryIds.has(id));
      if (invalidIds.length > 0) {
        return res.status(400).json({ 
          message: "Invalid industry IDs",
          invalidIds 
        });
      }
      
      await storage.setCampaignIndustries(req.params.id, industryIds);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to update campaign industries" });
    }
  });

  // Bookings
  app.get("/api/bookings", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      let bookings;
      if (req.user.role === "admin") {
        bookings = await storage.getAllBookings();
      } else {
        bookings = await storage.getBookingsByUser(req.user.id);
      }
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // Get booking by Stripe session ID (for confirmation page)
  app.get("/api/bookings/session/:sessionId", async (req, res) => {
    console.log("🔍 [Booking Retrieval] Request received for session:", req.params.sessionId);
    
    if (!req.isAuthenticated()) {
      console.log("❌ [Booking Retrieval] Unauthorized - user not authenticated");
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      console.log("🔍 [Booking Retrieval] Fetching booking for session:", req.params.sessionId);
      const booking = await storage.getBookingByStripeSessionId(req.params.sessionId);
      
      if (!booking) {
        console.log("❌ [Booking Retrieval] Booking not found for session:", req.params.sessionId);
        return res.status(404).json({ message: "Booking not found" });
      }

      console.log("✅ [Booking Retrieval] Found booking:", booking.id, "Payment status:", booking.paymentStatus);

      // Ensure user can only access their own bookings
      if (booking.userId !== req.user.id && req.user.role !== "admin") {
        console.log("❌ [Booking Retrieval] Access denied - user", req.user.id, "cannot access booking for user", booking.userId);
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(booking);
    } catch (error) {
      console.error("❌ [Booking Retrieval] Error:", error);
      res.status(500).json({ message: "Failed to fetch booking" });
    }
  });

  app.get("/api/campaigns/:campaignId/bookings", async (req, res) => {
    try {
      const bookings = await storage.getBookingsByCampaign(req.params.campaignId);
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch campaign bookings" });
    }
  });

  app.get("/api/availability/:campaignId/:routeId/:industryId", async (req, res) => {
    try {
      const { campaignId, routeId, industryId } = req.params;
      const { subcategoryId } = req.query;
      const industrySubcategoryId = subcategoryId as string | undefined;
      
      console.log("🔍 [Availability] Checking:", { campaignId, routeId, industryId, industrySubcategoryId });
      
      // Get the industry to check if it's "Other"
      const industry = await storage.getIndustry(industryId);
      
      // "Other" industry with NULL subcategory is always available since multiple businesses can select it
      const isOtherIndustryNoSubcategory = industry && industry.name === "Other" && !industrySubcategoryId;
      if (isOtherIndustryNoSubcategory) {
        console.log("✅ [Availability] 'Other' industry with no subcategory - always available");
        return res.json({ available: true });
      }
      
      const booking = await storage.getBooking(campaignId, routeId, industryId, industrySubcategoryId || null);
      console.log("✅ [Availability] Result:", { available: !booking, bookingFound: !!booking });
      res.json({ available: !booking });
    } catch (error) {
      console.error("❌ [Availability] Error:", error);
      res.status(500).json({ message: "Failed to check availability" });
    }
  });

  // Get pricing quote for a booking before checkout
  app.get("/api/pricing/quote", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { campaignId, quantity } = req.query;

      if (!campaignId || typeof campaignId !== 'string') {
        return res.status(400).json({ message: "Campaign ID is required" });
      }

      const qty = quantity ? parseInt(quantity as string) : 1;
      if (qty < 1 || qty > 4) {
        return res.status(400).json({ message: "Quantity must be between 1 and 4" });
      }

      const quote = await calculatePricingQuote(
        campaignId,
        req.user.id,
        qty
      );

      res.json(quote);
    } catch (error) {
      console.error("❌ [Pricing Quote] Error:", error);
      res.status(500).json({ message: "Failed to calculate pricing quote" });
    }
  });

  // Create Stripe Checkout session for booking payment
  app.post("/api/create-checkout-session", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    let loyaltyDiscountApplied = false; // Track for rollback in catch block

    try {
      // Inject server-side contract acceptance fields before validation
      // The frontend doesn't need to send these - we enforce them server-side
      const validatedData = insertBookingSchema.parse({
        ...req.body,
        userId: req.user.id,
        contractAccepted: true,
        contractAcceptedAt: new Date(),
        contractVersion: "v2025",
      });

      const quantity = validatedData.quantity || 1;

      // Check if campaign exists and is in booking_open status
      const campaign = await storage.getCampaign(validatedData.campaignId);
      if (!campaign) {
        return res.status(400).json({ message: "Campaign not found" });
      }
      
      if (campaign.status !== "booking_open") {
        return res.status(400).json({ 
          message: "Bookings are only allowed when campaign status is 'booking_open'" 
        });
      }

      // Validate subcategory belongs to selected industry (if provided)
      const industry = await storage.getIndustry(validatedData.industryId);
      if (!industry) {
        return res.status(400).json({ message: "Invalid industry" });
      }

      // Require subcategory if this industry has subcategories available (except "Other")
      const isOtherIndustry = industry.name.toLowerCase() === "other";
      if (!isOtherIndustry) {
        const availableSubcategories = await storage.getSubcategoriesByIndustry(validatedData.industryId);
        if (availableSubcategories.length > 0 && !validatedData.industrySubcategoryId) {
          return res.status(400).json({ message: "Please select a specialization for this industry" });
        }
      }

      if (validatedData.industrySubcategoryId) {
        const subcategory = await storage.getSubcategory(validatedData.industrySubcategoryId);
        if (!subcategory || subcategory.industryId !== validatedData.industryId) {
          return res.status(400).json({ message: "Invalid subcategory for the selected industry" });
        }
      }

      // Check if slot is already booked at subcategory level
      // "Other" industry with NULL subcategory allows multiple bookings
      const isOtherIndustryNoSubcategory = industry.name === "Other" && !validatedData.industrySubcategoryId;
      
      if (!isOtherIndustryNoSubcategory) {
        const existingBooking = await storage.getBooking(
          validatedData.campaignId,
          validatedData.routeId,
          validatedData.industryId,
          validatedData.industrySubcategoryId || null
        );

        if (existingBooking) {
          return res.status(400).json({ message: "Slot already booked" });
        }
      }

      // Calculate price using pricing service (considers all pricing rules and campaign base price)
      const pricingQuote = await calculatePricingQuote(
        validatedData.campaignId,
        req.user.id,
        quantity
      );

      console.log(`💲 [Booking Pricing] Quote for user ${req.user.username}:`, {
        totalPrice: `$${(pricingQuote.totalPrice / 100).toFixed(2)}`,
        priceSource: pricingQuote.priceSource,
        appliedRules: pricingQuote.appliedRules.length,
      });

      // Determine if loyalty discount was applied
      loyaltyDiscountApplied = pricingQuote.appliedRules.some(rule => rule.ruleId === 'loyalty-discount');
      
      // ATOMIC RESERVATION: If loyalty discount is being used, reserve it immediately
      // This prevents race conditions where multiple bookings see the same discount
      if (loyaltyDiscountApplied) {
        const currentUser = await storage.getUser(req.user.id);
        if (!currentUser || currentUser.loyaltyDiscountsAvailable <= 0) {
          // Discount no longer available (race condition), reject booking
          return res.status(400).json({ 
            message: "Loyalty discount is no longer available. Please refresh and try again at the current price." 
          });
        }
        
        // Reserve the discount immediately by decrementing available count
        await storage.updateUserLoyalty(req.user.id, {
          loyaltyDiscountsAvailable: currentUser.loyaltyDiscountsAvailable - 1,
        });
        
        console.log(`🎟️ [Loyalty] Reserved loyalty discount for user ${req.user.id}. Remaining: ${currentUser.loyaltyDiscountsAvailable - 1}`);
      }
      
      // Bookings count toward loyalty if paid at regular price (no user-specific discounts)
      // Campaign-wide discounts still count as "regular price"
      const countsTowardLoyalty = !loyaltyDiscountApplied && 
                                   pricingQuote.priceSource !== 'user_fixed' && 
                                   pricingQuote.priceSource !== 'user_discount';

      // Create booking with pending status until payment is confirmed
      // Note: Stripe checkout session is created separately via GET /api/bookings/:id/checkout-session
      // This allows admins to set price overrides before payment if needed
      const bookingData = {
        ...validatedData,
        amount: pricingQuote.totalPrice,
        basePriceBeforeDiscounts: pricingQuote.breakdown.basePrice,
        loyaltyDiscountApplied,
        countsTowardLoyalty,
        status: "pending",
        paymentStatus: "pending",
        pendingSince: new Date(), // Track when booking entered pending status for expiration
        // Contract acceptance fields already in validatedData (injected before validation)
      };
      
      console.log("🔍 [Debug] Creating booking with data:", {
        userId: bookingData.userId,
        campaignId: bookingData.campaignId,
        routeId: bookingData.routeId,
        industryId: bookingData.industryId,
        contractAccepted: bookingData.contractAccepted,
        contractVersion: bookingData.contractVersion,
      });
      
      const booking = await storage.createBooking(bookingData);

      // Record any pricing rules that were applied
      for (const rule of pricingQuote.appliedRules) {
        await recordPricingRuleApplication(rule.ruleId, booking.id, req.user.id);
        console.log(`📋 [Pricing Rule] Applied rule "${rule.description}" to booking ${booking.id}`);
      }

      console.log(`📝 [Booking] Created booking ${booking.id} for user ${req.user.username}, amount: $${(pricingQuote.totalPrice / 100).toFixed(2)}`);
      res.json({ 
        bookingId: booking.id,
        pricingQuote: {
          totalPrice: pricingQuote.totalPrice,
          breakdown: pricingQuote.breakdown,
          appliedRules: pricingQuote.appliedRules,
        }
      });
    } catch (error) {
      console.error("Booking creation error:", error);
      
      // ROLLBACK: If we reserved a loyalty discount but booking creation failed, release it back
      if (loyaltyDiscountApplied) {
        try {
          const currentUser = await storage.getUser(req.user.id);
          if (currentUser) {
            await storage.updateUserLoyalty(req.user.id, {
              loyaltyDiscountsAvailable: currentUser.loyaltyDiscountsAvailable + 1,
            });
            console.log(`🔄 [Loyalty Rollback] Released loyalty discount back to user ${req.user.id}. Available: ${currentUser.loyaltyDiscountsAvailable + 1}`);
          }
        } catch (rollbackError) {
          console.error("❌ [Loyalty Rollback] Failed to release discount:", rollbackError);
        }
      }
      
      res.status(400).json({ message: "Failed to create booking" });
    }
  });

  // Create Stripe Checkout Session for existing booking
  app.get("/api/bookings/:bookingId/checkout-session", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { bookingId } = req.params;
      
      // Fetch booking with all details
      const booking = await storage.getBookingById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Authorization: must be booking owner or admin
      if (booking.userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Not authorized to access this booking" });
      }

      // Only create checkout for pending payments
      if (booking.paymentStatus !== 'pending') {
        return res.status(400).json({ 
          message: `Cannot create checkout session for booking with payment status: ${booking.paymentStatus}` 
        });
      }

      // Calculate price: use manual override if set, otherwise use pricing service
      let finalAmount: number;
      if (booking.priceOverride !== null && booking.priceOverride !== undefined) {
        finalAmount = booking.priceOverride;
        console.log(`💲 [Checkout] Using manual price override: $${(finalAmount / 100).toFixed(2)} for booking ${bookingId}`);
      } else {
        // Use pricing service to calculate price (respects pricing rules and campaign base price)
        const pricingQuote = await calculatePricingQuote(
          booking.campaignId,
          booking.userId,
          booking.quantity || 1
        );
        finalAmount = pricingQuote.totalPrice;
        console.log(`💲 [Checkout] Using pricing service: $${(finalAmount / 100).toFixed(2)} for ${booking.quantity || 1} slot(s)`, {
          priceSource: pricingQuote.priceSource,
          appliedRules: pricingQuote.appliedRules.length,
        });
      }

      // Fetch campaign, route, and industry details for Stripe description
      const campaign = await storage.getCampaign(booking.campaignId);
      const route = await storage.getRoute(booking.routeId);
      const industry = await storage.getIndustry(booking.industryId);

      if (!campaign || !route || !industry) {
        return res.status(400).json({ message: "Campaign, route, or industry not found" });
      }

      const quantity = booking.quantity || 1;

      // Construct base URL with proper scheme
      const baseUrl = req.headers.origin?.startsWith('http') 
        ? req.headers.origin 
        : `https://${req.headers.host}`;

      // Create Stripe Checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Direct Mail Campaign - ${campaign.name}`,
                description: `Route: ${route.zipCode} - ${route.name} | Industry: ${industry.name} | ${quantity} slot${quantity > 1 ? 's' : ''}${booking.priceOverride ? ' (Custom Price)' : ''}`,
              },
              unit_amount: finalAmount,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${baseUrl}/customer/confirmation?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/customer/dashboard`,
        customer_email: booking.contactEmail,
        metadata: {
          bookingId: booking.id,
          campaignId: booking.campaignId,
          userId: booking.userId,
          quantity: quantity.toString(),
          priceOverride: booking.priceOverride ? 'true' : 'false',
        },
      });

      // Update booking with Stripe session ID, refresh contract acceptance, and reset pending timer
      // This ensures contract acceptance is current and gives user fresh 15 minutes for payment
      await storage.updateBooking(booking.id, {
        stripeCheckoutSessionId: session.id,
        contractAccepted: true,
        contractAcceptedAt: new Date(),
        contractVersion: "v2025",
        pendingSince: new Date(), // Reset 15-minute expiration timer when retrying payment
      });
      
      console.log(`📋 [Contract] Refreshed contract acceptance and reset payment timer for booking ${bookingId}`);

      console.log(`✅ [Checkout] Created session ${session.id} for booking ${bookingId}, amount: $${(finalAmount / 100).toFixed(2)}`);
      res.json({ sessionUrl: session.url });
    } catch (error) {
      console.error("❌ [Checkout] Session creation error:", error);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  // Multi-campaign bulk booking checkout endpoint
  app.post("/api/multi-campaign-checkout", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { selections } = req.body;
      
      if (!selections || !Array.isArray(selections) || selections.length === 0) {
        return res.status(400).json({ message: "At least one campaign selection is required" });
      }

      if (selections.length > 3) {
        return res.status(400).json({ message: "Maximum 3 campaigns allowed per bulk booking" });
      }

      // Validate all selections and create bookings
      const bookingIds: string[] = [];
      const lineItems = [];

      for (const selection of selections) {
        // Validate selection
        const validatedData = insertBookingSchema.parse({
          ...selection,
          userId: req.user.id,
          quantity: 1, // Multi-campaign bookings are always 1 slot per campaign
        });

        // Check campaign exists and is open for booking
        const campaign = await storage.getCampaign(validatedData.campaignId);
        if (!campaign) {
          return res.status(400).json({ message: `Campaign not found: ${validatedData.campaignId}` });
        }

        if (campaign.status !== "booking_open") {
          return res.status(400).json({ 
            message: `Campaign "${campaign.name}" is not open for bookings` 
          });
        }

        // Check slot availability (except for "Other" industry)
        const industry = await storage.getIndustry(validatedData.industryId);
        if (!industry || industry.name !== "Other") {
          const existingBooking = await storage.getBooking(
            validatedData.campaignId,
            validatedData.routeId,
            validatedData.industryId
          );

          if (existingBooking) {
            return res.status(400).json({ 
              message: `Slot already booked for campaign "${campaign.name}"` 
            });
          }
        }

        // Calculate individual slot price (will be $600 for first, $450 for subsequent if 3 campaigns)
        const isFirstSlot = bookingIds.length === 0;
        const slotPrice = (selections.length === 3 && !isFirstSlot) ? 45000 : 60000; // $450 or $600 in cents
        const basePrice = 60000; // Regular price without bulk discount is always $600

        // Create booking with pricing metadata
        // Multi-campaign bookings always count toward loyalty (bulk discount doesn't prevent it)
        const booking = await storage.createBooking({
          ...validatedData,
          amount: slotPrice,
          basePriceBeforeDiscounts: basePrice,
          loyaltyDiscountApplied: false, // No loyalty discount in multi-campaign bookings
          countsTowardLoyalty: true, // Bulk discount doesn't prevent loyalty rewards
          status: "confirmed",
          paymentStatus: "pending",
          contractAccepted: true, // Contract must be accepted via frontend checkbox
          contractAcceptedAt: new Date(),
          contractVersion: "v2025",
        });

        bookingIds.push(booking.id);

        // Prepare Stripe line item
        const route = await storage.getRoute(validatedData.routeId);
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Direct Mail Campaign - ${campaign.name}`,
              description: `Route: ${route?.zipCode} - ${route?.name} | Industry: ${industry?.name}`,
            },
            unit_amount: slotPrice,
          },
          quantity: 1,
        });
      }

      // Calculate total and apply bulk discount if 3 campaigns
      const subtotal = lineItems.reduce((sum, item) => sum + item.price_data.unit_amount, 0);
      const bulkDiscount = selections.length === 3 ? 30000 : 0; // $300 in cents
      const finalTotal = subtotal - bulkDiscount;

      // Note: Stripe doesn't support negative line items directly
      // For 3 campaigns bulk discount, we already priced them as $600, $450, $450 = $1500 total
      // The discount is effectively already applied in the individual slot prices
      // No need to add a separate discount line item since $600 + $450 + $450 = $1500 (not $1800)

      // Construct base URL
      const baseUrl = req.headers.origin?.startsWith('http') 
        ? req.headers.origin 
        : `https://${req.headers.host}`;

      // Create Stripe Checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${baseUrl}/customer/confirmation?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/customer/booking/multi`,
        customer_email: req.user.email,
        metadata: {
          bookingIds: bookingIds.join(','),
          userId: req.user.id,
          campaignCount: selections.length.toString(),
          bulkDiscount: bulkDiscount > 0 ? 'true' : 'false',
          multiCampaignBooking: 'true',
        },
      });

      // Update all bookings with Stripe session ID
      for (const bookingId of bookingIds) {
        await storage.updateBooking(bookingId, {
          stripeCheckoutSessionId: session.id,
        });
      }

      console.log(`✅ [Multi-Campaign Checkout] Created session ${session.id} for ${bookingIds.length} bookings, total: $${(finalTotal / 100).toFixed(2)}`);
      res.json({ sessionUrl: session.url, bookingIds });
    } catch (error) {
      console.error("❌ [Multi-Campaign Checkout] Error:", error);
      res.status(500).json({ message: "Failed to create multi-campaign checkout session" });
    }
  });

  // Stripe webhook endpoint for payment events
  app.post("/api/stripe-webhook", async (req, res) => {
    console.log("🔔 [Stripe Webhook] Received webhook event");
    const sig = req.headers['stripe-signature'];
    
    if (!sig) {
      console.log("❌ [Stripe Webhook] No signature provided");
      return res.status(400).send('No signature');
    }

    let event;

    try {
      // Note: In production, you should use webhook secrets for verification
      // For now, we'll parse the event directly
      event = req.body;
      console.log("📦 [Stripe Webhook] Event type:", event.type);
    } catch (err) {
      console.error('❌ [Stripe Webhook] Error parsing event:', err);
      return res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        const isMultiCampaign = session.metadata?.multiCampaignBooking === 'true';
        
        if (isMultiCampaign) {
          // Handle multi-campaign booking
          const bookingIds = session.metadata?.bookingIds?.split(',') || [];
          console.log("✅ [Stripe Webhook] Multi-campaign checkout completed for bookings:", bookingIds);
          console.log("💳 [Stripe Webhook] Session ID:", session.id);
          console.log("💰 [Stripe Webhook] Total Amount:", session.amount_total);

          if (bookingIds.length > 0) {
            let totalSlotsBooked = 0;
            let userId: string | null = null;

            // Update all bookings and process loyalty tracking per booking
            for (const bookingId of bookingIds) {
              const booking = await storage.getBookingById(bookingId);
              if (booking) {
                await storage.updateBookingPaymentStatus(bookingId, 'paid', {
                  stripePaymentIntentId: session.payment_intent as string,
                  amountPaid: booking.amount, // Each booking has its own amount
                  paidAt: new Date(),
                });
                
                // Refresh contract acceptance timestamp for legal compliance
                await storage.updateBooking(bookingId, {
                  contractAcceptedAt: new Date(),
                  pendingSince: null, // Clear pending status since payment is complete
                });
                
                totalSlotsBooked += (booking.quantity || 1);
                userId = booking.userId;
                
                console.log(`✅ [Stripe Webhook] Payment successful for booking ${bookingId}, amount: $${(booking.amount / 100).toFixed(2)}`);
                
                // Process loyalty tracking for this booking (counts as 1 purchase regardless of slots)
                await processLoyaltyTracking(booking.userId, booking.id, booking.quantity || 1, booking.amount);
              }
            }
          }
        } else {
          // Handle single booking
          const bookingId = session.metadata?.bookingId;
          console.log("✅ [Stripe Webhook] Checkout completed for booking:", bookingId);
          console.log("💳 [Stripe Webhook] Session ID:", session.id);
          console.log("💰 [Stripe Webhook] Amount:", session.amount_total);

          if (bookingId) {
            // Update booking payment status to paid and refresh contract acceptance
            await storage.updateBookingPaymentStatus(bookingId, 'paid', {
              stripePaymentIntentId: session.payment_intent as string,
              amountPaid: session.amount_total,
              paidAt: new Date(),
            });
            
            // Refresh contract acceptance timestamp for legal compliance
            await storage.updateBooking(bookingId, {
              contractAcceptedAt: new Date(),
              pendingSince: null, // Clear pending status since payment is complete
            });
            
            console.log(`✅ [Stripe Webhook] Payment successful for booking ${bookingId}`);
            
            // Process loyalty program tracking
            const booking = await storage.getBookingById(bookingId);
            if (booking) {
              await processLoyaltyTracking(booking.userId, booking.id, booking.quantity || 1, session.amount_total);
            }
          } else {
            console.log("❌ [Stripe Webhook] No booking ID in metadata");
          }
        }
        break;

      case 'checkout.session.expired':
        const expiredSession = event.data.object;
        const isExpiredMultiCampaign = expiredSession.metadata?.multiCampaignBooking === 'true';
        
        if (isExpiredMultiCampaign) {
          // Handle multi-campaign booking expiration
          const expiredBookingIds = expiredSession.metadata?.bookingIds?.split(',') || [];
          console.log("⏱️  [Stripe Webhook] Checkout session expired for multi-campaign bookings:", expiredBookingIds);
          
          // Delete all abandoned bookings
          for (const bookingId of expiredBookingIds) {
            await storage.deleteBooking(bookingId);
            console.log(`🗑️  [Stripe Webhook] Deleted abandoned booking ${bookingId}`);
          }
        } else {
          // Handle single booking expiration
          const expiredBookingId = expiredSession.metadata?.bookingId;
          console.log("⏱️  [Stripe Webhook] Checkout session expired for booking:", expiredBookingId);
          
          if (expiredBookingId) {
            // Delete the abandoned booking
            await storage.deleteBooking(expiredBookingId);
            console.log(`🗑️  [Stripe Webhook] Deleted abandoned booking ${expiredBookingId}`);
          }
        }
        break;

      case 'payment_intent.payment_failed':
        const failedSession = event.data.object;
        const failedBookingId = failedSession.metadata?.bookingId;
        console.log("❌ [Stripe Webhook] Payment failed for booking:", failedBookingId);

        if (failedBookingId) {
          // Update booking payment status to failed (keep the booking for admin review)
          await storage.updateBookingPaymentStatus(failedBookingId, 'failed', {});
          console.log(`❌ [Stripe Webhook] Payment failed for booking ${failedBookingId}`);
        }
        break;

      default:
        console.log(`ℹ️ [Stripe Webhook] Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  });

  // Verify Stripe payment status and update booking
  // This endpoint is called by the confirmation page after redirect from Stripe
  // In test/dev mode, webhooks aren't automatically triggered, so we manually verify
  app.post("/api/stripe-verify-session", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID is required" });
      }

      console.log("🔍 [Stripe Verify] Retrieving session:", sessionId);

      // Retrieve the session from Stripe
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      console.log("📦 [Stripe Verify] Session status:", session.payment_status);
      console.log("💳 [Stripe Verify] Session metadata:", session.metadata);

      const isMultiCampaign = session.metadata?.multiCampaignBooking === 'true';
      
      if (isMultiCampaign) {
        // Handle multi-campaign booking verification
        const bookingIds = session.metadata?.bookingIds?.split(',') || [];
        
        if (bookingIds.length === 0) {
          return res.status(400).json({ message: "No booking IDs in session metadata" });
        }

        // Verify user owns these bookings
        const bookings = await Promise.all(bookingIds.map(id => storage.getBookingById(id)));
        const unauthorizedBooking = bookings.find(b => !b || b.userId !== req.user.id);
        
        if (unauthorizedBooking) {
          return res.status(403).json({ message: "Not authorized to access these bookings" });
        }

        // Update all bookings if payment was successful
        let updated = false;
        if (session.payment_status === 'paid') {
          for (const bookingId of bookingIds) {
            const booking = await storage.getBookingById(bookingId);
            if (booking && booking.paymentStatus === 'pending') {
              await storage.updateBookingPaymentStatus(bookingId, 'paid', {
                stripePaymentIntentId: session.payment_intent as string,
                amountPaid: booking.amount,
                paidAt: new Date(),
              });
              updated = true;
              console.log(`✅ [Stripe Verify] Booking ${bookingId} payment status updated to paid`);
              
              // Process loyalty tracking for this booking
              await processLoyaltyTracking(booking.userId, booking.id, booking.quantity || 1, session.amount_total ?? 0);
            }
          }
        }

        res.json({ 
          paymentStatus: session.payment_status,
          bookingIds: bookingIds,
          multiCampaign: true,
          updated
        });
      } else {
        // Handle single booking verification
        const bookingId = session.metadata?.bookingId;
        
        if (!bookingId) {
          return res.status(400).json({ message: "No booking ID in session metadata" });
        }

        // Verify user owns this booking
        const booking = await storage.getBookingById(bookingId);
        if (!booking || booking.userId !== req.user.id) {
          return res.status(403).json({ message: "Not authorized to access this booking" });
        }

        // If payment was successful and booking is still pending, update it
        if (session.payment_status === 'paid' && booking.paymentStatus === 'pending') {
          console.log("✅ [Stripe Verify] Payment confirmed, updating booking:", bookingId);
          
          await storage.updateBookingPaymentStatus(bookingId, 'paid', {
            stripePaymentIntentId: session.payment_intent as string,
            amountPaid: session.amount_total ?? 0,
            paidAt: new Date(),
          });

          console.log(`✅ [Stripe Verify] Booking ${bookingId} payment status updated to paid`);
          
          // Process loyalty tracking
          await processLoyaltyTracking(booking.userId, booking.id, booking.quantity || 1, session.amount_total ?? 0);
        }

        res.json({ 
          paymentStatus: session.payment_status,
          bookingId: bookingId,
          multiCampaign: false,
          updated: session.payment_status === 'paid' && booking.paymentStatus === 'pending'
        });
      }
    } catch (error) {
      console.error("❌ [Stripe Verify] Error verifying session:", error);
      res.status(500).json({ message: "Failed to verify payment session" });
    }
  });

  app.post("/api/bookings", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const validatedData = insertBookingSchema.parse({
        ...req.body,
        userId: req.user.id,
      });

      // Check if campaign exists and is in booking_open status
      const campaign = await storage.getCampaign(validatedData.campaignId);
      if (!campaign) {
        return res.status(400).json({ message: "Campaign not found" });
      }
      
      if (campaign.status !== "booking_open") {
        return res.status(400).json({ 
          message: "Bookings are only allowed when campaign status is 'booking_open'" 
        });
      }

      // Validate subcategory belongs to selected industry (if provided)
      const industry = await storage.getIndustry(validatedData.industryId);
      if (!industry) {
        return res.status(400).json({ message: "Invalid industry" });
      }

      // Require subcategory if this industry has subcategories available (except "Other")
      const isOtherIndustry = industry.name.toLowerCase() === "other";
      if (!isOtherIndustry) {
        const availableSubcategories = await storage.getSubcategoriesByIndustry(validatedData.industryId);
        if (availableSubcategories.length > 0 && !validatedData.industrySubcategoryId) {
          return res.status(400).json({ message: "Please select a specialization for this industry" });
        }
      }

      if (validatedData.industrySubcategoryId) {
        const subcategory = await storage.getSubcategory(validatedData.industrySubcategoryId);
        if (!subcategory || subcategory.industryId !== validatedData.industryId) {
          return res.status(400).json({ message: "Invalid subcategory for the selected industry" });
        }
      }

      // Check if slot is already booked at subcategory level
      // "Other" industry with NULL subcategory allows multiple bookings
      const isOtherIndustryNoSubcategory = industry.name === "Other" && !validatedData.industrySubcategoryId;
      
      if (!isOtherIndustryNoSubcategory) {
        const existingBooking = await storage.getBooking(
          validatedData.campaignId,
          validatedData.routeId,
          validatedData.industryId,
          validatedData.industrySubcategoryId || null
        );

        if (existingBooking) {
          return res.status(400).json({ message: "Slot already booked" });
        }
      }

      // Mock payment processing (legacy endpoint, kept for backwards compatibility)
      const paymentId = `mock_payment_${Date.now()}`;
      
      // For legacy endpoint, assume regular price and counts toward loyalty
      const bookingAmount = validatedData.amount || 60000;
      
      const booking = await storage.createBooking({
        ...validatedData,
        paymentId,
        basePriceBeforeDiscounts: bookingAmount, // Legacy: no discount tracking
        loyaltyDiscountApplied: false,
        countsTowardLoyalty: true, // Legacy bookings count toward loyalty
        status: "confirmed",
        contractAccepted: true, // Contract must be accepted via frontend checkbox
        contractAcceptedAt: new Date(),
        contractVersion: "v2025",
      });

      // Update campaign revenue after successful booking
      await storage.updateCampaign(validatedData.campaignId, {
        revenue: campaign.revenue + bookingAmount
      });

      res.status(201).json(booking);
    } catch (error) {
      console.error("Booking error:", error);
      res.status(400).json({ message: "Invalid booking data" });
    }
  });

  // Get refund calculation preview for a booking
  app.get("/api/bookings/:bookingId/refund-preview", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { bookingId } = req.params;
      
      // Get booking with campaign details
      const booking = await storage.getBookingById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Verify user owns this booking
      if (booking.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to view this booking" });
      }

      // Check if booking is eligible for cancellation
      if (booking.status === 'cancelled') {
        return res.status(400).json({ message: "Booking is already cancelled" });
      }

      if (booking.paymentStatus !== 'paid') {
        return res.json({
          eligible: false,
          message: "Only paid bookings are eligible for refunds",
          originalAmount: 0,
          processingFee: 0,
          netRefund: 0,
        });
      }

      // Get campaign to check print deadline
      const campaign = await storage.getCampaign(booking.campaignId);
      if (!campaign || !campaign.printDeadline) {
        return res.status(400).json({ 
          message: "Campaign information unavailable" 
        });
      }

      // Calculate days until print deadline
      const now = new Date();
      const printDeadline = new Date(campaign.printDeadline);
      const daysUntilDeadline = Math.ceil((printDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Check refund eligibility (7+ days before print deadline)
      const isEligible = daysUntilDeadline >= 7;
      
      if (!isEligible) {
        return res.json({
          eligible: false,
          message: `Cancellations must be made at least 7 days before the print deadline. Only ${daysUntilDeadline} days remaining.`,
          originalAmount: booking.amountPaid || booking.amount,
          processingFee: 0,
          netRefund: 0,
          daysUntilDeadline,
        });
      }

      // Calculate refund breakdown
      const originalAmount = booking.amountPaid || booking.amount;
      const percentageFee = Math.round(originalAmount * 0.029); // 2.9% in cents
      const flatFee = 30; // $0.30 in cents
      const processingFee = percentageFee + flatFee;
      const netRefund = Math.max(0, originalAmount - processingFee);

      res.json({
        eligible: true,
        message: netRefund > 0 
          ? "Your refund will be processed automatically upon cancellation."
          : "No refund available - processing fees consume the entire payment amount.",
        originalAmount,
        processingFee,
        netRefund,
        daysUntilDeadline,
      });
    } catch (error) {
      console.error("Refund preview error:", error);
      res.status(500).json({ message: "Failed to calculate refund preview" });
    }
  });

  // Cancel booking with refund logic
  app.post("/api/bookings/:bookingId/cancel", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { bookingId } = req.params;
      
      // Get booking with campaign details
      const booking = await storage.getBookingById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Verify user owns this booking (or is admin)
      if (booking.userId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ message: "Not authorized to cancel this booking" });
      }

      // Check if booking can be canceled
      if (booking.status === 'cancelled') {
        return res.status(400).json({ message: "Booking is already cancelled" });
      }

      if (booking.paymentStatus !== 'paid' && booking.paymentStatus !== 'pending') {
        return res.status(400).json({ message: "Only paid or pending bookings can be cancelled" });
      }

      // Get campaign to check print deadline
      const campaign = await storage.getCampaign(booking.campaignId);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      // Check if campaign has a print deadline
      if (!campaign.printDeadline) {
        return res.status(400).json({ 
          message: "Cannot process cancellation: Campaign print deadline not set. Please contact support." 
        });
      }

      // Calculate days until print deadline
      const now = new Date();
      const printDeadline = new Date(campaign.printDeadline);
      const daysUntilDeadline = Math.ceil((printDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      console.log(`📅 [Cancellation] Refund eligibility check:`, {
        bookingId,
        now: now.toISOString(),
        printDeadline: printDeadline.toISOString(),
        daysUntilDeadline,
        paymentStatus: booking.paymentStatus,
        meetsTimeRequirement: daysUntilDeadline >= 7,
        meetsPaidRequirement: booking.paymentStatus === 'paid',
      });

      // Determine refund eligibility (7+ days before print deadline)
      const isEligibleForRefund = daysUntilDeadline >= 7 && booking.paymentStatus === 'paid';
      const isAdminCancellation = req.user.role === 'admin';
      let refundAmount = 0;
      let refundStatus: 'pending' | 'processed' | 'no_refund' | 'failed' | 'pending_manual' = 'no_refund';
      let stripeFee = 0;
      let originalAmount = 0;

      // Process Stripe refund if eligible
      if (isEligibleForRefund && booking.stripePaymentIntentId) {
        originalAmount = booking.amountPaid || booking.amount;
        
        // Calculate Stripe processing fee: 2.9% + $0.30
        const percentageFee = Math.round(originalAmount * 0.029); // 2.9% in cents
        const flatFee = 30; // $0.30 in cents
        stripeFee = percentageFee + flatFee;
        
        // Calculate net refund amount (original amount - processing fee)
        const netRefundAmount = Math.max(0, originalAmount - stripeFee);
        
        console.log(`💰 [Cancellation] Refund calculation:`, {
          originalAmount,
          stripeFee,
          netRefundAmount,
          paymentIntent: booking.stripePaymentIntentId,
          isAdminCancellation,
        });

        // Admin cancellations: Mark as pending_manual (admin will issue full refund in Stripe dashboard)
        if (isAdminCancellation) {
          refundAmount = 0; // No automatic refund
          refundStatus = 'pending_manual';
          console.log(`🔧 [Cancellation] Admin-initiated cancellation - refund will be processed manually in Stripe dashboard`);
        } 
        // Customer cancellations: Automatic refund with fees deducted
        else {
          try {
            // Only process refund if there's a positive amount to refund after fees
            if (netRefundAmount > 0) {
              const refund = await stripe.refunds.create({
                payment_intent: booking.stripePaymentIntentId,
                amount: netRefundAmount, // Issue partial refund (minus fees)
                reason: 'requested_by_customer',
              });

              refundAmount = refund.amount;
              refundStatus = refund.status === 'succeeded' ? 'processed' : 'pending';
              console.log(`✅ [Cancellation] Customer automatic refund ${refundStatus}: $${(refundAmount / 100).toFixed(2)} (Original: $${(originalAmount / 100).toFixed(2)}, Fee: $${(stripeFee / 100).toFixed(2)})`);
            } else {
              // Amount is too small to issue a refund after fees
              console.log(`⚠️  [Cancellation] No refund available - processing fees consume entire payment ($${(originalAmount / 100).toFixed(2)} payment - $${(stripeFee / 100).toFixed(2)} fee = $0)`);
              refundAmount = 0;
              refundStatus = 'no_refund';
            }
          } catch (stripeError: any) {
            console.error("❌ [Cancellation] Stripe refund error:", stripeError.message);
            refundStatus = 'failed';
            // Continue with cancellation even if refund fails
          }
        }
      } else if (!isEligibleForRefund && booking.paymentStatus === 'paid') {
        console.log(`❌ [Cancellation] Not eligible for refund - less than 7 days before print deadline`);
        refundStatus = 'no_refund';
      }

      // Cancel the booking in storage
      const cancelResult = await storage.cancelBooking(bookingId, {
        refundAmount,
        refundStatus: refundStatus as 'pending' | 'processed' | 'no_refund' | 'failed' | 'pending_manual',
      });

      if (!cancelResult) {
        return res.status(500).json({ message: "Failed to cancel booking" });
      }

      const { booking: cancelledBooking, cancelledNow } = cancelResult;

      // If booking was already cancelled, just return success
      if (!cancelledNow) {
        console.log(`ℹ️  [Cancellation] Booking ${bookingId} was already cancelled`);
        return res.json({
          message: "Booking was already cancelled",
          booking: cancelledBooking,
          refund: {
            eligible: false,
            netRefund: cancelledBooking.refundAmount || 0,
            originalAmount: 0,
            processingFee: 0,
            status: cancelledBooking.refundStatus || 'no_refund',
            message: 'Booking was previously cancelled'
          }
        });
      }

      // Fresh cancellation - re-fetch to get latest state and verify
      const freshBooking = await storage.getBookingById(bookingId);
      
      if (!freshBooking || freshBooking.status !== 'cancelled' || freshBooking.paymentStatus === 'paid') {
        console.log(`⚠️  [Cancellation] Booking state changed after cancellation, skipping file cleanup`);
        return res.json({
          message: "Booking cancelled but state changed",
          booking: cancelledBooking,
          refund: {
            eligible: isEligibleForRefund,
            netRefund: refundAmount,
            originalAmount: originalAmount,
            processingFee: stripeFee,
            status: refundStatus,
            message: 'State changed after cancellation'
          }
        });
      }

      // Create admin notification for fresh cancellation
      await storage.createNotification('booking_cancelled', bookingId);
      
      // Release loyalty discount if one was reserved for this booking
      // Drizzle converts INTEGER (0/1) to boolean, but field can be null
      console.log(`🔍 [Loyalty] Checking for discount release: loyaltyDiscountApplied=${booking.loyaltyDiscountApplied} (type: ${typeof booking.loyaltyDiscountApplied})`);
      
      if (booking.loyaltyDiscountApplied === true) {
        console.log(`🎟️ [Loyalty] Releasing discount for booking ${bookingId}...`);
        await releaseLoyaltyDiscount(booking.userId, bookingId);
      } else {
        console.log(`ℹ️  [Loyalty] No discount to release for booking ${bookingId}`);
      }
      
      // Collect file paths from the original booking (before paths were cleared)
      const filesToDelete = [
        booking.artworkFilePath,
        booking.logoFilePath,
        booking.optionalImagePath,
      ].filter((filePath): filePath is string => !!filePath);

      // Clean up files safely
      const deletionPromises = filesToDelete.map(async (filePath) => {
        try {
          const fullPath = path.join(process.cwd(), filePath);
          if (fs.existsSync(fullPath)) {
            await fs.promises.unlink(fullPath);
            console.log(`🗑️  [Cleanup] Deleted file: ${filePath}`);
          }
        } catch (fileError) {
          console.error(`⚠️  [Cleanup] Failed to delete file ${filePath}:`, fileError);
        }
      });
      
      await Promise.allSettled(deletionPromises);

      console.log(`✅ [Cancellation] Booking ${bookingId} cancelled successfully`);

      res.json({
        message: "Booking cancelled successfully",
        booking: cancelledBooking,
        refund: {
          eligible: isEligibleForRefund,
          netRefund: refundAmount,
          originalAmount: originalAmount,
          processingFee: stripeFee,
          status: refundStatus,
          message: refundStatus === 'processed' ? 
            `Refund of $${(refundAmount / 100).toFixed(2)} processing (Original: $${(originalAmount / 100).toFixed(2)}, Processing Fee: $${(stripeFee / 100).toFixed(2)})` :
          refundStatus === 'pending' ? 
            `Refund of $${(refundAmount / 100).toFixed(2)} pending (Original: $${(originalAmount / 100).toFixed(2)}, Processing Fee: $${(stripeFee / 100).toFixed(2)})` :
          refundStatus === 'no_refund' ? 
            'No refund - within 7 days of print deadline' :
            'Refund failed - please contact support'
        }
      });
    } catch (error) {
      console.error("❌ [Cancellation] Error:", error);
      res.status(500).json({ message: "Failed to cancel booking" });
    }
  });

  // Approve booking
  app.post("/api/bookings/:bookingId/approve", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized - Admin access required" });
    }

    try {
      const { bookingId } = req.params;
      
      const booking = await storage.getBookingById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      if (booking.approvalStatus === 'approved') {
        return res.status(400).json({ message: "Booking is already approved" });
      }

      const approvedBooking = await storage.approveBooking(bookingId);
      if (!approvedBooking) {
        return res.status(500).json({ message: "Failed to approve booking" });
      }

      console.log(`✅ [Approval] Booking ${bookingId} approved by admin ${req.user.username}`);
      res.json({ message: "Booking approved successfully", booking: approvedBooking });
    } catch (error) {
      console.error("❌ [Approval] Error:", error);
      res.status(500).json({ message: "Failed to approve booking" });
    }
  });

  // Reject booking
  app.post("/api/bookings/:bookingId/reject", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized - Admin access required" });
    }

    try {
      const { bookingId } = req.params;
      const { rejectionNote } = req.body;

      if (!rejectionNote || rejectionNote.trim() === '') {
        return res.status(400).json({ message: "Rejection note is required" });
      }
      
      const booking = await storage.getBookingById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      if (booking.approvalStatus === 'rejected') {
        return res.status(400).json({ message: "Booking is already rejected" });
      }

      const rejectedBooking = await storage.rejectBooking(bookingId, rejectionNote);
      if (!rejectedBooking) {
        return res.status(500).json({ message: "Failed to reject booking" });
      }

      console.log(`❌ [Rejection] Booking ${bookingId} rejected by admin ${req.user.username}`);
      res.json({ message: "Booking rejected successfully", booking: rejectedBooking });
    } catch (error) {
      console.error("❌ [Rejection] Error:", error);
      res.status(500).json({ message: "Failed to reject booking" });
    }
  });

  // Price Override (Admin only)
  app.post("/api/bookings/:bookingId/override-price", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized - Admin access required" });
    }

    try {
      const { bookingId } = req.params;
      const { priceOverride, priceOverrideNote } = req.body;

      // Validate price override is a positive number
      if (priceOverride !== null && priceOverride !== undefined) {
        const price = parseInt(priceOverride);
        if (isNaN(price) || price < 0) {
          return res.status(400).json({ message: "Price override must be a positive number (in cents)" });
        }
      }
      
      const booking = await storage.getBookingById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const updatedBooking = await storage.updateBooking(bookingId, {
        priceOverride: priceOverride ? parseInt(priceOverride) : null,
        priceOverrideNote: priceOverrideNote || null,
      });

      if (!updatedBooking) {
        return res.status(500).json({ message: "Failed to update price override" });
      }

      console.log(`💲 [Price Override] Booking ${bookingId} price ${priceOverride ? 'set to $' + (priceOverride/100).toFixed(2) : 'cleared'} by admin ${req.user.username}`);
      res.json({ message: "Price override updated successfully", booking: updatedBooking });
    } catch (error) {
      console.error("❌ [Price Override] Error:", error);
      res.status(500).json({ message: "Failed to update price override" });
    }
  });

  // Artwork Management
  app.post("/api/bookings/:bookingId/artwork", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Use multer middleware with error handling
    upload.single('artwork')(req, res, async (err) => {
      try {
        // Handle multer errors
        if (err) {
          if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
              return res.status(400).json({ message: "File too large. Maximum size is 10MB." });
            }
            return res.status(400).json({ message: err.message });
          }
          return res.status(400).json({ message: "File upload error" });
        }

        const { bookingId } = req.params;
        const file = req.file;

        if (!file) {
          return res.status(400).json({ message: "No file uploaded or invalid file type. Please upload PNG, JPG, or PDF files only." });
        }

      // Verify booking exists and belongs to user
      const booking = await storage.getBookingById(bookingId);
      if (!booking) {
        // Clean up uploaded file
        fs.unlinkSync(file.path);
        return res.status(404).json({ message: "Booking not found" });
      }

      if (booking.userId !== req.user.id && req.user.role !== "admin") {
        // Clean up uploaded file
        fs.unlinkSync(file.path);
        return res.status(403).json({ message: "Not authorized to upload artwork for this booking" });
      }

      // Delete old artwork file if exists
      if (booking.artworkFilePath && fs.existsSync(booking.artworkFilePath)) {
        fs.unlinkSync(booking.artworkFilePath);
      }

      // Update booking with artwork info
      const updatedBooking = await storage.updateBooking(bookingId, {
        artworkFilePath: file.path,
        artworkFileName: file.originalname,
        artworkStatus: 'under_review',
        artworkUploadedAt: new Date(),
      });

        res.json(updatedBooking);
      } catch (error) {
        console.error("Artwork upload error:", error);
        // Clean up file if error occurs
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ message: "Failed to upload artwork" });
      }
    });
  });

  app.get("/api/bookings/artwork/review", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const bookings = await storage.getBookingsNeedingReview();
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookings for review" });
    }
  });

  app.patch("/api/bookings/:bookingId/artwork/approve", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { bookingId } = req.params;
      
      const booking = await storage.getBookingById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const updatedBooking = await storage.updateBooking(bookingId, {
        artworkStatus: 'approved',
        artworkReviewedAt: new Date(),
        artworkRejectionReason: null,
      });

      res.json(updatedBooking);
    } catch (error) {
      console.error("Artwork approval error:", error);
      res.status(500).json({ message: "Failed to approve artwork" });
    }
  });

  app.patch("/api/bookings/:bookingId/artwork/reject", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { bookingId } = req.params;
      const { reason } = req.body;

      if (!reason || reason.trim().length === 0) {
        return res.status(400).json({ message: "Rejection reason is required" });
      }
      
      const booking = await storage.getBookingById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const updatedBooking = await storage.updateBooking(bookingId, {
        artworkStatus: 'rejected',
        artworkReviewedAt: new Date(),
        artworkRejectionReason: reason,
      });

      res.json(updatedBooking);
    } catch (error) {
      console.error("Artwork rejection error:", error);
      res.status(500).json({ message: "Failed to reject artwork" });
    }
  });

  app.get("/api/bookings/:bookingId/artwork/file", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { bookingId } = req.params;
      const booking = await storage.getBookingById(bookingId);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Only allow the booking owner or admin to view the artwork
      if (booking.userId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ message: "Not authorized to view this artwork" });
      }

      if (!booking.artworkFilePath || !fs.existsSync(booking.artworkFilePath)) {
        return res.status(404).json({ message: "Artwork file not found" });
      }

      // Send the file
      res.sendFile(path.resolve(booking.artworkFilePath));
    } catch (error) {
      console.error("Artwork file retrieval error:", error);
      res.status(500).json({ message: "Failed to retrieve artwork file" });
    }
  });

  // Ad Design Brief Management
  app.post("/api/bookings/:bookingId/design-brief", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Create a multer instance that handles both logo and optional image with proper storage
    const briefUpload = multer({
      storage: multer.diskStorage({
        destination: (req, file, cb) => {
          if (file.fieldname === 'logo') {
            cb(null, logosDir);
          } else if (file.fieldname === 'optionalImage') {
            cb(null, imagesDir);
          } else {
            cb(new Error('Unexpected field'), '');
          }
        },
        filename: (req, file, cb) => {
          const bookingId = req.params.bookingId || 'unknown';
          const timestamp = Date.now();
          const ext = path.extname(file.originalname);
          const prefix = file.fieldname === 'logo' ? 'logo' : 'image';
          cb(null, `${prefix}-${bookingId}-${timestamp}${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
      fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(null, false);
        }
      },
    });

    briefUpload.fields([
      { name: 'logo', maxCount: 1 },
      { name: 'optionalImage', maxCount: 1 }
    ])(req, res, async (err) => {
      try {
        if (err) {
          if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
              return res.status(400).json({ message: "File too large. Maximum size is 5MB per file." });
            }
            return res.status(400).json({ message: err.message });
          }
          return res.status(400).json({ message: "File upload error" });
        }

        const { bookingId } = req.params;
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        
        const booking = await storage.getBookingById(bookingId);
        if (!booking) {
          return res.status(404).json({ message: "Booking not found" });
        }

        if (booking.userId !== req.user.id) {
          return res.status(403).json({ message: "Not authorized to submit design brief for this booking" });
        }

        const briefData = JSON.parse(req.body.briefData);
        
        const updatedBooking = await storage.updateBooking(bookingId, {
          mainMessage: briefData.mainMessage,
          qrCodeDestination: briefData.qrCodeDestination,
          qrCodeUrl: briefData.qrCodeUrl,
          qrCodeLabel: briefData.qrCodeLabel,
          brandColor: briefData.brandColor,
          secondaryColor: briefData.secondaryColor,
          additionalColor1: briefData.additionalColor1,
          additionalColor2: briefData.additionalColor2,
          adStyle: briefData.adStyle,
          logoFilePath: files.logo ? files.logo[0].path : null,
          optionalImagePath: files.optionalImage ? files.optionalImage[0].path : null,
          designNotes: briefData.designNotes,
          designStatus: 'brief_submitted',
        });

        // Create admin notification for new design brief submission
        await storage.createNotification('design_brief_submitted', bookingId);

        res.json(updatedBooking);
      } catch (error) {
        console.error("Design brief submission error:", error);
        res.status(500).json({ message: "Failed to submit design brief" });
      }
    });
  });

  app.post("/api/bookings/:bookingId/design", (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    uploadDesign.array('designs', 10)(req, res, async (err) => {
      try {
        if (err) {
          if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
              return res.status(400).json({ message: "File too large. Maximum size is 10MB." });
            }
            return res.status(400).json({ message: err.message });
          }
          return res.status(400).json({ message: "File upload error" });
        }

        const { bookingId } = req.params;
        const files = req.files as Express.Multer.File[] | undefined;

        if (!files || files.length === 0) {
          return res.status(400).json({ message: "No design files uploaded" });
        }

        const booking = await storage.getBookingById(bookingId);
        if (!booking) {
          // Cleanup uploaded files
          files.forEach(file => fs.unlinkSync(file.path));
          return res.status(404).json({ message: "Booking not found" });
        }

        if (booking.revisionCount >= 3) {
          // Cleanup uploaded files
          files.forEach(file => fs.unlinkSync(file.path));
          return res.status(400).json({ message: "Maximum revisions (3) reached" });
        }

        const adminNotes = req.body.adminNotes || null;

        // Create a design revision for each uploaded file
        const designRevisions = await Promise.all(
          files.map(file => 
            storage.createDesignRevision({
              bookingId,
              revisionNumber: booking.revisionCount,
              designFilePath: file.path,
              status: 'pending_review',
              adminNotes,
              uploadedBy: req.user.id,
            })
          )
        );

        const updatedBooking = await storage.updateBooking(bookingId, {
          designStatus: 'pending_approval',
        });

        res.json({ designRevisions, booking: updatedBooking });
      } catch (error) {
        console.error("Design upload error:", error);
        res.status(500).json({ message: "Failed to upload design" });
      }
    });
  });

  app.get("/api/bookings/:bookingId/designs", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { bookingId } = req.params;
      const booking = await storage.getBookingById(bookingId);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      if (booking.userId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ message: "Not authorized to view designs for this booking" });
      }

      const designs = await storage.getDesignRevisionsByBooking(bookingId);
      res.json(designs);
    } catch (error) {
      console.error("Design retrieval error:", error);
      res.status(500).json({ message: "Failed to retrieve designs" });
    }
  });

  app.patch("/api/designs/:designId/approve", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { designId } = req.params;
      
      // Get the design to find its revision details
      const design = await storage.getDesignRevisionById(designId);
      if (!design) {
        return res.status(404).json({ message: "Design not found" });
      }

      // Get all designs in the same revision (for multi-file uploads)
      const allDesigns = await storage.getDesignRevisionsByBooking(design.bookingId);
      const revisionsInGroup = allDesigns.filter(
        d => d.revisionNumber === design.revisionNumber
      );

      // Update the selected design to approved, others to not_selected
      await Promise.all(
        revisionsInGroup.map(d => 
          storage.updateDesignRevisionStatus(
            d.id, 
            d.id === designId ? 'approved' : 'not_selected'
          )
        )
      );

      // Update booking status
      await storage.updateBooking(design.bookingId, {
        designStatus: 'approved',
      });

      res.json(design);
    } catch (error) {
      console.error("Design approval error:", error);
      res.status(500).json({ message: "Failed to approve design" });
    }
  });

  app.patch("/api/designs/:designId/request-revision", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { designId } = req.params;
      const { feedback } = req.body;

      if (!feedback || feedback.trim().length === 0) {
        return res.status(400).json({ message: "Feedback is required when requesting revisions" });
      }

      // Get the design to find its revision details
      const design = await storage.getDesignRevisionById(designId);
      if (!design) {
        return res.status(404).json({ message: "Design not found" });
      }

      const booking = await storage.getBookingById(design.bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      if (booking.revisionCount >= 2) {
        return res.status(400).json({ message: "Maximum revisions reached. Cannot request more changes." });
      }

      // Get all designs in the same revision (for multi-file uploads)
      const allDesigns = await storage.getDesignRevisionsByBooking(design.bookingId);
      const revisionsInGroup = allDesigns.filter(
        d => d.revisionNumber === design.revisionNumber
      );

      // Update all designs in the same revision to revision_requested
      await Promise.all(
        revisionsInGroup.map(d => 
          storage.updateDesignRevisionStatus(d.id, 'revision_requested', feedback)
        )
      );

      await storage.updateBooking(design.bookingId, {
        revisionCount: booking.revisionCount + 1,
        designStatus: 'revision_requested',
      });

      // Create admin notification for revision request
      await storage.createNotification('design_revision_requested', design.bookingId);

      res.json(design);
    } catch (error) {
      console.error("Design revision request error:", error);
      res.status(500).json({ message: "Failed to request design revision" });
    }
  });

  app.get("/api/designs/:designId/file", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { designId } = req.params;
      const design = await storage.getDesignRevisionById(designId);
      
      if (!design) {
        return res.status(404).json({ message: "Design not found" });
      }

      // Get the booking to verify authorization
      const booking = await storage.getBookingById(design.bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Only allow the booking owner or admin to view the design
      if (booking.userId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ message: "Not authorized to view this design" });
      }

      if (!design.designFilePath || !fs.existsSync(design.designFilePath)) {
        return res.status(404).json({ message: "Design file not found" });
      }

      // Send the file
      res.sendFile(path.resolve(design.designFilePath));
    } catch (error) {
      console.error("Design file retrieval error:", error);
      res.status(500).json({ message: "Failed to retrieve design file" });
    }
  });

  // Serve logo files
  app.get("/api/bookings/:bookingId/logo", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { bookingId } = req.params;
      const booking = await storage.getBookingById(bookingId);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Only allow the booking owner or admin to view the logo
      if (booking.userId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ message: "Not authorized to view this logo" });
      }

      if (!booking.logoFilePath || !fs.existsSync(booking.logoFilePath)) {
        return res.status(404).json({ message: "Logo file not found" });
      }

      // Send the file
      res.sendFile(path.resolve(booking.logoFilePath));
    } catch (error) {
      console.error("Logo file retrieval error:", error);
      res.status(500).json({ message: "Failed to retrieve logo file" });
    }
  });

  // Serve optional image files
  app.get("/api/bookings/:bookingId/optional-image", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { bookingId } = req.params;
      const booking = await storage.getBookingById(bookingId);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Only allow the booking owner or admin to view the image
      if (booking.userId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ message: "Not authorized to view this image" });
      }

      if (!booking.optionalImagePath || !fs.existsSync(booking.optionalImagePath)) {
        return res.status(404).json({ message: "Optional image file not found" });
      }

      // Send the file
      res.sendFile(path.resolve(booking.optionalImagePath));
    } catch (error) {
      console.error("Optional image retrieval error:", error);
      res.status(500).json({ message: "Failed to retrieve optional image file" });
    }
  });

  // Slot Grid Management
  app.get("/api/slots/:campaignId", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { campaignId } = req.params;
      
      // Verify campaign exists
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      const slotGrid = await storage.getSlotGrid(campaignId);
      res.json(slotGrid);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch slot grid" });
    }
  });

  app.post("/api/slots", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      // Create a partial schema that makes userId optional (we'll add it from the session)
      const slotBookingSchema = insertBookingSchema.omit({ userId: true }).extend({
        businessName: z.string().min(1, "Business name is required"),
        contactEmail: z.string().email("Valid email is required"),
        contactPhone: z.string().optional(),
        userId: z.string().optional(),
      });
      
      const validatedData = slotBookingSchema.parse(req.body);

      // Check if campaign exists
      const campaign = await storage.getCampaign(validatedData.campaignId);
      if (!campaign) {
        return res.status(400).json({ message: "Campaign not found" });
      }

      // Validate subcategory belongs to selected industry (if provided)
      const industry = await storage.getIndustry(validatedData.industryId);
      if (!industry) {
        return res.status(400).json({ message: "Invalid industry" });
      }

      // Require subcategory if this industry has subcategories available (except "Other")
      const isOtherIndustry = industry.name.toLowerCase() === "other";
      if (!isOtherIndustry) {
        const availableSubcategories = await storage.getSubcategoriesByIndustry(validatedData.industryId);
        if (availableSubcategories.length > 0 && !validatedData.industrySubcategoryId) {
          return res.status(400).json({ message: "Please select a specialization for this industry" });
        }
      }

      if (validatedData.industrySubcategoryId) {
        const subcategory = await storage.getSubcategory(validatedData.industrySubcategoryId);
        if (!subcategory || subcategory.industryId !== validatedData.industryId) {
          return res.status(400).json({ message: "Invalid subcategory for the selected industry" });
        }
      }

      // Check if slot is already booked at subcategory level
      // "Other" industry with NULL subcategory allows multiple bookings
      const isOtherIndustryNoSubcategory = industry.name === "Other" && !validatedData.industrySubcategoryId;
      
      if (!isOtherIndustryNoSubcategory) {
        const existingBooking = await storage.getBooking(
          validatedData.campaignId,
          validatedData.routeId,
          validatedData.industryId,
          validatedData.industrySubcategoryId || null
        );

        if (existingBooking) {
          return res.status(400).json({ message: "Slot already booked" });
        }
      }

      // Create admin booking with mock user ID if not provided
      const adminBookingAmount = validatedData.amount || 60000;
      const bookingData = {
        ...validatedData,
        userId: validatedData.userId || req.user.id,
        paymentId: `admin_booking_${Date.now()}`,
        status: "confirmed" as const,
        amount: adminBookingAmount,
        basePriceBeforeDiscounts: adminBookingAmount, // Admin bookings: no discount tracking
        loyaltyDiscountApplied: false,
        countsTowardLoyalty: true, // Admin bookings count toward loyalty for the user
      };

      const booking = await storage.createBooking(bookingData);
      res.status(201).json(booking);
    } catch (error) {
      if ((error as Error).name === "ZodError") {
        return res.status(400).json({ message: "Invalid booking data", errors: (error as any).errors });
      }
      console.error("Failed to create slot booking:", error);
      res.status(500).json({ message: "Failed to create slot booking" });
    }
  });

  app.delete("/api/slots/:bookingId", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { bookingId } = req.params;
      
      // Get booking details before canceling
      const booking = await storage.getBookingById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      console.log(`🔧 [Admin Delete] Canceling booking ${bookingId} (admin-initiated, no automatic refund)`);

      // Cancel the booking with no automatic refund (admin will handle manually if needed)
      const cancelResult = await storage.cancelBooking(bookingId, {
        refundAmount: 0,
        refundStatus: 'pending_manual' as 'pending' | 'processed' | 'no_refund' | 'failed' | 'pending_manual', // Admin will process refund manually in Stripe if needed
      });

      if (!cancelResult) {
        return res.status(500).json({ message: "Failed to cancel booking" });
      }

      const { booking: cancelledBooking, cancelledNow } = cancelResult;

      // If booking was already cancelled, just return success
      if (!cancelledNow) {
        return res.json({ 
          message: "Booking was already cancelled",
          booking: cancelledBooking 
        });
      }

      // Create admin notification for cancellation
      await storage.createNotification('booking_cancelled', bookingId);
      
      // Release loyalty discount if one was reserved
      if (booking.loyaltyDiscountApplied === true) {
        console.log(`🎟️ [Loyalty] Releasing discount for admin-cancelled booking ${bookingId}...`);
        await releaseLoyaltyDiscount(booking.userId, bookingId);
      }

      // Clean up files
      const filesToDelete = [
        booking.artworkFilePath,
        booking.logoFilePath,
        booking.optionalImagePath,
      ].filter((filePath): filePath is string => !!filePath);

      const deletionPromises = filesToDelete.map(async (filePath) => {
        try {
          const fullPath = path.join(process.cwd(), filePath);
          if (fs.existsSync(fullPath)) {
            await fs.promises.unlink(fullPath);
            console.log(`🗑️  [Cleanup] Deleted file: ${filePath}`);
          }
        } catch (fileError) {
          console.error(`⚠️  [Cleanup] Failed to delete file ${filePath}:`, fileError);
        }
      });
      
      await Promise.allSettled(deletionPromises);

      console.log(`✅ [Admin Delete] Booking ${bookingId} cancelled successfully (refund status: pending_manual)`);
      
      res.json({ 
        message: "Booking cancelled successfully. Refund must be processed manually in Stripe dashboard.",
        booking: cancelledBooking 
      });
    } catch (error) {
      console.error("❌ [Admin Delete] Error:", error);
      res.status(500).json({ message: "Failed to cancel booking" });
    }
  });

  // Mock payment processing
  app.post("/api/process-payment", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const paymentId = `mock_payment_${Date.now()}`;
      res.json({
        success: true,
        paymentId,
        amount: req.body.amount || 60000,
        status: "confirmed",
      });
    } catch (error) {
      res.status(500).json({ message: "Payment processing failed" });
    }
  });

  // Mock license verification
  app.post("/api/verify-license", async (req, res) => {
    try {
      // Simulate license verification delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      res.json({
        valid: true,
        business: req.body.businessName || "Verified Business",
        license: req.body.licenseNumber,
      });
    } catch (error) {
      res.status(500).json({ message: "License verification failed" });
    }
  });

  // Admin Dashboard Stats
  app.get("/api/admin/dashboard-stats", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const campaigns = await storage.getAllCampaigns();
      const allBookings = await storage.getAllBookings();
      
      // Find current month's campaign or next upcoming campaign
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      
      // First try to find campaign whose mail date is in the current month
      let currentCampaign = campaigns.find(c => {
        if (!c.mailDate) return false;
        const mailDate = new Date(c.mailDate);
        return mailDate.getFullYear() === currentYear && mailDate.getMonth() === currentMonth;
      });
      
      // If no campaign in current month, find the next upcoming campaign
      if (!currentCampaign) {
        const futureCampaigns = campaigns.filter(c => {
          if (!c.mailDate) return false;
          const mailDate = new Date(c.mailDate);
          return mailDate >= now;
        }).sort((a, b) => new Date(a.mailDate!).getTime() - new Date(b.mailDate!).getTime());
        
        currentCampaign = futureCampaigns[0] || null;
      }

      // If we have a current campaign, get its specific stats
      if (currentCampaign) {
        // Get bookings for this specific campaign (exclude cancelled bookings)
        const campaignBookings = allBookings.filter(b => 
          b.campaignId === currentCampaign.id && 
          b.status !== 'cancelled' && 
          b.paymentStatus === 'paid'  // Only count paid bookings
        );
        
        // Count slots booked (sum quantity from paid bookings, not campaign counter)
        const slotsBooked = campaignBookings.reduce((sum, b) => sum + (b.quantity || 1), 0);
        
        // Revenue from paid bookings in this campaign
        const campaignRevenue = campaignBookings
          .filter(b => b.paymentStatus === 'paid')
          .reduce((sum, booking) => sum + booking.amount, 0);

        res.json({
          campaignId: currentCampaign.id,
          campaignName: currentCampaign.name,
          slotsBooked: slotsBooked,
          totalSlots: currentCampaign.totalSlots,
          printDeadline: currentCampaign.printDeadline,
          mailDeadline: currentCampaign.mailDate,
          revenueThisMonth: campaignRevenue / 100, // Convert cents to dollars
        });
      } else {
        // No current campaign - return zeros
        res.json({
          campaignId: null,
          campaignName: null,
          slotsBooked: 0,
          totalSlots: 0,
          printDeadline: null,
          mailDeadline: null,
          revenueThisMonth: 0,
        });
      }
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Admin Recent Activity Feed
  app.get("/api/admin/recent-activity", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const allBookings = await storage.getAllBookings();
      const allUsers = await storage.getAllUsers();
      
      // Get recent activities (last 10 items)
      const activities: Array<{
        id: string;
        type: 'booking' | 'payment' | 'registration';
        message: string;
        timestamp: string;
        icon: string;
      }> = [];

      // Add recent bookings (paid ones)
      const recentBookings = allBookings
        .filter(b => b.paymentStatus === 'paid' && b.createdAt)
        .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
        .slice(0, 5);

      for (const booking of recentBookings) {
        const user = allUsers.find(u => u.id === booking.userId);
        const campaign = await storage.getCampaign(booking.campaignId);
        const route = await storage.getRoute(booking.routeId);
        const industry = await storage.getIndustry(booking.industryId);
        
        // Payment activity
        activities.push({
          id: `payment-${booking.id}`,
          type: 'payment',
          message: `Payment received: $${(booking.amountPaid || booking.amount) / 100} from ${user?.businessName || user?.username || 'Unknown'}`,
          timestamp: new Date(booking.paidAt || booking.createdAt!).toISOString(),
          icon: 'dollar-sign'
        });

        // Booking activity
        activities.push({
          id: `booking-${booking.id}`,
          type: 'booking',
          message: `New booking: ${industry?.name || 'Unknown Industry'} on Route ${route?.zipCode || 'Unknown'}`,
          timestamp: new Date(booking.createdAt!).toISOString(),
          icon: 'calendar-check'
        });
      }

      // Add recent registrations (last 5 customer registrations)
      const recentCustomers = allUsers
        .filter(u => u.role === 'customer' && u.createdAt)
        .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
        .slice(0, 3);

      for (const customer of recentCustomers) {
        activities.push({
          id: `registration-${customer.id}`,
          type: 'registration',
          message: `${customer.businessName || customer.username} registered`,
          timestamp: new Date(customer.createdAt!).toISOString(),
          icon: 'user-plus'
        });
      }

      // Sort all activities by timestamp (most recent first) and limit to 10
      const sortedActivities = activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10)
        .map(activity => ({
          ...activity,
          timestamp: formatTimestamp(activity.timestamp)
        }));

      res.json(sortedActivities);
    } catch (error) {
      console.error('Recent activity error:', error);
      res.status(500).json({ message: "Failed to fetch recent activity" });
    }
  });

  // Admin Business Metrics
  app.get("/api/admin/business-metrics", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const allUsers = await storage.getAllUsers();
      const allBookings = await storage.getAllBookings();
      const campaigns = await storage.getAllCampaigns();
      
      // Total customers (excluding admin users)
      const totalCustomers = allUsers.filter(u => u.role === 'customer').length;
      
      // Calculate occupancy rate (across all campaigns)
      const totalSlots = campaigns.reduce((sum, c) => sum + c.totalSlots, 0);
      const bookedSlots = allBookings.filter(b => b.status !== 'cancelled').length;
      const occupancyRate = totalSlots > 0 ? Math.round((bookedSlots / totalSlots) * 100) : 0;
      
      // Calculate average booking value (from paid bookings)
      const paidBookings = allBookings.filter(b => b.paymentStatus === 'paid');
      const totalRevenue = paidBookings.reduce((sum, b) => sum + (b.amountPaid || b.amount), 0);
      const avgBookingValue = paidBookings.length > 0 ? totalRevenue / paidBookings.length : 0;

      res.json({
        totalCustomers,
        occupancyRate,
        avgBookingValue: Math.round(avgBookingValue / 100), // Convert to dollars
      });
    } catch (error) {
      console.error('Business metrics error:', error);
      res.status(500).json({ message: "Failed to fetch business metrics" });
    }
  });

  // CRM Routes - Get all customers with stats
  app.get("/api/admin/crm/customers", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { search, tag, highValue, sortBy, sortOrder } = req.query;
      
      const filters: any = {};
      if (search) filters.search = String(search);
      if (tag) filters.tag = String(tag);
      if (highValue === 'true') filters.highValue = true;
      if (sortBy) filters.sortBy = String(sortBy);
      if (sortOrder) filters.sortOrder = String(sortOrder);
      
      const customers = await storage.getCustomers(filters);
      
      // Convert totalSpent from cents to dollars for response
      const customersWithDollars = customers.map(c => ({
        ...c,
        totalSpent: c.totalSpent / 100,
      }));
      
      res.json(customersWithDollars);
    } catch (error) {
      console.error('Get customers error:', error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  // Get customer details
  app.get("/api/admin/crm/customer/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { id } = req.params;
      const details = await storage.getCustomerDetails(id);
      
      if (!details) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      // Convert lifetimeValue from cents to dollars
      res.json({
        ...details,
        lifetimeValue: details.lifetimeValue / 100,
        bookings: details.bookings.map(b => ({
          ...b,
          amount: b.amount / 100,
          amountPaid: b.amountPaid ? b.amountPaid / 100 : null,
        })),
      });
    } catch (error) {
      console.error('Get customer details error:', error);
      res.status(500).json({ message: "Failed to fetch customer details" });
    }
  });

  // Add customer note
  app.post("/api/admin/crm/notes", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { customerId, note } = req.body;
      
      if (!customerId || !note) {
        return res.status(400).json({ message: "Customer ID and note are required" });
      }
      
      await storage.addCustomerNote(customerId, note, req.user.id);
      res.json({ message: "Note added successfully" });
    } catch (error) {
      console.error('Add note error:', error);
      res.status(500).json({ message: "Failed to add note" });
    }
  });

  // Add customer tag
  app.post("/api/admin/crm/tags", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { customerId, tag } = req.body;
      
      if (!customerId || !tag) {
        return res.status(400).json({ message: "Customer ID and tag are required" });
      }
      
      await storage.addCustomerTag(customerId, tag, req.user.id);
      res.json({ message: "Tag added successfully" });
    } catch (error) {
      console.error('Add tag error:', error);
      res.status(500).json({ message: "Failed to add tag" });
    }
  });

  // Remove customer tag
  app.delete("/api/admin/crm/tags", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { customerId, tag } = req.body;
      
      if (!customerId || !tag) {
        return res.status(400).json({ message: "Customer ID and tag are required" });
      }
      
      await storage.removeCustomerTag(customerId, tag);
      res.json({ message: "Tag removed successfully" });
    } catch (error) {
      console.error('Remove tag error:', error);
      res.status(500).json({ message: "Failed to remove tag" });
    }
  });

  // Helper function to format timestamp for recent activity
  function formatTimestamp(timestamp: string): string {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    return date.toLocaleDateString();
  }

  // Admin Notifications
  app.get("/api/notifications/count", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const count = await storage.getUnhandledNotificationsCount(req.user.id);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notification count" });
    }
  });

  app.get("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const notifications = await storage.getAllUnhandledNotifications(req.user.id);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/summary", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const newBookings = await storage.getNotificationsByType('new_booking', req.user.id);
      const artworkReviews = await storage.getNotificationsByType('artwork_review', req.user.id);
      const canceledBookings = await storage.getNotificationsByType('canceled_booking', req.user.id);
      const designBriefs = await storage.getNotificationsByType('design_brief_submitted', req.user.id);
      const designRevisions = await storage.getNotificationsByType('design_revision_requested', req.user.id);
      
      res.json({
        newBookings: newBookings.length,
        artworkReviews: artworkReviews.length,
        canceledBookings: canceledBookings.length,
        designBriefs: designBriefs.length,
        designRevisions: designRevisions.length,
        total: newBookings.length + artworkReviews.length + canceledBookings.length + designBriefs.length + designRevisions.length,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notification summary" });
    }
  });

  app.post("/api/notifications/:bookingId/dismiss", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { bookingId } = req.params;
      const { notificationType } = req.body;

      if (!notificationType) {
        return res.status(400).json({ message: "notificationType is required" });
      }

      await storage.createDismissedNotification(bookingId, notificationType, req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error dismissing notification:', error);
      res.status(500).json({ message: "Failed to dismiss notification" });
    }
  });

  // Public Loyalty Settings Route (for customer dashboard display)
  app.get("/api/loyalty-settings", async (req, res) => {
    try {
      const loyaltyKeys = ['loyalty_slots_threshold', 'loyalty_discount_amount', 'loyalty_discount_display_name'];
      const settings = await storage.getAllAdminSettings();
      const loyaltySettings = settings.filter(s => loyaltyKeys.includes(s.key));
      
      // Return as object with defaults for missing keys
      const response = {
        threshold: loyaltySettings.find(s => s.key === 'loyalty_slots_threshold')?.value || '3',
        discountAmount: loyaltySettings.find(s => s.key === 'loyalty_discount_amount')?.value || '15000',
        displayName: loyaltySettings.find(s => s.key === 'loyalty_discount_display_name')?.value || 'Appreciation Discount',
      };
      
      res.json(response);
    } catch (error) {
      console.error('Error fetching loyalty settings:', error);
      res.status(500).json({ message: "Failed to fetch loyalty settings" });
    }
  });

  // Waitlist Routes
  app.post("/api/waitlist", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const validatedData = insertWaitlistEntrySchema.parse({
        ...req.body,
        userId: req.user.id,
        status: "active",
      });

      console.log("🔍 [Waitlist] Validated data:", validatedData);

      // Verify campaign exists
      const campaign = await storage.getCampaign(validatedData.campaignId);
      if (!campaign) {
        return res.status(400).json({ message: "Campaign not found" });
      }

      // Verify route exists
      const route = await storage.getRoute(validatedData.routeId);
      if (!route) {
        return res.status(400).json({ message: "Route not found" });
      }

      // Verify industry and subcategory exist
      const industry = await storage.getIndustry(validatedData.industryId);
      console.log("🔍 [Waitlist] Industry lookup for ID", validatedData.industryId, ":", industry);
      if (!industry) {
        return res.status(400).json({ message: "Industry not found" });
      }

      // Require subcategory if this industry has subcategories available (except "Other")
      const isOtherIndustry = industry.name.toLowerCase() === "other";
      if (!isOtherIndustry) {
        const availableSubcategories = await storage.getSubcategoriesByIndustry(validatedData.industryId);
        if (availableSubcategories.length > 0 && !validatedData.industrySubcategoryId) {
          return res.status(400).json({ message: "Please select a specialization for this industry" });
        }
      }

      if (validatedData.industrySubcategoryId) {
        const subcategory = await storage.getSubcategory(validatedData.industrySubcategoryId);
        if (!subcategory || subcategory.industryId !== validatedData.industryId) {
          return res.status(400).json({ message: "Invalid subcategory for selected industry" });
        }
      }

      // Check if user already has an active waitlist entry for this exact combination
      const existingEntries = await storage.getWaitlistEntriesByUser(req.user.id);
      const duplicate = existingEntries.find(entry =>
        entry.campaignId === validatedData.campaignId &&
        entry.routeId === validatedData.routeId &&
        entry.industrySubcategoryId === validatedData.industrySubcategoryId &&
        entry.status === "active"
      );

      if (duplicate) {
        return res.status(400).json({ message: "You're already on the waitlist for this slot" });
      }

      const entry = await storage.createWaitlistEntry(validatedData);
      res.json(entry);
    } catch (error) {
      console.error("Error creating waitlist entry:", error);
      res.status(500).json({ message: "Failed to join waitlist" });
    }
  });

  app.get("/api/waitlist", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const entries = await storage.getWaitlistEntriesByUser(req.user.id);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching waitlist entries:", error);
      res.status(500).json({ message: "Failed to fetch waitlist entries" });
    }
  });

  app.delete("/api/waitlist/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { id } = req.params;
      
      // Get entry to verify ownership
      const entries = await storage.getWaitlistEntriesByUser(req.user.id);
      const entry = entries.find(e => e.id === id);
      
      if (!entry) {
        return res.status(404).json({ message: "Waitlist entry not found" });
      }

      const success = await storage.deleteWaitlistEntry(id);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ message: "Waitlist entry not found" });
      }
    } catch (error) {
      console.error("Error deleting waitlist entry:", error);
      res.status(500).json({ message: "Failed to remove from waitlist" });
    }
  });

  // Admin Settings Routes
  app.get("/api/admin/settings", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const settings = await storage.getAllAdminSettings();
      res.json(settings);
    } catch (error) {
      console.error('Error fetching admin settings:', error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.get("/api/admin/settings/:key", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { key } = req.params;
      const setting = await storage.getAdminSetting(key);
      
      if (!setting) {
        return res.status(404).json({ message: "Setting not found" });
      }
      
      res.json(setting);
    } catch (error) {
      console.error('Error fetching admin setting:', error);
      res.status(500).json({ message: "Failed to fetch setting" });
    }
  });

  app.put("/api/admin/settings/:key", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { key } = req.params;
      const { value, description } = req.body;

      if (value === undefined || value === null) {
        return res.status(400).json({ message: "Value is required" });
      }

      await storage.setAdminSetting(key, String(value), description, req.user.id);
      res.json({ success: true, key, value });
    } catch (error) {
      console.error('Error updating admin setting:', error);
      res.status(500).json({ message: "Failed to update setting" });
    }
  });

  // Admin Waitlist Routes
  app.get("/api/admin/waitlist", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { campaignId, routeId, industrySubcategoryId, status } = req.query;
      
      const filters: {
        campaignId?: string;
        routeId?: string;
        industrySubcategoryId?: string;
        status?: string;
      } = {};

      if (campaignId) filters.campaignId = campaignId as string;
      if (routeId) filters.routeId = routeId as string;
      if (industrySubcategoryId) filters.industrySubcategoryId = industrySubcategoryId as string;
      if (status) filters.status = status as string;

      const entries = await storage.getAllWaitlistEntries(filters);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching waitlist entries:", error);
      res.status(500).json({ message: "Failed to fetch waitlist entries" });
    }
  });

  app.post("/api/admin/waitlist/notify", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      // Validate request body with Zod
      const notifySchema = z.object({
        entryIds: z.array(z.string()).min(1, "At least one entry must be selected"),
        message: z.string().trim().min(1, "Message is required"),
        sendEmail: z.boolean(),
        sendInApp: z.boolean(),
      });

      const validatedData = notifySchema.parse(req.body);

      // Ensure at least one channel is selected
      const channels: ("in_app" | "email")[] = [];
      if (validatedData.sendInApp) channels.push("in_app");
      if (validatedData.sendEmail) channels.push("email");

      if (channels.length === 0) {
        return res.status(400).json({ message: "At least one notification channel must be selected" });
      }

      const result = await storage.notifyWaitlistCustomers({
        adminId: req.user.id,
        entryIds: validatedData.entryIds,
        message: validatedData.message,
        channels,
      });

      res.json({
        success: true,
        notifiedCount: result.notifiedCount,
        message: `Successfully notified ${result.notifiedCount} customer(s)`,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors.map(e => e.message).join(", ")
        });
      }
      console.error("Error sending waitlist notifications:", error);
      res.status(500).json({ message: "Failed to send notifications" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
