import { sql } from "drizzle-orm";
import { pgTable, text, integer, bigint, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const SLOTS_PER_ROUTE = 16;

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  name: text("name"),
  businessName: text("business_name"),
  phone: text("phone"),
  role: text("role").notNull().default("customer"),
  marketingOptIn: boolean("marketing_opt_in").notNull().default(false),
  referredByUserId: text("referred_by_user_id"),
  referralCode: text("referral_code").unique(),
  loyaltySlotsEarned: integer("loyalty_slots_earned").notNull().default(0),
  loyaltyDiscountsAvailable: integer("loyalty_discounts_available").notNull().default(0),
  loyaltyYearReset: integer("loyalty_year_reset").notNull().default(new Date().getFullYear()),
  createdAt: bigint("created_at", { mode: 'number' }),
});

export const routes = pgTable("routes", {
  id: text("id").primaryKey(),
  zipCode: text("zip_code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  householdCount: integer("household_count").notNull().default(0),
  status: text("status").notNull().default("active"),
});

export const industries = pgTable("industries", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  status: text("status").notNull().default("active"),
  icon: text("icon").notNull(),
});

export const industrySubcategories = pgTable("industry_subcategories", {
  id: text("id").primaryKey(),
  industryId: text("industry_id").notNull().references(() => industries.id),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("active"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: bigint("created_at", { mode: 'number' }),
});

export const campaigns = pgTable("campaigns", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  mailDate: bigint("mail_date", { mode: 'number' }).notNull(),
  printDeadline: bigint("print_deadline", { mode: 'number' }).notNull(),
  status: text("status").notNull().default("planning"),
  totalSlots: integer("total_slots").notNull().default(0),
  bookedSlots: integer("booked_slots").notNull().default(0),
  revenue: integer("revenue").notNull().default(0),
  baseSlotPrice: integer("base_slot_price"),
  additionalSlotPrice: integer("additional_slot_price"),
  createdAt: bigint("created_at", { mode: 'number' }),
});

export const campaignRoutes = pgTable("campaign_routes", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id").notNull().references(() => campaigns.id),
  routeId: text("route_id").notNull().references(() => routes.id),
  createdAt: bigint("created_at", { mode: 'number' }),
});

export const campaignIndustries = pgTable("campaign_industries", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id").notNull().references(() => campaigns.id),
  industryId: text("industry_id").notNull().references(() => industries.id),
  createdAt: bigint("created_at", { mode: 'number' }),
});

export const bookings = pgTable("bookings", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  campaignId: text("campaign_id").notNull().references(() => campaigns.id),
  routeId: text("route_id").notNull().references(() => routes.id),
  industryId: text("industry_id").notNull().references(() => industries.id),
  industrySubcategoryId: text("industry_subcategory_id").references(() => industrySubcategories.id),
  industrySubcategoryLabel: text("industry_subcategory_label"),
  industryDescription: text("industry_description"),
  businessName: text("business_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone"),
  amount: integer("amount").notNull().default(60000),
  quantity: integer("quantity").notNull().default(1),
  priceOverride: integer("price_override"),
  priceOverrideNote: text("price_override_note"),
  status: text("status").notNull().default("confirmed"),
  paymentStatus: text("payment_status").notNull().default("pending"),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  amountPaid: integer("amount_paid"),
  paidAt: bigint("paid_at", { mode: 'number' }),
  pendingSince: bigint("pending_since", { mode: 'number' }),
  paymentId: text("payment_id"),
  basePriceBeforeDiscounts: integer("base_price_before_discounts"),
  loyaltyDiscountApplied: boolean("loyalty_discount_applied").default(false),
  countsTowardLoyalty: boolean("counts_toward_loyalty").default(true),
  approvalStatus: text("approval_status").notNull().default("pending"),
  approvedAt: bigint("approved_at", { mode: 'number' }),
  rejectedAt: bigint("rejected_at", { mode: 'number' }),
  rejectionNote: text("rejection_note"),
  artworkStatus: text("artwork_status").notNull().default("pending_upload"),
  artworkFilePath: text("artwork_file_path"),
  artworkFileName: text("artwork_file_name"),
  artworkUploadedAt: bigint("artwork_uploaded_at", { mode: 'number' }),
  artworkReviewedAt: bigint("artwork_reviewed_at", { mode: 'number' }),
  artworkRejectionReason: text("artwork_rejection_reason"),
  mainMessage: text("main_message"),
  qrCodeDestination: text("qr_code_destination"),
  qrCodeUrl: text("qr_code_url"),
  qrCodeLabel: text("qr_code_label"),
  brandColor: text("brand_color"),
  secondaryColor: text("secondary_color"),
  additionalColor1: text("additional_color_1"),
  additionalColor2: text("additional_color_2"),
  adStyle: text("ad_style"),
  logoFilePath: text("logo_file_path"),
  optionalImagePath: text("optional_image_path"),
  designNotes: text("design_notes"),
  customFonts: text("custom_fonts"),
  designStatus: text("design_status").notNull().default("pending_design"),
  revisionCount: integer("revision_count").notNull().default(0),
  cancellationDate: bigint("cancellation_date", { mode: 'number' }),
  refundAmount: integer("refund_amount"),
  refundStatus: text("refund_status"),
  contractAccepted: boolean("contract_accepted").notNull().default(false),
  contractAcceptedAt: bigint("contract_accepted_at", { mode: 'number' }),
  contractVersion: text("contract_version"),
  adminNotes: text("admin_notes"),
  createdAt: bigint("created_at", { mode: 'number' }),
});

export const adminNotifications = pgTable("admin_notifications", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  bookingId: text("booking_id").notNull().references(() => bookings.id),
  isHandled: boolean("is_handled").notNull().default(false),
  handledAt: bigint("handled_at", { mode: 'number' }),
  createdAt: bigint("created_at", { mode: 'number' }),
});

export const dismissedNotifications = pgTable("dismissed_notifications", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id").notNull().references(() => bookings.id),
  notificationType: text("notification_type").notNull(),
  userId: text("user_id").notNull().references(() => users.id),
  dismissedAt: bigint("dismissed_at", { mode: 'number' }),
});

export const pricingRules = pgTable("pricing_rules", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id").references(() => campaigns.id),
  userId: text("user_id").references(() => users.id),
  ruleType: text("rule_type").notNull(),
  value: integer("value").notNull(),
  priority: integer("priority").notNull().default(0),
  usageLimit: integer("usage_limit"),
  usageCount: integer("usage_count").notNull().default(0),
  status: text("status").notNull().default("active"),
  description: text("description").notNull(),
  displayName: text("display_name"),
  createdAt: bigint("created_at", { mode: 'number' }),
  createdBy: text("created_by").references(() => users.id),
});

export const pricingRuleApplications = pgTable("pricing_rule_applications", {
  id: text("id").primaryKey(),
  pricingRuleId: text("pricing_rule_id").notNull().references(() => pricingRules.id),
  bookingId: text("booking_id").notNull().references(() => bookings.id),
  userId: text("user_id").notNull().references(() => users.id),
  appliedAt: bigint("applied_at", { mode: 'number' }),
});

export const customerNotes = pgTable("customer_notes", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").notNull().references(() => users.id),
  note: text("note").notNull(),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: bigint("created_at", { mode: 'number' }),
});

export const customerTags = pgTable("customer_tags", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").notNull().references(() => users.id),
  tag: text("tag").notNull(),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: bigint("created_at", { mode: 'number' }),
});

export const referrals = pgTable("referrals", {
  id: text("id").primaryKey(),
  referrerId: text("referrer_id").notNull().references(() => users.id),
  referredId: text("referred_id").notNull().references(() => users.id),
  status: text("status").notNull().default("pending"),
  creditAmount: integer("credit_amount").notNull().default(10000),
  creditUsed: boolean("credit_used").notNull().default(false),
  createdAt: bigint("created_at", { mode: 'number' }),
});

export const designRevisions = pgTable("design_revisions", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id").notNull().references(() => bookings.id),
  revisionNumber: integer("revision_number").notNull(),
  designFilePath: text("design_file_path").notNull(),
  status: text("status").notNull(),
  customerFeedback: text("customer_feedback"),
  adminNotes: text("admin_notes"),
  uploadedBy: text("uploaded_by").notNull().references(() => users.id),
  uploadedAt: bigint("uploaded_at", { mode: 'number' }),
  reviewedAt: bigint("reviewed_at", { mode: 'number' }),
});

export const adminSettings = pgTable("admin_settings", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: bigint("updated_at", { mode: 'number' }),
  updatedBy: text("updated_by").references(() => users.id),
});

export const waitlistEntries = pgTable("waitlist_entries", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  campaignId: text("campaign_id").notNull().references(() => campaigns.id),
  routeId: text("route_id").notNull().references(() => routes.id),
  industryId: text("industry_id").notNull().references(() => industries.id),
  industrySubcategoryId: text("industry_subcategory_id").references(() => industrySubcategories.id),
  notes: text("notes"),
  status: text("status").notNull().default("active"),
  notifiedCount: integer("notified_count").notNull().default(0),
  lastNotifiedAt: bigint("last_notified_at", { mode: 'number' }),
  lastNotifiedChannels: text("last_notified_channels"),
  createdAt: bigint("created_at", { mode: 'number' }),
});

export const waitlistNotifications = pgTable("waitlist_notifications", {
  id: text("id").primaryKey(),
  sentByAdminId: text("sent_by_admin_id").notNull().references(() => users.id),
  campaignId: text("campaign_id").notNull().references(() => campaigns.id),
  routeId: text("route_id").references(() => routes.id),
  industrySubcategoryId: text("industry_subcategory_id").references(() => industrySubcategories.id),
  message: text("message").notNull(),
  channels: text("channels").notNull(),
  recipientCount: integer("recipient_count").notNull().default(0),
  recipientUserIds: text("recipient_user_ids").notNull(),
  sentAt: bigint("sent_at", { mode: 'number' }),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  name: true,
  businessName: true,
  phone: true,
});

export const insertRouteSchema = createInsertSchema(routes).omit({ id: true });
export const insertIndustrySchema = createInsertSchema(industries).omit({ id: true });
export const insertIndustrySubcategorySchema = createInsertSchema(industrySubcategories).omit({ id: true, createdAt: true });
export const insertCampaignSchema = createInsertSchema(campaigns).omit({ id: true, createdAt: true });
export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, createdAt: true });
export const insertAdminNotificationSchema = createInsertSchema(adminNotifications).omit({ id: true, createdAt: true, handledAt: true });
export const insertDismissedNotificationSchema = createInsertSchema(dismissedNotifications).omit({ id: true, dismissedAt: true });
export const insertPricingRuleSchema = createInsertSchema(pricingRules).omit({ id: true, createdAt: true, usageCount: true });
export const insertPricingRuleApplicationSchema = createInsertSchema(pricingRuleApplications).omit({ id: true, appliedAt: true });
export const insertCustomerNoteSchema = createInsertSchema(customerNotes).omit({ id: true, createdAt: true });
export const insertCustomerTagSchema = createInsertSchema(customerTags).omit({ id: true, createdAt: true });
export const insertReferralSchema = createInsertSchema(referrals).omit({ id: true, createdAt: true });
export const insertDesignRevisionSchema = createInsertSchema(designRevisions).omit({ id: true, uploadedAt: true, reviewedAt: true });
export const insertAdminSettingSchema = createInsertSchema(adminSettings).omit({ id: true, updatedAt: true });
export const insertCampaignRouteSchema = createInsertSchema(campaignRoutes).omit({ id: true, createdAt: true });
export const insertCampaignIndustrySchema = createInsertSchema(campaignIndustries).omit({ id: true, createdAt: true });
export const insertWaitlistEntrySchema = createInsertSchema(waitlistEntries).omit({ id: true, createdAt: true, notifiedCount: true, lastNotifiedAt: true, lastNotifiedChannels: true });
export const insertWaitlistNotificationSchema = createInsertSchema(waitlistNotifications).omit({ id: true, sentAt: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Route = typeof routes.$inferSelect;
export type InsertRoute = z.infer<typeof insertRouteSchema>;
export type Industry = typeof industries.$inferSelect;
export type InsertIndustry = z.infer<typeof insertIndustrySchema>;
export type IndustrySubcategory = typeof industrySubcategories.$inferSelect;
export type InsertIndustrySubcategory = z.infer<typeof insertIndustrySubcategorySchema>;
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
export type WaitlistEntry = typeof waitlistEntries.$inferSelect;
export type InsertWaitlistEntry = z.infer<typeof insertWaitlistEntrySchema>;
export type WaitlistNotification = typeof waitlistNotifications.$inferSelect;
export type InsertWaitlistNotification = z.infer<typeof insertWaitlistNotificationSchema>;

export type BookingWithDetails = Booking & {
  route?: Route;
  industry?: Industry;
  campaign?: Campaign;
};

export type NotificationWithDetails = AdminNotification & {
  booking?: BookingWithDetails;
};

export type WaitlistEntryWithDetails = WaitlistEntry & {
  user?: User;
  campaign?: Campaign;
  route?: Route;
  industrySubcategory?: IndustrySubcategory;
};
