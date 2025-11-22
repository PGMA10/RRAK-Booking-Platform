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
  type IndustrySubcategory,
  type InsertIndustrySubcategory,
  type Campaign,
  type InsertCampaign,
  type Booking,
  type InsertBooking,
  type BookingWithDetails,
  type DesignRevision,
  type InsertDesignRevision,
  type AdminSetting,
} from "@shared/schema";
import { db } from "./db-sqlite";
import { users as usersTable, routes as routesTable, industries as industriesTable, industrySubcategories as industrySubcategoriesTable, campaigns as campaignsTable, campaignRoutes as campaignRoutesTable, campaignIndustries as campaignIndustriesTable, bookings as bookingsTable, dismissedNotifications as dismissedNotificationsTable, designRevisions as designRevisionsTable, adminSettings as adminSettingsTable } from "@shared/schema";
import { eq, and, sql, ne } from "drizzle-orm";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // Users
  getAllUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserLoyalty(id: string, loyalty: {
    loyaltySlotsEarned?: number;
    loyaltyDiscountsAvailable?: number;
    loyaltyYearReset?: number;
  }): Promise<User | undefined>;
  
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
  
  // Industry Subcategories
  getSubcategoriesByIndustry(industryId: string): Promise<IndustrySubcategory[]>;
  getAllSubcategories(): Promise<IndustrySubcategory[]>;
  getSubcategory(id: string): Promise<IndustrySubcategory | undefined>;
  createSubcategory(subcategory: InsertIndustrySubcategory): Promise<IndustrySubcategory>;
  
  // Campaigns
  getAllCampaigns(): Promise<Campaign[]>;
  getCampaign(id: string): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign | undefined>;
  deleteCampaign(id: string): Promise<boolean>;
  
  // Campaign Routes & Industries (per-campaign availability)
  getCampaignRoutes(campaignId: string): Promise<Route[]>;
  getCampaignIndustries(campaignId: string): Promise<Industry[]>;
  addRouteToCampaign(campaignId: string, routeId: string): Promise<void>;
  addIndustryToCampaign(campaignId: string, industryId: string): Promise<void>;
  removeRouteFromCampaign(campaignId: string, routeId: string): Promise<void>;
  removeIndustryFromCampaign(campaignId: string, industryId: string): Promise<void>;
  setCampaignRoutes(campaignId: string, routeIds: string[]): Promise<void>;
  setCampaignIndustries(campaignId: string, industryIds: string[]): Promise<void>;
  
  // Bookings
  getAllBookings(): Promise<Booking[]>;
  getBookingsByUser(userId: string): Promise<Booking[]>;
  getBookingsByCampaign(campaignId: string): Promise<Booking[]>;
  getBooking(campaignId: string, routeId: string, industryId: string): Promise<Booking | undefined>;
  getBookingById(id: string): Promise<Booking | undefined>;
  getBookingByStripeSessionId(sessionId: string): Promise<BookingWithDetails | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: string, updates: Partial<Booking>): Promise<Booking | undefined>;
  updateBookingPaymentStatus(id: string, paymentStatus: string, paymentData: {
    stripePaymentIntentId?: string;
    amountPaid?: number;
    paidAt?: Date;
  }): Promise<Booking | undefined>;
  cancelBooking(id: string, refundData: {
    refundAmount: number;
    refundStatus: 'pending' | 'processed' | 'no_refund' | 'failed';
  }): Promise<{ booking: Booking; cancelledNow: boolean } | undefined>;
  approveBooking(id: string): Promise<Booking | undefined>;
  rejectBooking(id: string, rejectionNote: string): Promise<Booking | undefined>;
  deleteBooking(id: string): Promise<boolean>;
  getBookingsNeedingReview(): Promise<Booking[]>;
  
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
  
  // Admin Notifications
  getUnhandledNotificationsCount(userId?: string): Promise<number>;
  getNotificationsByType(type: string, userId?: string): Promise<any[]>;
  getAllUnhandledNotifications(userId?: string): Promise<any[]>;
  markNotificationHandled(notificationId: string): Promise<boolean>;
  createNotification(type: string, bookingId: string): Promise<void>;
  
  // Dismissed Notifications
  createDismissedNotification(bookingId: string, notificationType: string, userId: string): Promise<void>;
  getDismissedNotificationsByUser(userId: string): Promise<Array<{bookingId: string, notificationType: string}>>;
  
  // CRM - Customer Management
  getCustomers(filters?: {
    search?: string;
    tag?: string;
    highValue?: boolean;
    sortBy?: 'name' | 'totalSpent' | 'lastBooking' | 'signupDate';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Array<User & {
    totalSpent: number;
    bookingCount: number;
    lastBookingDate?: Date;
    tags: string[];
  }>>;
  
  getCustomerDetails(customerId: string): Promise<{
    customer: User;
    bookings: BookingWithDetails[];
    notes: Array<{
      id: string;
      note: string;
      createdBy: string;
      createdByName: string;
      createdAt: Date;
    }>;
    tags: string[];
    lifetimeValue: number;
    bookingCount: number;
    lastBookingDate?: Date;
  } | undefined>;
  
  addCustomerNote(customerId: string, note: string, createdBy: string): Promise<void>;
  addCustomerTag(customerId: string, tag: string, createdBy: string): Promise<void>;
  removeCustomerTag(customerId: string, tag: string): Promise<void>;
  
  // Design Revisions
  createDesignRevision(designRevision: InsertDesignRevision): Promise<DesignRevision>;
  getDesignRevisionById(id: string): Promise<DesignRevision | undefined>;
  getDesignRevisionsByBooking(bookingId: string): Promise<DesignRevision[]>;
  getLatestDesignRevision(bookingId: string): Promise<DesignRevision | undefined>;
  updateDesignRevisionStatus(id: string, status: string, customerFeedback?: string): Promise<DesignRevision | undefined>;
  
  // Admin Settings
  getAllAdminSettings(): Promise<AdminSetting[]>;
  getAdminSetting(key: string): Promise<AdminSetting | undefined>;
  setAdminSetting(key: string, value: string, description?: string, updatedBy?: string): Promise<AdminSetting>;
  
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private routes: Map<string, Route> = new Map();
  private industries: Map<string, Industry> = new Map();
  private campaigns: Map<string, Campaign> = new Map();
  private campaignRoutes: Map<string, Set<string>> = new Map(); // campaignId -> Set of routeIds
  private campaignIndustries: Map<string, Set<string>> = new Map(); // campaignId -> Set of industryIds
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
        printDeadline: new Date("2024-12-08"),
        status: "booking_open",
        totalSlots: 64,
        bookedSlots: 12,
        revenue: 720000, // 12 slots * $600 in cents
        baseSlotPrice: null,
        additionalSlotPrice: null,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "January 2025 New Year Campaign",
        mailDate: new Date("2025-01-20"),
        printDeadline: new Date("2025-01-13"),
        status: "planning",
        totalSlots: 64,
        bookedSlots: 0,
        revenue: 0,
        baseSlotPrice: null,
        additionalSlotPrice: null,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "October 2024 Fall Campaign",
        mailDate: new Date("2024-10-15"),
        printDeadline: new Date("2024-10-08"),
        status: "completed",
        totalSlots: 64,
        bookedSlots: 64,
        revenue: 3840000, // 64 slots * $600 in cents
        baseSlotPrice: null,
        additionalSlotPrice: null,
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
      password: "ba871dfcf85682e9ddc05e969ee0ad43337ad1ec359a57a80b94bb13fc8f59853e018794036e1e9dbcd796b75f1db492c4c6fdcc84c6b333c6ef00ca80b6952d.1f78feb5b13e4ca906bc3ea6ef286c12", // Properly hashed "admin123" password
      email: "admin@routereach.com",
      name: null,
      businessName: "Route Reach AK",
      phone: "(907) 555-0100",
      role: "admin",
      marketingOptIn: false,
      referredByUserId: null,
      referralCode: null,
      loyaltySlotsEarned: 0,
      loyaltyDiscountsAvailable: 0,
      loyaltyYearReset: new Date().getFullYear(),
      createdAt: new Date(),
    };
    this.users.set(adminId, admin);

    // Create demo customer user
    const customerId = randomUUID();
    const customer: User = {
      id: customerId,
      username: "testcustomer",
      password: "c7d9405106394717c712a878c6eab463c796894cd0af694c58529ad81b690adf32c4c3d54a62811532811d964c6e325234cc8abfcbc06cec0591aa600d2653c9.2dab11e33b68071db53ebd0fcb3a4262", // Hashed "customer123" password
      email: "testcustomer@example.com",
      name: null,
      businessName: "Test Business LLC",
      phone: "(907) 555-0123",
      role: "customer",
      marketingOptIn: false,
      referredByUserId: null,
      referralCode: null,
      loyaltySlotsEarned: 0,
      loyaltyDiscountsAvailable: 0,
      loyaltyYearReset: new Date().getFullYear(),
      createdAt: new Date(),
    };
    this.users.set(customerId, customer);
  }

  // Users
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

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
      name: insertUser.name ?? null,
      businessName: insertUser.businessName || null,
      phone: insertUser.phone || null,
      marketingOptIn: false,
      referredByUserId: null,
      referralCode: null,
      loyaltySlotsEarned: 0,
      loyaltyDiscountsAvailable: 0,
      loyaltyYearReset: new Date().getFullYear(),
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
      status: insertRoute.status || "active",
      householdCount: insertRoute.householdCount || 0
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

  // Industry Subcategories (stub implementations - not used in production)
  async getSubcategoriesByIndustry(industryId: string): Promise<IndustrySubcategory[]> {
    return [];
  }

  async getAllSubcategories(): Promise<IndustrySubcategory[]> {
    return [];
  }

  async getSubcategory(id: string): Promise<IndustrySubcategory | undefined> {
    return undefined;
  }

  async createSubcategory(subcategory: InsertIndustrySubcategory): Promise<IndustrySubcategory> {
    throw new Error("Subcategories not supported in MemStorage - use DbStorage instead");
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
      baseSlotPrice: insertCampaign.baseSlotPrice ?? null,
      additionalSlotPrice: insertCampaign.additionalSlotPrice ?? null,
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
    this.campaignRoutes.delete(id);
    this.campaignIndustries.delete(id);
    return this.campaigns.delete(id);
  }

  // Campaign Routes & Industries (per-campaign availability)
  async getCampaignRoutes(campaignId: string): Promise<Route[]> {
    const routeIds = this.campaignRoutes.get(campaignId) || new Set();
    return Array.from(routeIds)
      .map(id => this.routes.get(id))
      .filter((route): route is Route => route !== undefined);
  }

  async getCampaignIndustries(campaignId: string): Promise<Industry[]> {
    const industryIds = this.campaignIndustries.get(campaignId) || new Set();
    return Array.from(industryIds)
      .map(id => this.industries.get(id))
      .filter((industry): industry is Industry => industry !== undefined);
  }

  async addRouteToCampaign(campaignId: string, routeId: string): Promise<void> {
    if (!this.campaignRoutes.has(campaignId)) {
      this.campaignRoutes.set(campaignId, new Set());
    }
    this.campaignRoutes.get(campaignId)!.add(routeId);
  }

  async addIndustryToCampaign(campaignId: string, industryId: string): Promise<void> {
    if (!this.campaignIndustries.has(campaignId)) {
      this.campaignIndustries.set(campaignId, new Set());
    }
    this.campaignIndustries.get(campaignId)!.add(industryId);
  }

  async removeRouteFromCampaign(campaignId: string, routeId: string): Promise<void> {
    this.campaignRoutes.get(campaignId)?.delete(routeId);
  }

  async removeIndustryFromCampaign(campaignId: string, industryId: string): Promise<void> {
    this.campaignIndustries.get(campaignId)?.delete(industryId);
  }

  async setCampaignRoutes(campaignId: string, routeIds: string[]): Promise<void> {
    this.campaignRoutes.set(campaignId, new Set(routeIds));
    
    // Update campaign total slots
    const campaign = this.campaigns.get(campaignId);
    if (campaign) {
      const industries = await this.getCampaignIndustries(campaignId);
      const totalSlots = routeIds.length * industries.length;
      campaign.totalSlots = totalSlots;
      this.campaigns.set(campaignId, campaign);
    }
  }

  async setCampaignIndustries(campaignId: string, industryIds: string[]): Promise<void> {
    this.campaignIndustries.set(campaignId, new Set(industryIds));
    
    // Update campaign total slots
    const campaign = this.campaigns.get(campaignId);
    if (campaign) {
      const routes = await this.getCampaignRoutes(campaignId);
      const totalSlots = routes.length * industryIds.length;
      campaign.totalSlots = totalSlots;
      this.campaigns.set(campaignId, campaign);
    }
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

  async getBookingById(id: string): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const id = randomUUID();
    const quantity = insertBooking.quantity || 1;
    const booking: Booking = {
      ...insertBooking,
      id,
      createdAt: new Date(),
      status: insertBooking.status || "pending",
      industryDescription: insertBooking.industryDescription ?? null,
      contactPhone: insertBooking.contactPhone || null,
      paymentId: insertBooking.paymentId || null,
      amount: insertBooking.amount || 60000,
      paymentStatus: insertBooking.paymentStatus || "pending",
      stripeCheckoutSessionId: insertBooking.stripeCheckoutSessionId || null,
      stripePaymentIntentId: insertBooking.stripePaymentIntentId || null,
      amountPaid: insertBooking.amountPaid || null,
      paidAt: insertBooking.paidAt || null,
      artworkStatus: insertBooking.artworkStatus || "pending_upload",
      artworkFilePath: insertBooking.artworkFilePath || null,
      artworkFileName: insertBooking.artworkFileName || null,
      artworkUploadedAt: insertBooking.artworkUploadedAt || null,
      artworkReviewedAt: insertBooking.artworkReviewedAt || null,
      artworkRejectionReason: insertBooking.artworkRejectionReason || null,
      quantity,
    };
    this.bookings.set(id, booking);
    
    // Update campaign booked slots count and revenue by quantity
    const campaign = this.campaigns.get(insertBooking.campaignId);
    if (campaign) {
      const updatedCampaign = { 
        ...campaign, 
        bookedSlots: campaign.bookedSlots + quantity,
        revenue: campaign.revenue + booking.amount
      };
      this.campaigns.set(campaign.id, updatedCampaign);
    }
    
    return booking;
  }

  async getBookingByStripeSessionId(sessionId: string): Promise<BookingWithDetails | undefined> {
    const booking = Array.from(this.bookings.values()).find(b => b.stripeCheckoutSessionId === sessionId);
    if (!booking) return undefined;
    
    // Add related data
    const route = this.routes.get(booking.routeId);
    const industry = this.industries.get(booking.industryId);
    const campaign = this.campaigns.get(booking.campaignId);
    
    return {
      ...booking,
      route,
      industry,
      campaign,
    };
  }

  async updateBooking(id: string, updates: Partial<Booking>): Promise<Booking | undefined> {
    const booking = this.bookings.get(id);
    if (!booking) return undefined;
    
    const updatedBooking = { ...booking, ...updates };
    this.bookings.set(id, updatedBooking);
    return updatedBooking;
  }

  async updateBookingPaymentStatus(
    id: string,
    paymentStatus: string,
    paymentData: {
      stripePaymentIntentId?: string;
      amountPaid?: number;
      paidAt?: Date;
    }
  ): Promise<Booking | undefined> {
    const booking = this.bookings.get(id);
    if (!booking) return undefined;
    
    const updatedBooking = {
      ...booking,
      paymentStatus,
      status: paymentStatus === 'paid' ? 'confirmed' : booking.status,
      stripePaymentIntentId: paymentData.stripePaymentIntentId || booking.stripePaymentIntentId,
      amountPaid: paymentData.amountPaid || booking.amountPaid,
      paidAt: paymentData.paidAt || booking.paidAt,
      pendingSince: paymentStatus === 'paid' ? null : booking.pendingSince, // Clear pending timer when paid
    };
    this.bookings.set(id, updatedBooking);
    
    // Update campaign revenue only if payment is successful
    if (paymentStatus === 'paid' && booking.paymentStatus !== 'paid' && paymentData.amountPaid) {
      const campaign = this.campaigns.get(booking.campaignId);
      if (campaign) {
        const updatedCampaign = {
          ...campaign,
          revenue: campaign.revenue + paymentData.amountPaid
        };
        this.campaigns.set(campaign.id, updatedCampaign);
      }
    }
    
    return updatedBooking;
  }

  async cancelBooking(
    id: string,
    refundData: {
      refundAmount: number;
      refundStatus: 'pending' | 'processed' | 'no_refund' | 'failed';
    }
  ): Promise<{ booking: Booking; cancelledNow: boolean } | undefined> {
    const booking = this.bookings.get(id);
    if (!booking) return undefined;
    
    // Idempotent: if already cancelled, return existing booking without overwriting data
    if (booking.status === 'cancelled') {
      console.log(`⚠️  Booking ${id} is already cancelled, skipping duplicate cancellation`);
      return { booking, cancelledNow: false };
    }
    
    const quantity = booking.quantity || 1;
    
    const updatedBooking = {
      ...booking,
      status: 'cancelled',
      cancellationDate: new Date(),
      refundAmount: refundData.refundAmount,
      refundStatus: refundData.refundStatus,
      // Clear file path columns to prevent orphaned references after deletion
      artworkFilePath: null,
      logoFilePath: null,
      optionalImagePath: null,
    };
    this.bookings.set(id, updatedBooking);
    
    // Update campaign: decrease booked slots by quantity and revenue
    const campaign = this.campaigns.get(booking.campaignId);
    if (campaign) {
      const updatedCampaign = {
        ...campaign,
        bookedSlots: Math.max(0, campaign.bookedSlots - quantity),
        revenue: Math.max(0, campaign.revenue - (booking.amountPaid || booking.amount)),
      };
      this.campaigns.set(campaign.id, updatedCampaign);
    }
    
    return { booking: updatedBooking, cancelledNow: true };
  }

  async approveBooking(id: string): Promise<Booking | undefined> {
    const booking = this.bookings.get(id);
    if (!booking) return undefined;
    
    const updatedBooking = {
      ...booking,
      approvalStatus: 'approved',
      approvedAt: new Date(),
      rejectedAt: null,
      rejectionNote: null,
    };
    this.bookings.set(id, updatedBooking);
    return updatedBooking;
  }

  async rejectBooking(id: string, rejectionNote: string): Promise<Booking | undefined> {
    const booking = this.bookings.get(id);
    if (!booking) return undefined;
    
    const updatedBooking = {
      ...booking,
      approvalStatus: 'rejected',
      rejectedAt: new Date(),
      approvedAt: null,
      rejectionNote,
    };
    this.bookings.set(id, updatedBooking);
    return updatedBooking;
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

  async getBookingsNeedingReview(): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(booking => booking.artworkStatus === 'under_review');
  }

  async getSlotGrid(campaignId: string) {
    // Use campaign-specific routes and industries instead of global active filter
    const routes = await this.getCampaignRoutes(campaignId);
    const industries = await this.getCampaignIndustries(campaignId);
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

  // Admin Notifications - MemStorage implementations
  async getUnhandledNotificationsCount(userId?: string): Promise<number> {
    // Count based on actual booking states, not persisted notifications
    const bookings = Array.from(this.bookings.values());
    let count = 0;
    
    // New bookings (confirmed in last 24 hours)
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    count += bookings.filter(b => 
      b.status === 'confirmed' && 
      b.createdAt && 
      new Date(b.createdAt).getTime() > oneDayAgo
    ).length;
    
    // Artwork pending review
    count += bookings.filter(b => b.artworkStatus === 'under_review').length;
    
    // Canceled bookings (last 7 days)
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    count += bookings.filter(b => 
      b.status === 'cancelled' && 
      b.cancellationDate && 
      new Date(b.cancellationDate).getTime() > sevenDaysAgo
    ).length;
    
    return count;
  }

  async getNotificationsByType(type: string, userId?: string): Promise<any[]> {
    const bookings = Array.from(this.bookings.values());
    const results: any[] = [];
    
    if (type === 'new_booking') {
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      bookings
        .filter(b => b.status === 'confirmed' && b.createdAt && new Date(b.createdAt).getTime() > oneDayAgo)
        .forEach(booking => {
          results.push({
            id: `new_booking_${booking.id}`,
            type: 'new_booking',
            bookingId: booking.id,
            booking,
            createdAt: booking.createdAt,
            isHandled: false,
          });
        });
    } else if (type === 'artwork_review') {
      bookings
        .filter(b => b.artworkStatus === 'under_review')
        .forEach(booking => {
          results.push({
            id: `artwork_review_${booking.id}`,
            type: 'artwork_review',
            bookingId: booking.id,
            booking,
            createdAt: booking.artworkUploadedAt || booking.createdAt,
            isHandled: false,
          });
        });
    } else if (type === 'canceled_booking') {
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      bookings
        .filter(b => b.status === 'cancelled' && b.cancellationDate && new Date(b.cancellationDate).getTime() > sevenDaysAgo)
        .forEach(booking => {
          results.push({
            id: `canceled_booking_${booking.id}`,
            type: 'canceled_booking',
            bookingId: booking.id,
            booking,
            createdAt: booking.cancellationDate,
            isHandled: false,
          });
        });
    }
    
    return results;
  }

  async getAllUnhandledNotifications(userId?: string): Promise<any[]> {
    const newBookings = await this.getNotificationsByType('new_booking', userId);
    const artworkReviews = await this.getNotificationsByType('artwork_review', userId);
    const canceledBookings = await this.getNotificationsByType('canceled_booking', userId);
    return [...newBookings, ...artworkReviews, ...canceledBookings];
  }

  async markNotificationHandled(notificationId: string): Promise<boolean> {
    // In MemStorage, this is a no-op since we derive notifications from booking state
    return true;
  }

  async createNotification(type: string, bookingId: string): Promise<void> {
    // In MemStorage, this is a no-op since we derive notifications from booking state
  }
  
  async createDismissedNotification(bookingId: string, notificationType: string, userId: string): Promise<void> {
    // In MemStorage, this would be stored in memory - but since we're using DbStorage in production, this is minimal implementation
  }
  
  async getDismissedNotificationsByUser(userId: string): Promise<Array<{bookingId: string, notificationType: string}>> {
    // In MemStorage, return empty array
    return [];
  }
}

export class DbStorage implements IStorage {
  public sessionStore: session.Store;

  constructor() {
    // Use MemoryStore for sessions with SQLite
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
  }

  // Helper function to convert SQLite INTEGER timestamps to Date objects for bookings
  private convertBookingTimestamps(booking: any): any {
    return {
      ...booking,
      createdAt: booking.createdAt ? new Date(booking.createdAt as any) : null,
      paidAt: booking.paidAt ? new Date(booking.paidAt as any) : null,
      artworkUploadedAt: booking.artworkUploadedAt ? new Date(booking.artworkUploadedAt as any) : null,
      artworkReviewedAt: booking.artworkReviewedAt ? new Date(booking.artworkReviewedAt as any) : null,
      cancellationDate: booking.cancellationDate ? new Date(booking.cancellationDate as any) : null,
      approvedAt: booking.approvedAt ? new Date(booking.approvedAt as any) : null,
      rejectedAt: booking.rejectedAt ? new Date(booking.rejectedAt as any) : null,
    };
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(usersTable);
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const userWithId = {
      ...user,
      id: (user as any).id || randomUUID().replace(/-/g, ''),
      createdAt: (user as any).createdAt || new Date(),
    };
    const result = await db.insert(usersTable).values(userWithId).returning();
    return result[0];
  }

  async updateUserLoyalty(id: string, loyalty: {
    loyaltySlotsEarned?: number;
    loyaltyDiscountsAvailable?: number;
    loyaltyYearReset?: number;
  }): Promise<User | undefined> {
    const result = await db
      .update(usersTable)
      .set(loyalty)
      .where(eq(usersTable.id, id))
      .returning();
    return result[0];
  }

  async getAllRoutes(): Promise<Route[]> {
    return await db.select().from(routesTable);
  }

  async getRoute(id: string): Promise<Route | undefined> {
    const result = await db.select().from(routesTable).where(eq(routesTable.id, id)).limit(1);
    return result[0];
  }

  async createRoute(route: InsertRoute): Promise<Route> {
    const routeWithId = {
      ...route,
      id: (route as any).id || randomUUID().replace(/-/g, ''),
    };
    const result = await db.insert(routesTable).values(routeWithId).returning();
    return result[0];
  }

  async updateRoute(id: string, updates: Partial<Route>): Promise<Route | undefined> {
    const result = await db.update(routesTable).set(updates).where(eq(routesTable.id, id)).returning();
    return result[0];
  }

  async deleteRoute(id: string): Promise<boolean> {
    const result = await db.delete(routesTable).where(eq(routesTable.id, id));
    return (result as any).changes > 0;
  }

  async getAllIndustries(): Promise<Industry[]> {
    return await db.select().from(industriesTable);
  }

  async getIndustry(id: string): Promise<Industry | undefined> {
    const result = await db.select().from(industriesTable).where(eq(industriesTable.id, id)).limit(1);
    return result[0];
  }

  async createIndustry(industry: InsertIndustry): Promise<Industry> {
    const industryWithId = {
      ...industry,
      id: (industry as any).id || randomUUID().replace(/-/g, ''),
    };
    const result = await db.insert(industriesTable).values(industryWithId).returning();
    return result[0];
  }

  async updateIndustry(id: string, updates: Partial<Industry>): Promise<Industry | undefined> {
    const result = await db.update(industriesTable).set(updates).where(eq(industriesTable.id, id)).returning();
    return result[0];
  }

  async deleteIndustry(id: string): Promise<boolean> {
    const result = await db.delete(industriesTable).where(eq(industriesTable.id, id));
    return (result as any).changes > 0;
  }

  // Industry Subcategories
  async getSubcategoriesByIndustry(industryId: string): Promise<IndustrySubcategory[]> {
    return await db
      .select()
      .from(industrySubcategoriesTable)
      .where(eq(industrySubcategoriesTable.industryId, industryId))
      .orderBy(industrySubcategoriesTable.sortOrder);
  }

  async getAllSubcategories(): Promise<IndustrySubcategory[]> {
    return await db.select().from(industrySubcategoriesTable);
  }

  async getSubcategory(id: string): Promise<IndustrySubcategory | undefined> {
    const result = await db
      .select()
      .from(industrySubcategoriesTable)
      .where(eq(industrySubcategoriesTable.id, id))
      .limit(1);
    return result[0];
  }

  async createSubcategory(subcategory: InsertIndustrySubcategory): Promise<IndustrySubcategory> {
    const subcategoryWithId = {
      ...subcategory,
      id: (subcategory as any).id || randomUUID().replace(/-/g, ''),
      createdAt: new Date(),
    };
    const result = await db.insert(industrySubcategoriesTable).values(subcategoryWithId).returning();
    return result[0];
  }

  async getAllCampaigns(): Promise<Campaign[]> {
    return await db.select().from(campaignsTable);
  }

  async getCampaign(id: string): Promise<Campaign | undefined> {
    const result = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id)).limit(1);
    return result[0];
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const campaignWithId = {
      ...campaign,
      id: (campaign as any).id || randomUUID().replace(/-/g, ''),
      createdAt: (campaign as any).createdAt || new Date(),
    };
    
    const result = await db.insert(campaignsTable).values(campaignWithId).returning();
    return result[0];
  }

  async updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign | undefined> {
    const result = await db.update(campaignsTable).set(updates).where(eq(campaignsTable.id, id)).returning();
    return result[0];
  }

  async deleteCampaign(id: string): Promise<boolean> {
    // Delete campaign-specific routes and industries
    await db.delete(campaignRoutesTable).where(eq(campaignRoutesTable.campaignId, id));
    await db.delete(campaignIndustriesTable).where(eq(campaignIndustriesTable.campaignId, id));
    
    const result = await db.delete(campaignsTable).where(eq(campaignsTable.id, id));
    return (result as any).changes > 0;
  }

  // Campaign Routes & Industries (per-campaign availability)
  async getCampaignRoutes(campaignId: string): Promise<Route[]> {
    const result = await db
      .select({ route: routesTable })
      .from(campaignRoutesTable)
      .innerJoin(routesTable, eq(campaignRoutesTable.routeId, routesTable.id))
      .where(eq(campaignRoutesTable.campaignId, campaignId));
    
    return result.map(r => r.route);
  }

  async getCampaignIndustries(campaignId: string): Promise<Industry[]> {
    const result = await db
      .select({ industry: industriesTable })
      .from(campaignIndustriesTable)
      .innerJoin(industriesTable, eq(campaignIndustriesTable.industryId, industriesTable.id))
      .where(eq(campaignIndustriesTable.campaignId, campaignId));
    
    return result.map(r => r.industry);
  }

  async addRouteToCampaign(campaignId: string, routeId: string): Promise<void> {
    const id = randomUUID();
    await db.insert(campaignRoutesTable).values({
      id,
      campaignId,
      routeId,
      createdAt: new Date(),
    });
  }

  async addIndustryToCampaign(campaignId: string, industryId: string): Promise<void> {
    const id = randomUUID();
    await db.insert(campaignIndustriesTable).values({
      id,
      campaignId,
      industryId,
      createdAt: new Date(),
    });
  }

  async removeRouteFromCampaign(campaignId: string, routeId: string): Promise<void> {
    await db.delete(campaignRoutesTable)
      .where(and(
        eq(campaignRoutesTable.campaignId, campaignId),
        eq(campaignRoutesTable.routeId, routeId)
      ));
  }

  async removeIndustryFromCampaign(campaignId: string, industryId: string): Promise<void> {
    await db.delete(campaignIndustriesTable)
      .where(and(
        eq(campaignIndustriesTable.campaignId, campaignId),
        eq(campaignIndustriesTable.industryId, industryId)
      ));
  }

  async setCampaignRoutes(campaignId: string, routeIds: string[]): Promise<void> {
    // Delete all existing routes for this campaign
    await db.delete(campaignRoutesTable).where(eq(campaignRoutesTable.campaignId, campaignId));
    
    // Insert new routes
    if (routeIds.length > 0) {
      const values = routeIds.map(routeId => ({
        id: randomUUID(),
        campaignId,
        routeId,
        createdAt: new Date(),
      }));
      await db.insert(campaignRoutesTable).values(values);
    }
    
    // Update campaign total slots
    const industries = await this.getCampaignIndustries(campaignId);
    const totalSlots = routeIds.length * industries.length;
    await db.update(campaignsTable)
      .set({ totalSlots })
      .where(eq(campaignsTable.id, campaignId));
  }

  async setCampaignIndustries(campaignId: string, industryIds: string[]): Promise<void> {
    // Delete all existing industries for this campaign
    await db.delete(campaignIndustriesTable).where(eq(campaignIndustriesTable.campaignId, campaignId));
    
    // Insert new industries
    if (industryIds.length > 0) {
      const values = industryIds.map(industryId => ({
        id: randomUUID(),
        campaignId,
        industryId,
        createdAt: new Date(),
      }));
      await db.insert(campaignIndustriesTable).values(values);
    }
    
    // Update campaign total slots
    const routes = await this.getCampaignRoutes(campaignId);
    const totalSlots = routes.length * industryIds.length;
    await db.update(campaignsTable)
      .set({ totalSlots })
      .where(eq(campaignsTable.id, campaignId));
  }

  async getAllBookings(): Promise<Booking[]> {
    const results = await db
      .select({
        booking: bookingsTable,
        route: routesTable,
        industry: industriesTable,
        campaign: campaignsTable,
      })
      .from(bookingsTable)
      .leftJoin(routesTable, eq(bookingsTable.routeId, routesTable.id))
      .leftJoin(industriesTable, eq(bookingsTable.industryId, industriesTable.id))
      .leftJoin(campaignsTable, eq(bookingsTable.campaignId, campaignsTable.id));
    
    return results.map(r => ({
      ...this.convertBookingTimestamps(r.booking),
      route: r.route,
      industry: r.industry,
      campaign: r.campaign ? {
        ...r.campaign,
        mailDate: r.campaign.mailDate ? new Date(r.campaign.mailDate as any) : null,
        printDeadline: r.campaign.printDeadline ? new Date(r.campaign.printDeadline as any) : null,
        createdAt: r.campaign.createdAt ? new Date(r.campaign.createdAt as any) : null,
      } : undefined,
    })) as any;
  }

  async getBookingsByUser(userId: string): Promise<Booking[]> {
    const results = await db
      .select({
        booking: bookingsTable,
        route: routesTable,
        industry: industriesTable,
        campaign: campaignsTable,
      })
      .from(bookingsTable)
      .leftJoin(routesTable, eq(bookingsTable.routeId, routesTable.id))
      .leftJoin(industriesTable, eq(bookingsTable.industryId, industriesTable.id))
      .leftJoin(campaignsTable, eq(bookingsTable.campaignId, campaignsTable.id))
      .where(eq(bookingsTable.userId, userId));
    
    return results.map(r => ({
      ...this.convertBookingTimestamps(r.booking),
      route: r.route,
      industry: r.industry,
      campaign: r.campaign ? {
        ...r.campaign,
        mailDate: r.campaign.mailDate ? new Date(r.campaign.mailDate as any) : null,
        printDeadline: r.campaign.printDeadline ? new Date(r.campaign.printDeadline as any) : null,
        createdAt: r.campaign.createdAt ? new Date(r.campaign.createdAt as any) : null,
      } : undefined,
    })) as any;
  }

  async getBookingsByCampaign(campaignId: string): Promise<Booking[]> {
    const results = await db
      .select({
        booking: bookingsTable,
        route: routesTable,
        industry: industriesTable,
        campaign: campaignsTable,
      })
      .from(bookingsTable)
      .leftJoin(routesTable, eq(bookingsTable.routeId, routesTable.id))
      .leftJoin(industriesTable, eq(bookingsTable.industryId, industriesTable.id))
      .leftJoin(campaignsTable, eq(bookingsTable.campaignId, campaignsTable.id))
      .where(
        and(
          eq(bookingsTable.campaignId, campaignId),
          ne(bookingsTable.status, 'cancelled') // Exclude cancelled bookings from grid
        )
      );
    
    return results.map(r => ({
      ...this.convertBookingTimestamps(r.booking),
      route: r.route,
      industry: r.industry,
      campaign: r.campaign ? {
        ...r.campaign,
        mailDate: r.campaign.mailDate ? new Date(r.campaign.mailDate as any) : null,
        printDeadline: r.campaign.printDeadline ? new Date(r.campaign.printDeadline as any) : null,
        createdAt: r.campaign.createdAt ? new Date(r.campaign.createdAt as any) : null,
      } : undefined,
    })) as any;
  }

  async getBooking(campaignId: string, routeId: string, industryId: string): Promise<Booking | undefined> {
    // Only return bookings that actually reserve the slot (paid/approved, not pending or cancelled)
    const result = await db.select().from(bookingsTable).where(
      and(
        eq(bookingsTable.campaignId, campaignId),
        eq(bookingsTable.routeId, routeId),
        eq(bookingsTable.industryId, industryId),
        ne(bookingsTable.status, 'cancelled'),
        eq(bookingsTable.paymentStatus, 'paid') // Only count paid bookings as occupying slots
      )
    ).limit(1);
    return result[0] ? this.convertBookingTimestamps(result[0]) : undefined;
  }

  async getBookingById(id: string): Promise<Booking | undefined> {
    const results = await db
      .select({
        booking: bookingsTable,
        route: routesTable,
        industry: industriesTable,
        campaign: campaignsTable,
      })
      .from(bookingsTable)
      .leftJoin(routesTable, eq(bookingsTable.routeId, routesTable.id))
      .leftJoin(industriesTable, eq(bookingsTable.industryId, industriesTable.id))
      .leftJoin(campaignsTable, eq(bookingsTable.campaignId, campaignsTable.id))
      .where(eq(bookingsTable.id, id))
      .limit(1);
    
    if (!results[0]) return undefined;
    
    const r = results[0];
    return {
      ...this.convertBookingTimestamps(r.booking),
      route: r.route,
      industry: r.industry,
      campaign: r.campaign ? {
        ...r.campaign,
        mailDate: r.campaign.mailDate ? new Date(r.campaign.mailDate as any) : null,
        createdAt: r.campaign.createdAt ? new Date(r.campaign.createdAt as any) : null,
      } : undefined,
    } as any;
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const now = new Date();
    const quantity = booking.quantity || 1;
    const bookingWithId = {
      ...booking,
      id: (booking as any).id || randomUUID().replace(/-/g, ''),
      createdAt: (booking as any).createdAt || now,
      quantity,
    };
    
    console.log("🔍 [Storage Debug] Full booking data before insert:", JSON.stringify(bookingWithId, null, 2));
    
    const result = await db.insert(bookingsTable).values(bookingWithId).returning();
    const createdBooking = result[0];
    
    // Atomic update of campaign counters using SQL expressions, increment by quantity
    await db.update(campaignsTable)
      .set({
        bookedSlots: sql`${campaignsTable.bookedSlots} + ${quantity}`,
        revenue: sql`${campaignsTable.revenue} + ${createdBooking.amount || 60000}`
      })
      .where(eq(campaignsTable.id, booking.campaignId));
    
    // Convert INTEGER timestamps to Date objects for return
    return this.convertBookingTimestamps(createdBooking) as Booking;
  }

  async getBookingByStripeSessionId(sessionId: string): Promise<Booking | undefined> {
    const results = await db
      .select({
        booking: bookingsTable,
        route: routesTable,
        industry: industriesTable,
        campaign: campaignsTable,
      })
      .from(bookingsTable)
      .leftJoin(routesTable, eq(bookingsTable.routeId, routesTable.id))
      .leftJoin(industriesTable, eq(bookingsTable.industryId, industriesTable.id))
      .leftJoin(campaignsTable, eq(bookingsTable.campaignId, campaignsTable.id))
      .where(eq(bookingsTable.stripeCheckoutSessionId, sessionId))
      .limit(1);
    
    if (results.length === 0) return undefined;
    
    const r = results[0];
    return {
      ...this.convertBookingTimestamps(r.booking),
      route: r.route,
      industry: r.industry,
      campaign: r.campaign ? {
        ...r.campaign,
        mailDate: r.campaign.mailDate ? new Date(r.campaign.mailDate as any) : null,
        createdAt: r.campaign.createdAt ? new Date(r.campaign.createdAt as any) : null,
      } : undefined,
    } as any;
  }

  async updateBooking(id: string, updates: Partial<Booking>): Promise<Booking | undefined> {
    const result = await db.update(bookingsTable).set(updates).where(eq(bookingsTable.id, id)).returning();
    return result[0] ? this.convertBookingTimestamps(result[0]) : undefined;
  }

  async updateBookingPaymentStatus(
    id: string,
    paymentStatus: string,
    paymentData: {
      stripePaymentIntentId?: string;
      amountPaid?: number;
      paidAt?: Date;
    }
  ): Promise<Booking | undefined> {
    // Get the current booking to check if payment status is changing
    const currentBooking = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id)).limit(1);
    if (!currentBooking || currentBooking.length === 0) return undefined;
    
    const booking = currentBooking[0];
    
    // Update booking with payment info
    // Set status to "confirmed" when payment is successful and clear pending timer
    const result = await db.update(bookingsTable)
      .set({
        paymentStatus,
        status: paymentStatus === 'paid' ? 'confirmed' : booking.status,
        stripePaymentIntentId: paymentData.stripePaymentIntentId,
        amountPaid: paymentData.amountPaid,
        paidAt: paymentData.paidAt,
        pendingSince: paymentStatus === 'paid' ? null : booking.pendingSince, // Clear pending timer when paid
      })
      .where(eq(bookingsTable.id, id))
      .returning();
    
    // Update campaign revenue only if payment is newly successful
    if (paymentStatus === 'paid' && booking.paymentStatus !== 'paid' && paymentData.amountPaid) {
      await db.update(campaignsTable)
        .set({
          revenue: sql`${campaignsTable.revenue} + ${paymentData.amountPaid}`
        })
        .where(eq(campaignsTable.id, booking.campaignId));
    }
    
    return result[0] ? this.convertBookingTimestamps(result[0]) : undefined;
  }

  async cancelBooking(
    id: string,
    refundData: {
      refundAmount: number;
      refundStatus: 'pending' | 'processed' | 'no_refund' | 'failed';
    }
  ): Promise<{ booking: Booking; cancelledNow: boolean } | undefined> {
    // Get the current booking to access campaign and amount info
    const currentBooking = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id)).limit(1);
    if (!currentBooking || currentBooking.length === 0) return undefined;
    
    const booking = currentBooking[0];
    
    // Idempotent: if already cancelled, return existing booking without overwriting data
    if (booking.status === 'cancelled') {
      console.log(`⚠️  Booking ${id} is already cancelled, skipping duplicate cancellation`);
      return { 
        booking: this.convertBookingTimestamps(booking), 
        cancelledNow: false 
      };
    }
    
    const quantity = booking.quantity || 1;
    
    // Update booking with cancellation info and clear file path references
    const result = await db.update(bookingsTable)
      .set({
        status: 'cancelled',
        cancellationDate: new Date(),
        refundAmount: refundData.refundAmount,
        refundStatus: refundData.refundStatus,
        // Clear file path columns to prevent orphaned references after deletion
        artworkFilePath: null,
        logoFilePath: null,
        optionalImagePath: null,
      })
      .where(eq(bookingsTable.id, id))
      .returning();
    
    // Update campaign: decrease booked slots by quantity and revenue
    await db.update(campaignsTable)
      .set({
        bookedSlots: sql`MAX(0, ${campaignsTable.bookedSlots} - ${quantity})`,
        revenue: sql`MAX(0, ${campaignsTable.revenue} - ${booking.amountPaid || booking.amount})`
      })
      .where(eq(campaignsTable.id, booking.campaignId));
    
    if (!result[0]) return undefined;
    
    return { 
      booking: this.convertBookingTimestamps(result[0]), 
      cancelledNow: true 
    };
  }

  async approveBooking(id: string): Promise<Booking | undefined> {
    const result = await db.update(bookingsTable)
      .set({
        approvalStatus: 'approved',
        approvedAt: new Date(),
        rejectedAt: null,
        rejectionNote: null,
      })
      .where(eq(bookingsTable.id, id))
      .returning();
    
    return result[0] ? this.convertBookingTimestamps(result[0]) : undefined;
  }

  async rejectBooking(id: string, rejectionNote: string): Promise<Booking | undefined> {
    const result = await db.update(bookingsTable)
      .set({
        approvalStatus: 'rejected',
        rejectedAt: new Date(),
        approvedAt: null,
        rejectionNote,
      })
      .where(eq(bookingsTable.id, id))
      .returning();
    
    return result[0] ? this.convertBookingTimestamps(result[0]) : undefined;
  }

  async deleteBooking(id: string): Promise<boolean> {
    // Get the booking before deleting to access campaignId and amount
    const booking = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id)).limit(1);
    if (!booking || booking.length === 0) {
      return false;
    }
    
    const deletedBooking = booking[0];
    const result = await db.delete(bookingsTable).where(eq(bookingsTable.id, id));
    
    // Only update campaign counters if the delete actually removed a row
    if ((result as any).changes > 0) {
      // Atomic update of campaign counters using SQL expressions with safety checks
      await db.update(campaignsTable)
        .set({
          bookedSlots: sql`MAX(0, ${campaignsTable.bookedSlots} - 1)`,
          revenue: sql`MAX(0, ${campaignsTable.revenue} - ${deletedBooking.amount || 60000})`
        })
        .where(eq(campaignsTable.id, deletedBooking.campaignId));
      return true;
    }
    
    return false;
  }

  async getBookingsNeedingReview(): Promise<Booking[]> {
    const results = await db
      .select({
        booking: bookingsTable,
        route: routesTable,
        industry: industriesTable,
        campaign: campaignsTable,
      })
      .from(bookingsTable)
      .leftJoin(routesTable, eq(bookingsTable.routeId, routesTable.id))
      .leftJoin(industriesTable, eq(bookingsTable.industryId, industriesTable.id))
      .leftJoin(campaignsTable, eq(bookingsTable.campaignId, campaignsTable.id))
      .where(eq(bookingsTable.artworkStatus, 'under_review'));
    
    return results.map(r => ({
      ...this.convertBookingTimestamps(r.booking),
      route: r.route,
      industry: r.industry,
      campaign: r.campaign ? {
        ...r.campaign,
        mailDate: r.campaign.mailDate ? new Date(r.campaign.mailDate as any) : null,
        printDeadline: r.campaign.printDeadline ? new Date(r.campaign.printDeadline as any) : null,
        createdAt: r.campaign.createdAt ? new Date(r.campaign.createdAt as any) : null,
      } : undefined,
    })) as any;
  }

  async getSlotGrid(campaignId: string): Promise<{
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
  }> {
    // Use campaign-specific routes and industries instead of all routes/industries
    const routes = await this.getCampaignRoutes(campaignId);
    const industries = await this.getCampaignIndustries(campaignId);
    const bookings = await this.getBookingsByCampaign(campaignId);

    const bookingMap = new Map<string, Booking>();
    bookings.forEach(booking => {
      const key = `${booking.routeId}-${booking.industryId}`;
      bookingMap.set(key, booking);
    });

    const slots = [];
    let availableSlots = 0;
    let bookedSlots = 0;
    let pendingSlots = 0;
    let totalRevenue = 0;

    for (const route of routes) {
      for (const industry of industries) {
        const key = `${route.id}-${industry.id}`;
        const booking = bookingMap.get(key);
        
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

  // Admin Notifications - DbStorage implementations
  async getUnhandledNotificationsCount(userId?: string): Promise<number> {
    // If userId is provided, use getAllUnhandledNotifications to get filtered count
    if (userId) {
      const notifications = await this.getAllUnhandledNotifications(userId);
      return notifications.length;
    }
    
    // Count based on actual booking states (without filtering dismissed)
    const allBookings = await db.select().from(bookingsTable);
    let count = 0;
    
    // New bookings (confirmed in last 24 hours)
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    count += allBookings.filter((b: any) => 
      b.status === 'confirmed' && 
      b.createdAt && 
      (typeof b.createdAt === 'number' ? b.createdAt : new Date(b.createdAt).getTime()) > oneDayAgo
    ).length;
    
    // Artwork pending review
    count += allBookings.filter((b: any) => b.artworkStatus === 'under_review').length;
    
    // Canceled bookings (last 7 days)
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    count += allBookings.filter((b: any) => 
      b.status === 'cancelled' && 
      b.cancellationDate && 
      (typeof b.cancellationDate === 'number' ? b.cancellationDate : new Date(b.cancellationDate).getTime()) > sevenDaysAgo
    ).length;
    
    return count;
  }

  async getNotificationsByType(type: string, userId?: string): Promise<any[]> {
    const results: any[] = [];
    
    if (type === 'new_booking') {
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      const bookingsWithDetails = await db
        .select({
          booking: bookingsTable,
          route: routesTable,
          industry: industriesTable,
          campaign: campaignsTable,
        })
        .from(bookingsTable)
        .leftJoin(routesTable, eq(bookingsTable.routeId, routesTable.id))
        .leftJoin(industriesTable, eq(bookingsTable.industryId, industriesTable.id))
        .leftJoin(campaignsTable, eq(bookingsTable.campaignId, campaignsTable.id));
      
      bookingsWithDetails
        .filter((item: any) => 
          item.booking.status === 'confirmed' && 
          item.booking.createdAt && 
          (typeof item.booking.createdAt === 'number' ? item.booking.createdAt : new Date(item.booking.createdAt).getTime()) > oneDayAgo
        )
        .forEach((item: any) => {
          results.push({
            id: `new_booking_${item.booking.id}`,
            type: 'new_booking',
            bookingId: item.booking.id,
            booking: {
              ...this.convertBookingTimestamps(item.booking),
              route: item.route,
              industry: item.industry,
              campaign: item.campaign ? {
                ...item.campaign,
                mailDate: item.campaign.mailDate ? new Date(item.campaign.mailDate as any) : null,
                printDeadline: item.campaign.printDeadline ? new Date(item.campaign.printDeadline as any) : null,
                createdAt: item.campaign.createdAt ? new Date(item.campaign.createdAt as any) : null,
              } : undefined,
            },
            createdAt: typeof item.booking.createdAt === 'number' ? new Date(item.booking.createdAt) : item.booking.createdAt,
            isHandled: false,
          });
        });
    } else if (type === 'artwork_review') {
      const bookingsWithDetails = await db
        .select({
          booking: bookingsTable,
          route: routesTable,
          industry: industriesTable,
          campaign: campaignsTable,
        })
        .from(bookingsTable)
        .leftJoin(routesTable, eq(bookingsTable.routeId, routesTable.id))
        .leftJoin(industriesTable, eq(bookingsTable.industryId, industriesTable.id))
        .leftJoin(campaignsTable, eq(bookingsTable.campaignId, campaignsTable.id));
      
      bookingsWithDetails
        .filter((item: any) => item.booking.artworkStatus === 'under_review')
        .forEach((item: any) => {
          results.push({
            id: `artwork_review_${item.booking.id}`,
            type: 'artwork_review',
            bookingId: item.booking.id,
            booking: {
              ...this.convertBookingTimestamps(item.booking),
              route: item.route,
              industry: item.industry,
              campaign: item.campaign ? {
                ...item.campaign,
                mailDate: item.campaign.mailDate ? new Date(item.campaign.mailDate as any) : null,
                printDeadline: item.campaign.printDeadline ? new Date(item.campaign.printDeadline as any) : null,
                createdAt: item.campaign.createdAt ? new Date(item.campaign.createdAt as any) : null,
              } : undefined,
            },
            createdAt: item.booking.artworkUploadedAt ? 
              (typeof item.booking.artworkUploadedAt === 'number' ? new Date(item.booking.artworkUploadedAt) : item.booking.artworkUploadedAt) :
              (typeof item.booking.createdAt === 'number' ? new Date(item.booking.createdAt) : item.booking.createdAt),
            isHandled: false,
          });
        });
    } else if (type === 'canceled_booking') {
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const bookingsWithDetails = await db
        .select({
          booking: bookingsTable,
          route: routesTable,
          industry: industriesTable,
          campaign: campaignsTable,
        })
        .from(bookingsTable)
        .leftJoin(routesTable, eq(bookingsTable.routeId, routesTable.id))
        .leftJoin(industriesTable, eq(bookingsTable.industryId, industriesTable.id))
        .leftJoin(campaignsTable, eq(bookingsTable.campaignId, campaignsTable.id));
      
      bookingsWithDetails
        .filter((item: any) => 
          item.booking.status === 'cancelled' && 
          item.booking.cancellationDate && 
          (typeof item.booking.cancellationDate === 'number' ? item.booking.cancellationDate : new Date(item.booking.cancellationDate).getTime()) > sevenDaysAgo
        )
        .forEach((item: any) => {
          results.push({
            id: `canceled_booking_${item.booking.id}`,
            type: 'canceled_booking',
            bookingId: item.booking.id,
            booking: {
              ...this.convertBookingTimestamps(item.booking),
              route: item.route,
              industry: item.industry,
              campaign: item.campaign ? {
                ...item.campaign,
                mailDate: item.campaign.mailDate ? new Date(item.campaign.mailDate as any) : null,
                printDeadline: item.campaign.printDeadline ? new Date(item.campaign.printDeadline as any) : null,
                createdAt: item.campaign.createdAt ? new Date(item.campaign.createdAt as any) : null,
              } : undefined,
            },
            createdAt: typeof item.booking.cancellationDate === 'number' ? new Date(item.booking.cancellationDate) : item.booking.cancellationDate,
            isHandled: false,
          });
        });
    }
    
    // Filter out dismissed notifications if userId is provided
    if (userId) {
      const dismissed = await this.getDismissedNotificationsByUser(userId);
      const dismissedSet = new Set(
        dismissed
          .filter(d => d.notificationType === type)
          .map(d => d.bookingId)
      );
      return results.filter(r => !dismissedSet.has(r.bookingId));
    }
    
    return results;
  }

  async getAllUnhandledNotifications(userId?: string): Promise<any[]> {
    const newBookings = await this.getNotificationsByType('new_booking', userId);
    const artworkReviews = await this.getNotificationsByType('artwork_review', userId);
    const canceledBookings = await this.getNotificationsByType('canceled_booking', userId);
    return [...newBookings, ...artworkReviews, ...canceledBookings];
  }

  async markNotificationHandled(notificationId: string): Promise<boolean> {
    // In DbStorage with derived notifications, this is a no-op
    // Notifications are derived from booking state, not persisted separately
    return true;
  }

  async createNotification(type: string, bookingId: string): Promise<void> {
    // In DbStorage with derived notifications, this is a no-op
    // Notifications are derived from booking state
  }
  
  async createDismissedNotification(bookingId: string, notificationType: string, userId: string): Promise<void> {
    await db.insert(dismissedNotificationsTable).values({
      id: randomUUID(),
      bookingId,
      notificationType,
      userId,
      dismissedAt: new Date(),
    });
  }
  
  async getDismissedNotificationsByUser(userId: string): Promise<Array<{bookingId: string, notificationType: string}>> {
    const dismissed = await db.select()
      .from(dismissedNotificationsTable)
      .where(eq(dismissedNotificationsTable.userId, userId));
    
    return dismissed.map(d => ({
      bookingId: d.bookingId,
      notificationType: d.notificationType,
    }));
  }

  async getCustomers(filters?: {
    search?: string;
    tag?: string;
    highValue?: boolean;
    sortBy?: 'name' | 'totalSpent' | 'lastBooking' | 'signupDate';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Array<User & {
    totalSpent: number;
    bookingCount: number;
    lastBookingDate?: Date;
    tags: string[];
  }>> {
    const { customerNotes, customerTags, referrals } = await import("@shared/schema");
    
    // Get all customers (role = 'customer')
    const customers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.role, 'customer'));
    
    // Get all bookings with paid status
    const allBookings = await db.select()
      .from(bookingsTable)
      .where(eq(bookingsTable.paymentStatus, 'paid'));
    
    // Get all customer tags
    const allTags = await db.select()
      .from(customerTags);
    
    // Build customer stats map
    const customerStats = new Map<string, {
      totalSpent: number;
      bookingCount: number;
      lastBookingDate?: Date;
      tags: string[];
    }>();
    
    // Calculate stats for each customer
    customers.forEach(customer => {
      const userBookings = allBookings.filter(b => b.userId === customer.id);
      const totalSpent = userBookings.reduce((sum, b) => sum + (b.amountPaid || 0), 0);
      const bookingCount = userBookings.length;
      const lastBookingDate = userBookings.length > 0
        ? userBookings.reduce((latest, b) => {
            const bookingDate = b.paidAt ? (typeof b.paidAt === 'number' ? new Date(b.paidAt) : b.paidAt) : undefined;
            if (!bookingDate) return latest;
            if (!latest || bookingDate > latest) return bookingDate;
            return latest;
          }, undefined as Date | undefined)
        : undefined;
      
      const tags = allTags
        .filter(t => t.customerId === customer.id)
        .map(t => t.tag);
      
      customerStats.set(customer.id, {
        totalSpent,
        bookingCount,
        lastBookingDate,
        tags,
      });
    });
    
    // Combine customers with stats
    let results = customers.map(customer => {
      const stats = customerStats.get(customer.id) || {
        totalSpent: 0,
        bookingCount: 0,
        tags: [],
      };
      
      return {
        ...customer,
        createdAt: customer.createdAt ? (typeof customer.createdAt === 'number' ? new Date(customer.createdAt) : customer.createdAt) : null,
        ...stats,
      };
    });
    
    // Apply filters
    if (filters) {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        results = results.filter(c => 
          c.email.toLowerCase().includes(searchLower) ||
          c.businessName?.toLowerCase().includes(searchLower) ||
          c.username.toLowerCase().includes(searchLower)
        );
      }
      
      if (filters.tag) {
        results = results.filter(c => c.tags.includes(filters.tag!));
      }
      
      if (filters.highValue) {
        // High value = more than $1000 total spent
        results = results.filter(c => c.totalSpent > 100000); // $1000 in cents
      }
      
      // Apply sorting
      const sortBy = filters.sortBy || 'signupDate';
      const sortOrder = filters.sortOrder || 'desc';
      
      results.sort((a, b) => {
        let comparison = 0;
        
        switch (sortBy) {
          case 'name':
            comparison = (a.businessName || a.username).localeCompare(b.businessName || b.username);
            break;
          case 'totalSpent':
            comparison = a.totalSpent - b.totalSpent;
            break;
          case 'lastBooking':
            const aDate = a.lastBookingDate?.getTime() || 0;
            const bDate = b.lastBookingDate?.getTime() || 0;
            comparison = aDate - bDate;
            break;
          case 'signupDate':
            const aSignup = a.createdAt?.getTime() || 0;
            const bSignup = b.createdAt?.getTime() || 0;
            comparison = aSignup - bSignup;
            break;
        }
        
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }
    
    return results;
  }

  async getCustomerDetails(customerId: string): Promise<{
    customer: User;
    bookings: BookingWithDetails[];
    notes: Array<{
      id: string;
      note: string;
      createdBy: string;
      createdByName: string;
      createdAt: Date;
    }>;
    tags: string[];
    lifetimeValue: number;
    bookingCount: number;
    lastBookingDate?: Date;
  } | undefined> {
    const { customerNotes, customerTags, referrals } = await import("@shared/schema");
    
    // Get customer
    const customer = await this.getUser(customerId);
    if (!customer || customer.role !== 'customer') {
      return undefined;
    }
    
    // Get bookings with details
    const bookingsWithDetails = await db
      .select({
        booking: bookingsTable,
        route: routesTable,
        industry: industriesTable,
        campaign: campaignsTable,
      })
      .from(bookingsTable)
      .leftJoin(routesTable, eq(bookingsTable.routeId, routesTable.id))
      .leftJoin(industriesTable, eq(bookingsTable.industryId, industriesTable.id))
      .leftJoin(campaignsTable, eq(bookingsTable.campaignId, campaignsTable.id))
      .where(eq(bookingsTable.userId, customerId));
    
    const bookings = bookingsWithDetails.map(item => ({
      ...this.convertBookingTimestamps(item.booking),
      route: item.route,
      industry: item.industry,
      campaign: item.campaign ? {
        ...item.campaign,
        mailDate: item.campaign.mailDate ? new Date(item.campaign.mailDate as any) : null,
        printDeadline: item.campaign.printDeadline ? new Date(item.campaign.printDeadline as any) : null,
        createdAt: item.campaign.createdAt ? new Date(item.campaign.createdAt as any) : null,
      } : undefined,
    }));
    
    // Get notes
    const notesData = await db
      .select({
        note: customerNotes,
        creator: usersTable,
      })
      .from(customerNotes)
      .leftJoin(usersTable, eq(customerNotes.createdBy, usersTable.id))
      .where(eq(customerNotes.customerId, customerId));
    
    const notes = notesData.map(item => ({
      id: item.note.id,
      note: item.note.note,
      createdBy: item.note.createdBy,
      createdByName: item.creator?.username || 'Unknown',
      createdAt: item.note.createdAt ? (typeof item.note.createdAt === 'number' ? new Date(item.note.createdAt) : item.note.createdAt) : new Date(),
    }));
    
    // Get tags
    const tagsData = await db.select()
      .from(customerTags)
      .where(eq(customerTags.customerId, customerId));
    
    const tags = tagsData.map(t => t.tag);
    
    // Calculate lifetime value
    const paidBookings = bookings.filter(b => b.paymentStatus === 'paid');
    const lifetimeValue = paidBookings.reduce((sum, b) => sum + (b.amountPaid || 0), 0);
    const bookingCount = bookings.length;
    
    // Find last booking date
    const lastBookingDate = paidBookings.length > 0
      ? paidBookings.reduce((latest, b) => {
          const bookingDate = b.paidAt;
          if (!bookingDate) return latest;
          if (!latest || bookingDate > latest) return bookingDate;
          return latest;
        }, undefined as Date | undefined)
      : undefined;
    
    return {
      customer,
      bookings,
      notes,
      tags,
      lifetimeValue,
      bookingCount,
      lastBookingDate,
    };
  }

  async addCustomerNote(customerId: string, note: string, createdBy: string): Promise<void> {
    const { customerNotes } = await import("@shared/schema");
    
    await db.insert(customerNotes).values({
      id: randomUUID(),
      customerId,
      note,
      createdBy,
      createdAt: new Date(),
    });
  }

  async addCustomerTag(customerId: string, tag: string, createdBy: string): Promise<void> {
    const { customerTags } = await import("@shared/schema");
    
    // Check if tag already exists for this customer
    const existing = await db.select()
      .from(customerTags)
      .where(and(
        eq(customerTags.customerId, customerId),
        eq(customerTags.tag, tag)
      ));
    
    if (existing.length === 0) {
      await db.insert(customerTags).values({
        id: randomUUID(),
        customerId,
        tag,
        createdBy,
        createdAt: new Date(),
      });
    }
  }

  async removeCustomerTag(customerId: string, tag: string): Promise<void> {
    const { customerTags } = await import("@shared/schema");
    
    await db.delete(customerTags)
      .where(and(
        eq(customerTags.customerId, customerId),
        eq(customerTags.tag, tag)
      ));
  }

  // Design Revisions
  async createDesignRevision(designRevision: InsertDesignRevision): Promise<DesignRevision> {
    const revisionWithId = {
      ...designRevision,
      id: randomUUID().replace(/-/g, ''),
      uploadedAt: new Date(),
    };
    const result = await db.insert(designRevisionsTable).values(revisionWithId).returning();
    return result[0];
  }

  async getDesignRevisionById(id: string): Promise<DesignRevision | undefined> {
    const result = await db.select()
      .from(designRevisionsTable)
      .where(eq(designRevisionsTable.id, id))
      .limit(1);
    return result[0];
  }

  async getDesignRevisionsByBooking(bookingId: string): Promise<DesignRevision[]> {
    const result = await db.select()
      .from(designRevisionsTable)
      .where(eq(designRevisionsTable.bookingId, bookingId))
      .orderBy(designRevisionsTable.revisionNumber);
    return result;
  }

  async getLatestDesignRevision(bookingId: string): Promise<DesignRevision | undefined> {
    const result = await db.select()
      .from(designRevisionsTable)
      .where(eq(designRevisionsTable.bookingId, bookingId))
      .orderBy(sql`${designRevisionsTable.revisionNumber} DESC`)
      .limit(1);
    return result[0];
  }

  async updateDesignRevisionStatus(id: string, status: string, customerFeedback?: string): Promise<DesignRevision | undefined> {
    const updates: Partial<DesignRevision> = {
      status,
      reviewedAt: new Date(),
    };
    
    if (customerFeedback) {
      updates.customerFeedback = customerFeedback;
    }
    
    const result = await db.update(designRevisionsTable)
      .set(updates)
      .where(eq(designRevisionsTable.id, id))
      .returning();
    return result[0];
  }

  // Admin Settings
  async getAllAdminSettings(): Promise<AdminSetting[]> {
    const result = await db.select()
      .from(adminSettingsTable)
      .orderBy(adminSettingsTable.key);
    return result;
  }

  async getAdminSetting(key: string): Promise<AdminSetting | undefined> {
    const result = await db.select()
      .from(adminSettingsTable)
      .where(eq(adminSettingsTable.key, key))
      .limit(1);
    return result[0];
  }

  async setAdminSetting(key: string, value: string, description?: string, updatedBy?: string): Promise<AdminSetting> {
    const existing = await this.getAdminSetting(key);
    
    if (existing) {
      const result = await db.update(adminSettingsTable)
        .set({
          value,
          description: description || existing.description,
          updatedAt: new Date(),
          updatedBy,
        })
        .where(eq(adminSettingsTable.key, key))
        .returning();
      return result[0];
    } else {
      const newSetting = {
        id: randomUUID().replace(/-/g, ''),
        key,
        value,
        description,
        updatedAt: new Date(),
        updatedBy,
      };
      const result = await db.insert(adminSettingsTable).values(newSetting).returning();
      return result[0];
    }
  }
}

// Using DbStorage for permanent data persistence
export const storage = new DbStorage();
