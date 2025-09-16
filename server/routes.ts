import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertBookingSchema } from "@shared/schema";

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

  // Industries
  app.get("/api/industries", async (req, res) => {
    try {
      const industries = await storage.getAllIndustries();
      res.json(industries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch industries" });
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

      res.status(201).json(booking);
    } catch (error) {
      console.error("Booking error:", error);
      res.status(400).json({ message: "Invalid booking data" });
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
