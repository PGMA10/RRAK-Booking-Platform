import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  name: text("name"), // personal/contact name
  businessName: text("business_name"),
  phone: text("phone"),
  role: text("role").notNull().default("customer"), // 'customer' or 'admin'
  marketingOptIn: integer("marketing_opt_in", { mode: 'boolean' }).notNull().default(false),
  referredByUserId: text("referred_by_user_id"),
  referralCode: text("referral_code").unique(),
  loyaltySlotsEarned: integer("loyalty_slots_earned").notNull().default(0), // Total slots purchased at regular price in current year
  loyaltyDiscountsAvailable: integer("loyalty_discounts_available").notNull().default(0), // Number of $150 discounts earned but not yet used
  loyaltyYearReset: integer("loyalty_year_reset").notNull().default(new Date().getFullYear()), // Year when loyalty counters were last reset
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
  baseSlotPrice: integer("base_slot_price"), // in cents, price for first slot in this campaign (overrides default $600)
  additionalSlotPrice: integer("additional_slot_price"), // in cents, price for slots 2-4 in this campaign (overrides default $500)
  createdAt: integer("created_at", { mode: 'timestamp_ms' }),
});

export const campaignRoutes = sqliteTable("campaign_routes", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id").notNull().references(() => campaigns.id),
  routeId: text("route_id").notNull().references(() => routes.id),
  createdAt: integer("created_at", { mode: 'timestamp_ms' }),
});

export const campaignIndustries = sqliteTable("campaign_industries", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id").notNull().references(() => campaigns.id),
  industryId: text("industry_id").notNull().references(() => industries.id),
  createdAt: integer("created_at", { mode: 'timestamp_ms' }),
});

export const bookings = sqliteTable("bookings", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  campaignId: text("campaign_id").notNull().references(() => campaigns.id),
  routeId: text("route_id").notNull().references(() => routes.id),
  industryId: text("industry_id").notNull().references(() => industries.id),
  industryDescription: text("industry_description"), // Required when industryId is "Other"
  businessName: text("business_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone"),
  amount: integer("amount").notNull().default(60000), // in cents
  quantity: integer("quantity").notNull().default(1), // number of slots booked (1-4)
  priceOverride: integer("price_override"), // in cents, admin-set override price
  priceOverrideNote: text("price_override_note"), // explanation for price adjustment
  status: text("status").notNull().default("confirmed"), // 'pending', 'confirmed', 'cancelled'
  paymentStatus: text("payment_status").notNull().default("pending"), // 'pending', 'paid', 'failed'
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  amountPaid: integer("amount_paid"), // in cents, actual amount paid
  paidAt: integer("paid_at", { mode: 'timestamp_ms' }),
  paymentId: text("payment_id"), // legacy mock payment reference
  basePriceBeforeDiscounts: integer("base_price_before_discounts"), // in cents, price before any discounts applied
  loyaltyDiscountApplied: integer("loyalty_discount_applied", { mode: 'boolean' }).default(false), // true if loyalty discount was used for this booking
  countsTowardLoyalty: integer("counts_toward_loyalty", { mode: 'boolean' }).default(true), // true if this booking counts toward earning loyalty rewards
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
  mainMessage: text("main_message"), // Customer's main ad message (40 char limit)
  qrCodeDestination: text("qr_code_destination"), // 'website', 'special_offer', 'google_business', 'booking_page', 'contact_form'
  qrCodeUrl: text("qr_code_url"), // URL for QR code destination
  qrCodeLabel: text("qr_code_label"), // Text near QR code (20 char limit), default "SCAN FOR OFFER"
  brandColor: text("brand_color"), // Primary brand color (hex)
  secondaryColor: text("secondary_color"), // Secondary brand color (hex) - optional
  additionalColor1: text("additional_color_1"), // Third brand color (hex) - optional
  additionalColor2: text("additional_color_2"), // Fourth brand color (hex) - optional
  adStyle: text("ad_style"), // 'bold', 'professional', 'warm'
  logoFilePath: text("logo_file_path"), // Customer's logo file
  optionalImagePath: text("optional_image_path"), // Optional product/storefront/team photo
  designNotes: text("design_notes"), // Customer's additional notes/questions/concerns about design
  customFonts: text("custom_fonts"), // Customer's custom font preferences (optional)
  designStatus: text("design_status").notNull().default("pending_design"), // 'pending_design', 'sent_for_approval', 'approved', 'revision_requested'
  revisionCount: integer("revision_count").notNull().default(0), // 0-2, tracks number of revisions requested
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

export const pricingRules = sqliteTable("pricing_rules", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id").references(() => campaigns.id), // null = applies to all campaigns
  userId: text("user_id").references(() => users.id), // null = applies to all users
  ruleType: text("rule_type").notNull(), // 'fixed_price', 'discount_amount', 'discount_percent'
  value: integer("value").notNull(), // fixed_price: cents per slot, discount_amount: total cents off entire booking, discount_percent: integer percentage
  priority: integer("priority").notNull().default(0), // higher priority wins
  usageLimit: integer("usage_limit"), // null = unlimited, number = max times rule can be applied
  usageCount: integer("usage_count").notNull().default(0), // tracks how many times rule has been used
  status: text("status").notNull().default("active"), // 'active' or 'inactive'
  description: text("description").notNull(), // e.g., "New customer $100 discount", "Early bird pricing"
  displayName: text("display_name"), // Customer-facing label shown with pricing, e.g., "First Campaign Special!"
  createdAt: integer("created_at", { mode: 'timestamp_ms' }),
  createdBy: text("created_by").references(() => users.id),
});

export const pricingRuleApplications = sqliteTable("pricing_rule_applications", {
  id: text("id").primaryKey(),
  pricingRuleId: text("pricing_rule_id").notNull().references(() => pricingRules.id),
  bookingId: text("booking_id").notNull().references(() => bookings.id),
  userId: text("user_id").notNull().references(() => users.id),
  appliedAt: integer("applied_at", { mode: 'timestamp_ms' }),
});

export const customerNotes = sqliteTable("customer_notes", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").notNull().references(() => users.id),
  note: text("note").notNull(),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: integer("created_at", { mode: 'timestamp_ms' }),
});

export const customerTags = sqliteTable("customer_tags", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").notNull().references(() => users.id),
  tag: text("tag").notNull(), // 'high-value', 'waitlist', 'vip', etc.
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: integer("created_at", { mode: 'timestamp_ms' }),
});

export const referrals = sqliteTable("referrals", {
  id: text("id").primaryKey(),
  referrerId: text("referrer_id").notNull().references(() => users.id),
  referredId: text("referred_id").notNull().references(() => users.id),
  status: text("status").notNull().default("pending"), // 'pending', 'completed', 'credited'
  creditAmount: integer("credit_amount").notNull().default(10000), // in cents, default $100
  creditUsed: integer("credit_used", { mode: 'boolean' }).notNull().default(false),
  createdAt: integer("created_at", { mode: 'timestamp_ms' }),
});

export const designRevisions = sqliteTable("design_revisions", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id").notNull().references(() => bookings.id),
  revisionNumber: integer("revision_number").notNull(), // 0 = initial design, 1 = first revision, 2 = second revision
  designFilePath: text("design_file_path").notNull(), // Path to design file for this revision
  status: text("status").notNull(), // 'pending_review', 'approved', 'revision_requested'
  customerFeedback: text("customer_feedback"), // Customer's feedback when requesting revision
  adminNotes: text("admin_notes"), // Admin's notes/instructions when uploading design
  uploadedBy: text("uploaded_by").notNull().references(() => users.id), // Admin who uploaded this revision
  uploadedAt: integer("uploaded_at", { mode: 'timestamp_ms' }),
  reviewedAt: integer("reviewed_at", { mode: 'timestamp_ms' }), // When customer reviewed this version
});

export const adminSettings = sqliteTable("admin_settings", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(), // e.g., 'bulk_booking_campaigns', 'bulk_booking_discount', 'loyalty_slots_threshold', 'loyalty_discount_amount'
  value: text("value").notNull(), // stored as string, parsed as needed
  description: text("description"), // human-readable description of what this setting controls
  updatedAt: integer("updated_at", { mode: 'timestamp_ms' }),
  updatedBy: text("updated_by").references(() => users.id),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  name: true,
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

export const insertPricingRuleSchema = createInsertSchema(pricingRules).omit({
  id: true,
  createdAt: true,
  usageCount: true,
});

export const insertPricingRuleApplicationSchema = createInsertSchema(pricingRuleApplications).omit({
  id: true,
  appliedAt: true,
});

export const insertCustomerNoteSchema = createInsertSchema(customerNotes).omit({
  id: true,
  createdAt: true,
});

export const insertCustomerTagSchema = createInsertSchema(customerTags).omit({
  id: true,
  createdAt: true,
});

export const insertReferralSchema = createInsertSchema(referrals).omit({
  id: true,
  createdAt: true,
});

export const insertDesignRevisionSchema = createInsertSchema(designRevisions).omit({
  id: true,
  uploadedAt: true,
  reviewedAt: true,
});

export const insertAdminSettingSchema = createInsertSchema(adminSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertCampaignRouteSchema = createInsertSchema(campaignRoutes).omit({
  id: true,
  createdAt: true,
});

export const insertCampaignIndustrySchema = createInsertSchema(campaignIndustries).omit({
  id: true,
  createdAt: true,
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
export type PricingRule = typeof pricingRules.$inferSelect;
export type InsertPricingRule = z.infer<typeof insertPricingRuleSchema>;
export type PricingRuleApplication = typeof pricingRuleApplications.$inferSelect;
export type InsertPricingRuleApplication = z.infer<typeof insertPricingRuleApplicationSchema>;
export type CustomerNote = typeof customerNotes.$inferSelect;
export type InsertCustomerNote = z.infer<typeof insertCustomerNoteSchema>;
export type CustomerTag = typeof customerTags.$inferSelect;
export type InsertCustomerTag = z.infer<typeof insertCustomerTagSchema>;
export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type DesignRevision = typeof designRevisions.$inferSelect;
export type InsertDesignRevision = z.infer<typeof insertDesignRevisionSchema>;
export type AdminSetting = typeof adminSettings.$inferSelect;
export type InsertAdminSetting = z.infer<typeof insertAdminSettingSchema>;
export type CampaignRoute = typeof campaignRoutes.$inferSelect;
export type InsertCampaignRoute = z.infer<typeof insertCampaignRouteSchema>;
export type CampaignIndustry = typeof campaignIndustries.$inferSelect;
export type InsertCampaignIndustry = z.infer<typeof insertCampaignIndustrySchema>;

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
