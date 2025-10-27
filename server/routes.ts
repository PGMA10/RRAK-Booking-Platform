import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertBookingSchema, insertRouteSchema, insertIndustrySchema, insertCampaignSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";

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
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const campaignValidationSchema = insertCampaignSchema.extend({
        name: z.string().min(1, "Campaign name is required").max(100, "Campaign name too long"),
        mailDate: z.coerce.date().refine((date) => {
          const now = new Date();
          return date > now;
        }, "Mail date must be in the future"),
        status: z.enum(["planning", "booking_open", "booking_closed", "printed", "mailed", "completed"]).default("planning"),
      });
      
      const campaignData = campaignValidationSchema.parse(req.body);
      
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
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid campaign data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create campaign" });
    }
  });

  app.put("/api/campaigns/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const campaignValidationSchema = insertCampaignSchema.extend({
        name: z.string().min(1, "Campaign name is required").max(100, "Campaign name too long"),
        mailDate: z.coerce.date().refine((date) => {
          const now = new Date();
          return date > now;
        }, "Mail date must be in the future"),
        status: z.enum(["planning", "booking_open", "booking_closed", "printed", "mailed", "completed"]),
      }).partial();
      
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
        if (campaignData.name || campaignData.mailDate) {
          return res.status(400).json({ 
            message: "Cannot modify campaign name or mail date after booking is closed" 
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
      const booking = await storage.getBooking(campaignId, routeId, industryId);
      res.json({ available: !booking });
    } catch (error) {
      res.status(500).json({ message: "Failed to check availability" });
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

      // Mock payment processing
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

      const totalRevenue = bookings.reduce((sum, booking) => sum + booking.amount, 0);
      const availableSlots = routes.length * 16 - allBookings.length;

      res.json({
        activeRoutes: routes.length,
        availableSlots,
        totalRevenue: totalRevenue / 100, // Convert cents to dollars
        bookedCampaigns: bookings.length,
        totalCustomers: req.user.role === "admin" ? (await storage.getAllBookings()).length : undefined,
        occupancyRate: req.user.role === "admin" ? Math.round((allBookings.length / (routes.length * 16)) * 100) : undefined,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
