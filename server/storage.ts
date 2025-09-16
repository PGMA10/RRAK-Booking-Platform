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
  updateRoute(id: string, updates: Partial<Route>): Promise<Route | undefined>;
  deleteRoute(id: string): Promise<boolean>;
  
  // Industries
  getAllIndustries(): Promise<Industry[]>;
  getIndustry(id: string): Promise<Industry | undefined>;
  createIndustry(industry: InsertIndustry): Promise<Industry>;
  updateIndustry(id: string, updates: Partial<Industry>): Promise<Industry | undefined>;
  deleteIndustry(id: string): Promise<boolean>;
  
  // Campaigns
  getAllCampaigns(): Promise<Campaign[]>;
  getCampaign(id: string): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign | undefined>;
  deleteCampaign(id: string): Promise<boolean>;
  
  // Bookings
  getAllBookings(): Promise<Booking[]>;
  getBookingsByUser(userId: string): Promise<Booking[]>;
  getBookingsByCampaign(campaignId: string): Promise<Booking[]>;
  getBooking(campaignId: string, routeId: string, industryId: string): Promise<Booking | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  deleteBooking(id: string): Promise<boolean>;
  
  // Slot Grid Operations
  getSlotGrid(campaignId: string): Promise<{
    slots: Array<{
      routeId: string;
      industryId: string;
      route: Route;
      industry: Industry;
      booking?: Booking;
      status: 'available' | 'booked' | 'pending';
    }>;
    summary: {
      totalSlots: number;
      availableSlots: number;
      bookedSlots: number;
      pendingSlots: number;
      totalRevenue: number;
    };
  }>;
  
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
      { zipCode: "99502", name: "Downtown/Midtown", description: "Central Anchorage business district", householdCount: 18500, status: "active" },
      { zipCode: "99507", name: "South Anchorage", description: "Residential and commercial areas", householdCount: 22300, status: "active" },
      { zipCode: "99515", name: "Hillside", description: "Hillside residential area", householdCount: 12800, status: "active" },
      { zipCode: "99516", name: "Abbott Loop", description: "Abbott Loop area", householdCount: 15600, status: "active" },
    ];

    routeData.forEach(data => {
      const id = randomUUID();
      const route: Route = { id, ...data };
      this.routes.set(id, route);
    });

    // Initialize industries with the 16 standard categories
    const industryData = [
      { name: "Financial Advisors", description: "Financial planning and investment advisory services", icon: "fas fa-dollar-sign", status: "active" },
      { name: "Accountants", description: "Tax preparation, bookkeeping, and accounting services", icon: "fas fa-calculator", status: "active" },
      { name: "Electricians", description: "Electrical installation, repair, and maintenance services", icon: "fas fa-bolt", status: "active" },
      { name: "Plumbers/HVAC", description: "Plumbing and heating, ventilation, air conditioning services", icon: "fas fa-wrench", status: "active" },
      { name: "Clothing Stores", description: "Retail clothing and fashion merchandise businesses", icon: "fas fa-tshirt", status: "active" },
      { name: "Residential Cleaners", description: "House cleaning and residential maintenance services", icon: "fas fa-broom", status: "active" },
      { name: "Dog Walkers", description: "Pet walking and basic pet care services", icon: "fas fa-dog", status: "active" },
      { name: "Restaurants", description: "Food service establishments and dining businesses", icon: "fas fa-utensils", status: "active" },
      { name: "Auto Services", description: "Vehicle repair, maintenance, and automotive services", icon: "fas fa-car", status: "active" },
      { name: "Hair/Beauty Salons", description: "Hair styling, beauty treatments, and salon services", icon: "fas fa-cut", status: "active" },
      { name: "Home Services", description: "General home improvement and maintenance contractors", icon: "fas fa-home", status: "active" },
      { name: "Health/Fitness", description: "Fitness centers, personal training, and wellness services", icon: "fas fa-heartbeat", status: "active" },
      { name: "Real Estate", description: "Property sales, rental, and real estate brokerage services", icon: "fas fa-house-user", status: "active" },
      { name: "Legal Services", description: "Attorney services, legal consultation, and law practices", icon: "fas fa-gavel", status: "active" },
      { name: "Pet Services", description: "Veterinary care, grooming, and comprehensive pet services", icon: "fas fa-paw", status: "active" },
      { name: "Other Services", description: "Miscellaneous professional and business services", icon: "fas fa-briefcase", status: "active" },
    ];

    industryData.forEach(data => {
      const id = randomUUID();
      const industry: Industry = { id, ...data };
      this.industries.set(id, industry);
    });

    // Initialize campaigns with demo data
    const demoCampaigns: Campaign[] = [
      {
        id: randomUUID(),
        name: "December 2024 Holiday Campaign",
        mailDate: new Date("2024-12-15"),
        status: "booking_open",
        totalSlots: 64,
        bookedSlots: 12,
        revenue: 720000, // 12 slots * $600 in cents
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "January 2025 New Year Campaign",
        mailDate: new Date("2025-01-20"),
        status: "planning",
        totalSlots: 64,
        bookedSlots: 0,
        revenue: 0,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "October 2024 Fall Campaign",
        mailDate: new Date("2024-10-15"),
        status: "completed",
        totalSlots: 64,
        bookedSlots: 64,
        revenue: 3840000, // 64 slots * $600 in cents
        createdAt: new Date(),
      },
    ];
    
    demoCampaigns.forEach(campaign => {
      this.campaigns.set(campaign.id, campaign);
    });

    // Create admin user with hashed password
    const adminId = randomUUID();
    const admin: User = {
      id: adminId,
      username: "admin",
      password: "ba871dfcf85682e9ddc05e969ee0ad43337ad1ec359a57a80b94bb13fc8f59853e018794036e1e9dbcd796b75f1db492c4c6fdcc84c6b333c6ef00ca80b6952d.1f78feb5b13e4ca906bc3ea6ef286c12", // Properly hashed "admin" password
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
    const route: Route = { 
      ...insertRoute, 
      id, 
      description: insertRoute.description || null,
      status: insertRoute.status || "active"
    };
    this.routes.set(id, route);
    return route;
  }

  async updateRoute(id: string, updates: Partial<Route>): Promise<Route | undefined> {
    const existingRoute = this.routes.get(id);
    if (!existingRoute) return undefined;
    
    const updatedRoute: Route = { ...existingRoute, ...updates, id }; // Ensure ID cannot be changed
    this.routes.set(id, updatedRoute);
    return updatedRoute;
  }

  async deleteRoute(id: string): Promise<boolean> {
    return this.routes.delete(id);
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
    const industry: Industry = { 
      ...insertIndustry, 
      id,
      description: insertIndustry.description || null,
      status: insertIndustry.status || "active"
    };
    this.industries.set(id, industry);
    return industry;
  }

  async updateIndustry(id: string, updates: Partial<Industry>): Promise<Industry | undefined> {
    const existingIndustry = this.industries.get(id);
    if (!existingIndustry) return undefined;
    
    const updatedIndustry: Industry = { ...existingIndustry, ...updates, id }; // Ensure ID cannot be changed
    this.industries.set(id, updatedIndustry);
    return updatedIndustry;
  }

  async deleteIndustry(id: string): Promise<boolean> {
    return this.industries.delete(id);
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
      status: insertCampaign.status || "planning",
      totalSlots: insertCampaign.totalSlots || 64,
      bookedSlots: insertCampaign.bookedSlots || 0,
      revenue: insertCampaign.revenue || 0,
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

  async deleteCampaign(id: string): Promise<boolean> {
    return this.campaigns.delete(id);
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
    
    // Update campaign booked slots count and revenue
    const campaign = this.campaigns.get(insertBooking.campaignId);
    if (campaign) {
      const updatedCampaign = { 
        ...campaign, 
        bookedSlots: campaign.bookedSlots + 1,
        revenue: campaign.revenue + booking.amount
      };
      this.campaigns.set(campaign.id, updatedCampaign);
    }
    
    return booking;
  }

  async deleteBooking(id: string): Promise<boolean> {
    const booking = this.bookings.get(id);
    if (!booking) {
      return false;
    }
    
    // Update campaign booked slots count and revenue
    const campaign = this.campaigns.get(booking.campaignId);
    if (campaign) {
      const updatedCampaign = { 
        ...campaign, 
        bookedSlots: Math.max(0, campaign.bookedSlots - 1),
        revenue: Math.max(0, campaign.revenue - booking.amount)
      };
      this.campaigns.set(campaign.id, updatedCampaign);
    }
    
    this.bookings.delete(id);
    return true;
  }

  async getSlotGrid(campaignId: string) {
    const routes = Array.from(this.routes.values()).filter(r => r.status === 'active');
    const industries = Array.from(this.industries.values()).filter(i => i.status === 'active');
    const bookings = Array.from(this.bookings.values()).filter(b => b.campaignId === campaignId);
    
    const slots = [];
    let availableSlots = 0;
    let bookedSlots = 0;
    let pendingSlots = 0;
    let totalRevenue = 0;
    
    for (const route of routes) {
      for (const industry of industries) {
        const booking = bookings.find(b => b.routeId === route.id && b.industryId === industry.id);
        
        let status: 'available' | 'booked' | 'pending' = 'available';
        if (booking) {
          status = booking.status === 'pending' ? 'pending' : 'booked';
          if (status === 'booked') {
            bookedSlots++;
            totalRevenue += booking.amount;
          } else {
            pendingSlots++;
          }
        } else {
          availableSlots++;
        }
        
        slots.push({
          routeId: route.id,
          industryId: industry.id,
          route,
          industry,
          booking,
          status,
        });
      }
    }
    
    return {
      slots,
      summary: {
        totalSlots: routes.length * industries.length,
        availableSlots,
        bookedSlots,
        pendingSlots,
        totalRevenue,
      },
    };
  }
}

export const storage = new MemStorage();
