import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  businessName: text("business_name"),
  phone: text("phone"),
  role: text("role").notNull().default("customer"), // 'customer' or 'admin'
  createdAt: integer("created_at", { mode: 'timestamp_ms' }),
});

export const routes = sqliteTable("routes", {
  id: text("id").primaryKey(),
  zipCode: text("zip_code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  householdCount: integer("household_count").notNull().default(0),
  status: text("status").notNull().default("active"), // 'active' or 'inactive'
});

export const industries = sqliteTable("industries", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  status: text("status").notNull().default("active"), // 'active' or 'inactive'
  icon: text("icon").notNull(),
});

export const campaigns = sqliteTable("campaigns", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  mailDate: integer("mail_date", { mode: 'timestamp_ms' }).notNull(),
  printDeadline: integer("print_deadline", { mode: 'timestamp_ms' }).notNull(),
  status: text("status").notNull().default("planning"), // 'planning', 'booking_open', 'booking_closed', 'printed', 'mailed', 'completed'
  totalSlots: integer("total_slots").notNull().default(64),
  bookedSlots: integer("booked_slots").notNull().default(0),
  revenue: integer("revenue").notNull().default(0), // in cents
  createdAt: integer("created_at", { mode: 'timestamp_ms' }),
});

export const bookings = sqliteTable("bookings", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  campaignId: text("campaign_id").notNull().references(() => campaigns.id),
  routeId: text("route_id").notNull().references(() => routes.id),
  industryId: text("industry_id").notNull().references(() => industries.id),
  businessName: text("business_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone"),
  amount: integer("amount").notNull().default(60000), // in cents
  quantity: integer("quantity").notNull().default(1), // number of slots booked (1-4)
  status: text("status").notNull().default("confirmed"), // 'pending', 'confirmed', 'cancelled'
  paymentStatus: text("payment_status").notNull().default("pending"), // 'pending', 'paid', 'failed'
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  amountPaid: integer("amount_paid"), // in cents, actual amount paid
  paidAt: integer("paid_at", { mode: 'timestamp_ms' }),
  paymentId: text("payment_id"), // legacy mock payment reference
  approvalStatus: text("approval_status").notNull().default("pending"), // 'pending', 'approved', 'rejected'
  approvedAt: integer("approved_at", { mode: 'timestamp_ms' }),
  rejectedAt: integer("rejected_at", { mode: 'timestamp_ms' }),
  rejectionNote: text("rejection_note"),
  artworkStatus: text("artwork_status").notNull().default("pending_upload"), // 'pending_upload', 'under_review', 'approved', 'rejected'
  artworkFilePath: text("artwork_file_path"),
  artworkFileName: text("artwork_file_name"),
  artworkUploadedAt: integer("artwork_uploaded_at", { mode: 'timestamp_ms' }),
  artworkReviewedAt: integer("artwork_reviewed_at", { mode: 'timestamp_ms' }),
  artworkRejectionReason: text("artwork_rejection_reason"),
  cancellationDate: integer("cancellation_date", { mode: 'timestamp_ms' }),
  refundAmount: integer("refund_amount"), // in cents
  refundStatus: text("refund_status"), // 'pending', 'processed', 'no_refund', 'failed'
  createdAt: integer("created_at", { mode: 'timestamp_ms' }),
});

export const adminNotifications = sqliteTable("admin_notifications", {
  id: text("id").primaryKey(),
  type: text("type").notNull(), // 'new_booking', 'artwork_review', 'artwork_deadline'
  bookingId: text("booking_id").notNull().references(() => bookings.id),
  isHandled: integer("is_handled", { mode: 'boolean' }).notNull().default(false),
  handledAt: integer("handled_at", { mode: 'timestamp_ms' }),
  createdAt: integer("created_at", { mode: 'timestamp_ms' }),
});

export const dismissedNotifications = sqliteTable("dismissed_notifications", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id").notNull().references(() => bookings.id),
  notificationType: text("notification_type").notNull(), // 'new_booking', 'artwork_review', 'cancellation'
  userId: text("user_id").notNull().references(() => users.id),
  dismissedAt: integer("dismissed_at", { mode: 'timestamp_ms' }),
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

export const insertDismissedNotificationSchema = createInsertSchema(dismissedNotifications).omit({
  id: true,
  dismissedAt: true,
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
export type DismissedNotification = typeof dismissedNotifications.$inferSelect;
export type InsertDismissedNotification = z.infer<typeof insertDismissedNotificationSchema>;

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
