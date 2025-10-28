import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  businessName: text("business_name"),
  phone: text("phone"),
  role: text("role").notNull().default("customer"), // 'customer' or 'admin'
  createdAt: timestamp("created_at").defaultNow(),
});

export const routes = pgTable("routes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  zipCode: text("zip_code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  householdCount: integer("household_count").notNull().default(0),
  status: text("status").notNull().default("active"), // 'active' or 'inactive'
});

export const industries = pgTable("industries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  status: text("status").notNull().default("active"), // 'active' or 'inactive'
  icon: text("icon").notNull(),
});

export const campaigns = pgTable("campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  mailDate: timestamp("mail_date").notNull(),
  status: text("status").notNull().default("planning"), // 'planning', 'booking_open', 'booking_closed', 'printed', 'mailed', 'completed'
  totalSlots: integer("total_slots").notNull().default(64),
  bookedSlots: integer("booked_slots").notNull().default(0),
  revenue: integer("revenue").notNull().default(0), // in cents
  createdAt: timestamp("created_at").defaultNow(),
});

export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  campaignId: varchar("campaign_id").notNull().references(() => campaigns.id),
  routeId: varchar("route_id").notNull().references(() => routes.id),
  industryId: varchar("industry_id").notNull().references(() => industries.id),
  businessName: text("business_name").notNull(),
  licenseNumber: text("license_number"),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone"),
  amount: integer("amount").notNull().default(60000), // in cents
  status: text("status").notNull().default("confirmed"), // 'pending', 'confirmed', 'cancelled'
  paymentStatus: text("payment_status").notNull().default("pending"), // 'pending', 'paid', 'failed'
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  amountPaid: integer("amount_paid"), // in cents, actual amount paid
  paidAt: timestamp("paid_at"),
  paymentId: text("payment_id"), // legacy mock payment reference
  artworkStatus: text("artwork_status").notNull().default("pending_upload"), // 'pending_upload', 'under_review', 'approved', 'rejected'
  artworkFilePath: text("artwork_file_path"),
  artworkFileName: text("artwork_file_name"),
  artworkUploadedAt: timestamp("artwork_uploaded_at"),
  artworkReviewedAt: timestamp("artwork_reviewed_at"),
  artworkRejectionReason: text("artwork_rejection_reason"),
  cancellationDate: timestamp("cancellation_date"),
  refundAmount: integer("refund_amount"), // in cents
  refundStatus: text("refund_status"), // 'pending', 'processed', 'no_refund', 'failed'
  createdAt: timestamp("created_at").defaultNow(),
});

export const adminNotifications = pgTable("admin_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // 'new_booking', 'artwork_review', 'artwork_deadline'
  bookingId: varchar("booking_id").notNull().references(() => bookings.id),
  isHandled: boolean("is_handled").notNull().default(false),
  handledAt: timestamp("handled_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  businessName: true,
  phone: true,
});

export const insertRouteSchema = createInsertSchema(routes).omit({
  id: true,
});

export const insertIndustrySchema = createInsertSchema(industries).omit({
  id: true,
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
});

export const insertAdminNotificationSchema = createInsertSchema(adminNotifications).omit({
  id: true,
  createdAt: true,
  handledAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Route = typeof routes.$inferSelect;
export type InsertRoute = z.infer<typeof insertRouteSchema>;
export type Industry = typeof industries.$inferSelect;
export type InsertIndustry = z.infer<typeof insertIndustrySchema>;
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type AdminNotification = typeof adminNotifications.$inferSelect;
export type InsertAdminNotification = z.infer<typeof insertAdminNotificationSchema>;

// Extended Booking type with joined route, industry, and campaign data
export type BookingWithDetails = Booking & {
  route?: Route;
  industry?: Industry;
  campaign?: Campaign;
};

// Notification with booking details
export type NotificationWithDetails = AdminNotification & {
  booking?: BookingWithDetails;
};
