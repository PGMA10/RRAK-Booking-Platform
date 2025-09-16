import { randomUUID } from "crypto";
import session from "express-session";
import createMemoryStore from "memorystore";
import {
  type User,
  type InsertUser,
  type Route,
  type InsertRoute,
  type Industry,
  type InsertIndustry,
  type Campaign,
  type InsertCampaign,
  type Booking,
  type InsertBooking,
} from "@shared/schema";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Routes
  getAllRoutes(): Promise<Route[]>;
  getRoute(id: string): Promise<Route | undefined>;
  createRoute(route: InsertRoute): Promise<Route>;
  
  // Industries
  getAllIndustries(): Promise<Industry[]>;
  getIndustry(id: string): Promise<Industry | undefined>;
  createIndustry(industry: InsertIndustry): Promise<Industry>;
  
  // Campaigns
  getAllCampaigns(): Promise<Campaign[]>;
  getCampaign(id: string): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign | undefined>;
  
  // Bookings
  getAllBookings(): Promise<Booking[]>;
  getBookingsByUser(userId: string): Promise<Booking[]>;
  getBookingsByCampaign(campaignId: string): Promise<Booking[]>;
  getBooking(campaignId: string, routeId: string, industryId: string): Promise<Booking | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private routes: Map<string, Route> = new Map();
  private industries: Map<string, Industry> = new Map();
  private campaigns: Map<string, Campaign> = new Map();
  private bookings: Map<string, Booking> = new Map();
  public sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
    
    this.initializeData();
  }

  private initializeData() {
    // Initialize routes
    const routeData = [
      { zipCode: "99502", name: "Downtown/Midtown", description: "Central Anchorage business district" },
      { zipCode: "99507", name: "South Anchorage", description: "Residential and commercial areas" },
      { zipCode: "99515", name: "Hillside", description: "Hillside residential area" },
      { zipCode: "99516", name: "Abbott Loop", description: "Abbott Loop area" },
    ];

    routeData.forEach(data => {
      const id = randomUUID();
      const route: Route = { id, ...data };
      this.routes.set(id, route);
    });

    // Initialize industries
    const industryData = [
      { name: "Financial Services", icon: "fas fa-dollar-sign" },
      { name: "Electricians", icon: "fas fa-bolt" },
      { name: "Plumbers", icon: "fas fa-wrench" },
      { name: "Construction", icon: "fas fa-hammer" },
      { name: "Auto Services", icon: "fas fa-car" },
      { name: "Real Estate", icon: "fas fa-home" },
      { name: "Healthcare", icon: "fas fa-heartbeat" },
      { name: "Legal Services", icon: "fas fa-gavel" },
      { name: "Insurance", icon: "fas fa-shield-alt" },
      { name: "HVAC", icon: "fas fa-temperature-high" },
      { name: "Roofing", icon: "fas fa-house-damage" },
      { name: "Landscaping", icon: "fas fa-tree" },
      { name: "Cleaning Services", icon: "fas fa-broom" },
      { name: "Security", icon: "fas fa-shield" },
      { name: "IT Services", icon: "fas fa-laptop" },
      { name: "Restaurants", icon: "fas fa-utensils" },
    ];

    industryData.forEach(data => {
      const id = randomUUID();
      const industry: Industry = { id, ...data };
      this.industries.set(id, industry);
    });

    // Initialize campaigns
    const currentCampaign: Campaign = {
      id: randomUUID(),
      name: "January 2025",
      scheduledDate: new Date("2025-01-15"),
      status: "open",
      totalSlots: 64,
      bookedSlots: 0,
      createdAt: new Date(),
    };
    this.campaigns.set(currentCampaign.id, currentCampaign);

    // Create admin user with hashed password
    const adminId = randomUUID();
    const admin: User = {
      id: adminId,
      username: "admin",
      password: "admin", // Demo password - handled specially in auth.ts
      email: "admin@routereach.com",
      businessName: "Route Reach AK",
      phone: "(907) 555-0100",
      role: "admin",
      createdAt: new Date(),
    };
    this.users.set(adminId, admin);
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      role: "customer",
      createdAt: new Date(),
      businessName: insertUser.businessName || null,
      phone: insertUser.phone || null,
    };
    this.users.set(id, user);
    return user;
  }

  // Routes
  async getAllRoutes(): Promise<Route[]> {
    return Array.from(this.routes.values());
  }

  async getRoute(id: string): Promise<Route | undefined> {
    return this.routes.get(id);
  }

  async createRoute(insertRoute: InsertRoute): Promise<Route> {
    const id = randomUUID();
    const route: Route = { ...insertRoute, id, description: insertRoute.description || null };
    this.routes.set(id, route);
    return route;
  }

  // Industries
  async getAllIndustries(): Promise<Industry[]> {
    return Array.from(this.industries.values());
  }

  async getIndustry(id: string): Promise<Industry | undefined> {
    return this.industries.get(id);
  }

  async createIndustry(insertIndustry: InsertIndustry): Promise<Industry> {
    const id = randomUUID();
    const industry: Industry = { ...insertIndustry, id };
    this.industries.set(id, industry);
    return industry;
  }

  // Campaigns
  async getAllCampaigns(): Promise<Campaign[]> {
    return Array.from(this.campaigns.values());
  }

  async getCampaign(id: string): Promise<Campaign | undefined> {
    return this.campaigns.get(id);
  }

  async createCampaign(insertCampaign: InsertCampaign): Promise<Campaign> {
    const id = randomUUID();
    const campaign: Campaign = {
      ...insertCampaign,
      id,
      createdAt: new Date(),
      status: insertCampaign.status || "open",
      totalSlots: insertCampaign.totalSlots || 64,
      bookedSlots: insertCampaign.bookedSlots || 0,
    };
    this.campaigns.set(id, campaign);
    return campaign;
  }

  async updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign | undefined> {
    const campaign = this.campaigns.get(id);
    if (!campaign) return undefined;
    
    const updatedCampaign = { ...campaign, ...updates };
    this.campaigns.set(id, updatedCampaign);
    return updatedCampaign;
  }

  // Bookings
  async getAllBookings(): Promise<Booking[]> {
    return Array.from(this.bookings.values());
  }

  async getBookingsByUser(userId: string): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(booking => booking.userId === userId);
  }

  async getBookingsByCampaign(campaignId: string): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(booking => booking.campaignId === campaignId);
  }

  async getBooking(campaignId: string, routeId: string, industryId: string): Promise<Booking | undefined> {
    return Array.from(this.bookings.values()).find(
      booking => booking.campaignId === campaignId && 
                 booking.routeId === routeId && 
                 booking.industryId === industryId
    );
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const id = randomUUID();
    const booking: Booking = {
      ...insertBooking,
      id,
      createdAt: new Date(),
      status: insertBooking.status || "confirmed",
      licenseNumber: insertBooking.licenseNumber || null,
      contactPhone: insertBooking.contactPhone || null,
      paymentId: insertBooking.paymentId || null,
      amount: insertBooking.amount || 60000,
    };
    this.bookings.set(id, booking);
    
    // Update campaign booked slots count
    const campaign = this.campaigns.get(insertBooking.campaignId);
    if (campaign) {
      const updatedCampaign = { ...campaign, bookedSlots: campaign.bookedSlots + 1 };
      this.campaigns.set(campaign.id, updatedCampaign);
    }
    
    return booking;
  }
}

export const storage = new MemStorage();
