import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertBookingSchema, insertRouteSchema, insertIndustrySchema, insertCampaignSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import Stripe from "stripe";

// Reference: Stripe integration blueprint (javascript_stripe)
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
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

// Configure multer for artwork uploads
const uploadsDir = path.join(process.cwd(), "uploads", "artwork");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

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
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid route data", errors: error.errors });
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
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid route data", errors: error.errors });
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
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid industry data", errors: error.errors });
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
          i.name.toLowerCase() === industryData.name.toLowerCase() && i.id !== req.params.id
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
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid industry data", errors: error.errors });
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

  // Campaigns
  app.get("/api/campaigns", async (req, res) => {
    try {
      const campaigns = await storage.getAllCampaigns();
      res.json(campaigns);
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
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid campaign data", errors: error.errors });
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
        const validTransitions = {
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
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid campaign data", errors: error.errors });
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

      const deleted = await storage.deleteCampaign(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete campaign" });
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
      console.log("🔍 [Availability] Checking:", { campaignId, routeId, industryId });
      const booking = await storage.getBooking(campaignId, routeId, industryId);
      console.log("✅ [Availability] Result:", { available: !booking, bookingFound: !!booking });
      res.json({ available: !booking });
    } catch (error) {
      console.error("❌ [Availability] Error:", error);
      res.status(500).json({ message: "Failed to check availability" });
    }
  });

  // Create Stripe Checkout session for booking payment
  app.post("/api/create-checkout-session", async (req, res) => {
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

      // Check if slot is already booked
      const existingBooking = await storage.getBooking(
        validatedData.campaignId,
        validatedData.routeId,
        validatedData.industryId
      );

      if (existingBooking) {
        return res.status(400).json({ message: "Slot already booked" });
      }

      // Get route and industry details for display
      const route = await storage.getRoute(validatedData.routeId);
      const industry = await storage.getIndustry(validatedData.industryId);

      if (!route || !industry) {
        return res.status(400).json({ message: "Route or industry not found" });
      }

      // Create booking with pending payment status
      const booking = await storage.createBooking({
        ...validatedData,
        status: "confirmed",
        paymentStatus: "pending",
      });

      // Create Stripe Checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Direct Mail Campaign - ${campaign.name}`,
                description: `Route: ${route.zipCode} - ${route.name} | Industry: ${industry.name}`,
              },
              unit_amount: validatedData.amount || 60000, // Amount in cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${req.headers.origin}/customer/confirmation?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/customer/booking`,
        customer_email: validatedData.contactEmail,
        metadata: {
          bookingId: booking.id,
          campaignId: validatedData.campaignId,
          userId: req.user.id,
        },
      });

      // Update booking with Stripe session ID
      await storage.updateBooking(booking.id, {
        stripeCheckoutSessionId: session.id,
      });

      res.json({ sessionUrl: session.url, bookingId: booking.id });
    } catch (error) {
      console.error("Checkout session creation error:", error);
      res.status(400).json({ message: "Failed to create checkout session" });
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
        const bookingId = session.metadata?.bookingId;
        console.log("✅ [Stripe Webhook] Checkout completed for booking:", bookingId);
        console.log("💳 [Stripe Webhook] Session ID:", session.id);
        console.log("💰 [Stripe Webhook] Amount:", session.amount_total);

        if (bookingId) {
          // Update booking payment status to paid
          await storage.updateBookingPaymentStatus(bookingId, 'paid', {
            stripePaymentIntentId: session.payment_intent as string,
            amountPaid: session.amount_total,
            paidAt: new Date(),
          });
          
          console.log(`✅ [Stripe Webhook] Payment successful for booking ${bookingId}`);
        } else {
          console.log("❌ [Stripe Webhook] No booking ID in metadata");
        }
        break;

      case 'checkout.session.expired':
      case 'payment_intent.payment_failed':
        const failedSession = event.data.object;
        const failedBookingId = failedSession.metadata?.bookingId;
        console.log("❌ [Stripe Webhook] Payment failed/expired for booking:", failedBookingId);

        if (failedBookingId) {
          // Update booking payment status to failed
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
          amountPaid: session.amount_total,
          paidAt: new Date(),
        });

        console.log(`✅ [Stripe Verify] Booking ${bookingId} payment status updated to paid`);
      }

      res.json({ 
        paymentStatus: session.payment_status,
        bookingId: bookingId,
        updated: session.payment_status === 'paid' && booking.paymentStatus === 'pending'
      });
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

      // Check if slot is already booked
      const existingBooking = await storage.getBooking(
        validatedData.campaignId,
        validatedData.routeId,
        validatedData.industryId
      );

      if (existingBooking) {
        return res.status(400).json({ message: "Slot already booked" });
      }

      // Mock payment processing (legacy endpoint, kept for backwards compatibility)
      const paymentId = `mock_payment_${Date.now()}`;
      
      const booking = await storage.createBooking({
        ...validatedData,
        paymentId,
        status: "confirmed",
      });

      // Update campaign revenue after successful booking
      const bookingAmount = validatedData.amount || 60000; // Default $600 in cents
      await storage.updateCampaign(validatedData.campaignId, {
        revenue: campaign.revenue + bookingAmount
      });

      res.status(201).json(booking);
    } catch (error) {
      console.error("Booking error:", error);
      res.status(400).json({ message: "Invalid booking data" });
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

      console.log(`📅 [Cancellation] Days until print deadline: ${daysUntilDeadline}`);

      // Determine refund eligibility (7+ days before print deadline)
      const isEligibleForRefund = daysUntilDeadline >= 7 && booking.paymentStatus === 'paid';
      let refundAmount = 0;
      let refundStatus: 'pending' | 'processed' | 'no_refund' | 'failed' = 'no_refund';

      // Process Stripe refund if eligible
      if (isEligibleForRefund && booking.stripePaymentIntentId) {
        try {
          console.log(`💰 [Cancellation] Processing Stripe refund for payment intent: ${booking.stripePaymentIntentId}`);
          
          const refund = await stripe.refunds.create({
            payment_intent: booking.stripePaymentIntentId,
            reason: 'requested_by_customer',
          });

          refundAmount = refund.amount;
          refundStatus = refund.status === 'succeeded' ? 'processed' : 'pending';
          
          console.log(`✅ [Cancellation] Refund ${refund.status}: ${refundAmount} cents`);
        } catch (stripeError: any) {
          console.error("❌ [Cancellation] Stripe refund error:", stripeError.message);
          refundStatus = 'failed';
          // Continue with cancellation even if refund fails
        }
      } else if (!isEligibleForRefund && booking.paymentStatus === 'paid') {
        console.log(`❌ [Cancellation] Not eligible for refund - less than 7 days before print deadline`);
        refundStatus = 'no_refund';
      }

      // Cancel the booking in storage
      const cancelledBooking = await storage.cancelBooking(bookingId, {
        refundAmount,
        refundStatus,
      });

      if (!cancelledBooking) {
        return res.status(500).json({ message: "Failed to cancel booking" });
      }

      // Create admin notification for cancelled booking
      await storage.createNotification('booking_cancelled', bookingId);

      console.log(`✅ [Cancellation] Booking ${bookingId} cancelled successfully`);

      res.json({
        message: "Booking cancelled successfully",
        booking: cancelledBooking,
        refund: {
          eligible: isEligibleForRefund,
          amount: refundAmount,
          status: refundStatus,
          message: refundStatus === 'processed' ? `Refund of $${(refundAmount / 100).toFixed(2)} processing` :
                   refundStatus === 'pending' ? `Refund of $${(refundAmount / 100).toFixed(2)} pending` :
                   refundStatus === 'no_refund' ? 'No refund - within 7 days of print deadline' :
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
      const validatedData = insertBookingSchema.extend({
        businessName: z.string().min(1, "Business name is required"),
        contactEmail: z.string().email("Valid email is required"),
        contactPhone: z.string().optional(),
        userId: z.string().optional(),
      }).parse(req.body);

      // Check if campaign exists
      const campaign = await storage.getCampaign(validatedData.campaignId);
      if (!campaign) {
        return res.status(400).json({ message: "Campaign not found" });
      }

      // Check if slot is already booked
      const existingBooking = await storage.getBooking(
        validatedData.campaignId,
        validatedData.routeId,
        validatedData.industryId
      );

      if (existingBooking) {
        return res.status(400).json({ message: "Slot already booked" });
      }

      // Create admin booking with mock user ID if not provided
      const bookingData = {
        ...validatedData,
        userId: validatedData.userId || req.user.id,
        paymentId: `admin_booking_${Date.now()}`,
        status: "confirmed" as const,
        amount: validatedData.amount || 60000,
      };

      const booking = await storage.createBooking(bookingData);
      res.status(201).json(booking);
    } catch (error) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid booking data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create slot booking" });
    }
  });

  app.delete("/api/slots/:bookingId", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { bookingId } = req.params;
      const success = await storage.deleteBooking(bookingId);
      
      if (!success) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      res.json({ message: "Booking cancelled successfully" });
    } catch (error) {
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

  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const routes = await storage.getAllRoutes();
      const campaigns = await storage.getAllCampaigns();
      const allBookings = await storage.getAllBookings();
      
      let bookings;
      if (req.user.role === "admin") {
        bookings = allBookings;
      } else {
        bookings = await storage.getBookingsByUser(req.user.id);
      }

      // Calculate admin-specific metrics
      if (req.user.role === "admin") {
        // Find current month's campaign (based on mail date)
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        
        // Find campaign whose mail date is in the current month
        const currentCampaign = campaigns.find(c => {
          if (!c.mailDate) return false;
          const mailDate = new Date(c.mailDate);
          return mailDate.getFullYear() === currentYear && mailDate.getMonth() === currentMonth;
        });

        // If we have a current campaign, get its specific stats
        if (currentCampaign) {
          // Get bookings for this specific campaign
          const campaignBookings = allBookings.filter(b => 
            b.campaignId === currentCampaign.id && b.status !== 'canceled'
          );
          
          // Revenue from paid bookings in this campaign
          const campaignRevenue = campaignBookings
            .filter(b => b.paymentStatus === 'paid')
            .reduce((sum, booking) => sum + booking.amount, 0);

          res.json({
            campaignId: currentCampaign.id,
            campaignName: currentCampaign.name,
            slotsBooked: currentCampaign.bookedSlots,
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
            totalSlots: 64,
            printDeadline: null,
            mailDeadline: null,
            revenueThisMonth: 0,
          });
        }
      } else {
        // Customer stats
        const totalRevenue = bookings.reduce((sum, booking) => sum + booking.amount, 0);
        const availableSlots = routes.length * 16 - allBookings.length;

        res.json({
          activeRoutes: routes.length,
          availableSlots,
          totalRevenue: totalRevenue / 100,
          bookedCampaigns: bookings.length,
        });
      }
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

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
      
      res.json({
        newBookings: newBookings.length,
        artworkReviews: artworkReviews.length,
        canceledBookings: canceledBookings.length,
        total: newBookings.length + artworkReviews.length + canceledBookings.length,
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

  const httpServer = createServer(app);
  return httpServer;
}
