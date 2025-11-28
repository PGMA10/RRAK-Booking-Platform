-- Route Reach AK - Initial Database Schema
-- This file is automatically executed on production startup

-- Session table for express-session with connect-pg-simple
CREATE TABLE IF NOT EXISTS "session" (
  "sid" VARCHAR NOT NULL PRIMARY KEY,
  "sess" JSON NOT NULL,
  "expire" TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

-- Users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT PRIMARY KEY,
  "username" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "name" TEXT,
  "business_name" TEXT,
  "phone" TEXT,
  "role" TEXT NOT NULL DEFAULT 'customer',
  "marketing_opt_in" BOOLEAN NOT NULL DEFAULT false,
  "referred_by_user_id" TEXT,
  "referral_code" TEXT UNIQUE,
  "loyalty_slots_earned" INTEGER NOT NULL DEFAULT 0,
  "loyalty_discounts_available" INTEGER NOT NULL DEFAULT 0,
  "loyalty_year_reset" INTEGER NOT NULL DEFAULT 2025,
  "created_at" BIGINT
);

-- Routes table
CREATE TABLE IF NOT EXISTS "routes" (
  "id" TEXT PRIMARY KEY,
  "zip_code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "household_count" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'active'
);

-- Industries table
CREATE TABLE IF NOT EXISTS "industries" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "icon" TEXT NOT NULL
);

-- Industry subcategories table
CREATE TABLE IF NOT EXISTS "industry_subcategories" (
  "id" TEXT PRIMARY KEY,
  "industry_id" TEXT NOT NULL REFERENCES "industries"("id"),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" BIGINT
);

-- Campaigns table
CREATE TABLE IF NOT EXISTS "campaigns" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "mail_date" BIGINT NOT NULL,
  "print_deadline" BIGINT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'planning',
  "total_slots" INTEGER NOT NULL DEFAULT 0,
  "booked_slots" INTEGER NOT NULL DEFAULT 0,
  "revenue" INTEGER NOT NULL DEFAULT 0,
  "base_slot_price" INTEGER,
  "additional_slot_price" INTEGER,
  "created_at" BIGINT
);

-- Campaign routes junction table
CREATE TABLE IF NOT EXISTS "campaign_routes" (
  "id" TEXT PRIMARY KEY,
  "campaign_id" TEXT NOT NULL REFERENCES "campaigns"("id"),
  "route_id" TEXT NOT NULL REFERENCES "routes"("id"),
  "created_at" BIGINT
);

-- Campaign industries junction table
CREATE TABLE IF NOT EXISTS "campaign_industries" (
  "id" TEXT PRIMARY KEY,
  "campaign_id" TEXT NOT NULL REFERENCES "campaigns"("id"),
  "industry_id" TEXT NOT NULL REFERENCES "industries"("id"),
  "created_at" BIGINT
);

-- Bookings table
CREATE TABLE IF NOT EXISTS "bookings" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "users"("id"),
  "campaign_id" TEXT NOT NULL REFERENCES "campaigns"("id"),
  "route_id" TEXT NOT NULL REFERENCES "routes"("id"),
  "industry_id" TEXT NOT NULL REFERENCES "industries"("id"),
  "industry_subcategory_id" TEXT REFERENCES "industry_subcategories"("id"),
  "industry_subcategory_label" TEXT,
  "industry_description" TEXT,
  "business_name" TEXT NOT NULL,
  "contact_email" TEXT NOT NULL,
  "contact_phone" TEXT,
  "amount" INTEGER NOT NULL DEFAULT 60000,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "price_override" INTEGER,
  "price_override_note" TEXT,
  "status" TEXT NOT NULL DEFAULT 'confirmed',
  "payment_status" TEXT NOT NULL DEFAULT 'pending',
  "stripe_checkout_session_id" TEXT,
  "stripe_payment_intent_id" TEXT,
  "amount_paid" INTEGER,
  "paid_at" BIGINT,
  "pending_since" BIGINT,
  "payment_id" TEXT,
  "base_price_before_discounts" INTEGER,
  "loyalty_discount_applied" BOOLEAN DEFAULT false,
  "counts_toward_loyalty" BOOLEAN DEFAULT true,
  "approval_status" TEXT NOT NULL DEFAULT 'pending',
  "approved_at" BIGINT,
  "rejected_at" BIGINT,
  "rejection_note" TEXT,
  "artwork_status" TEXT NOT NULL DEFAULT 'pending_upload',
  "artwork_file_path" TEXT,
  "artwork_file_name" TEXT,
  "artwork_uploaded_at" BIGINT,
  "artwork_reviewed_at" BIGINT,
  "artwork_rejection_reason" TEXT,
  "main_message" TEXT,
  "qr_code_destination" TEXT,
  "qr_code_url" TEXT,
  "qr_code_label" TEXT,
  "brand_color" TEXT,
  "secondary_color" TEXT,
  "additional_color_1" TEXT,
  "additional_color_2" TEXT,
  "ad_style" TEXT,
  "logo_file_path" TEXT,
  "optional_image_path" TEXT,
  "design_notes" TEXT,
  "custom_fonts" TEXT,
  "design_status" TEXT NOT NULL DEFAULT 'pending_design',
  "revision_count" INTEGER NOT NULL DEFAULT 0,
  "cancellation_date" BIGINT,
  "refund_amount" INTEGER,
  "refund_status" TEXT,
  "contract_accepted" BOOLEAN NOT NULL DEFAULT false,
  "contract_accepted_at" BIGINT,
  "contract_version" TEXT,
  "created_at" BIGINT
);

-- Admin notifications table
CREATE TABLE IF NOT EXISTS "admin_notifications" (
  "id" TEXT PRIMARY KEY,
  "type" TEXT NOT NULL,
  "booking_id" TEXT NOT NULL REFERENCES "bookings"("id"),
  "is_handled" BOOLEAN NOT NULL DEFAULT false,
  "handled_at" BIGINT,
  "created_at" BIGINT
);

-- Dismissed notifications table
CREATE TABLE IF NOT EXISTS "dismissed_notifications" (
  "id" TEXT PRIMARY KEY,
  "booking_id" TEXT NOT NULL REFERENCES "bookings"("id"),
  "notification_type" TEXT NOT NULL,
  "user_id" TEXT NOT NULL REFERENCES "users"("id"),
  "dismissed_at" BIGINT
);

-- Pricing rules table
CREATE TABLE IF NOT EXISTS "pricing_rules" (
  "id" TEXT PRIMARY KEY,
  "campaign_id" TEXT REFERENCES "campaigns"("id"),
  "user_id" TEXT REFERENCES "users"("id"),
  "rule_type" TEXT NOT NULL,
  "value" INTEGER NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "usage_limit" INTEGER,
  "usage_count" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'active',
  "description" TEXT NOT NULL,
  "display_name" TEXT,
  "created_at" BIGINT,
  "created_by" TEXT REFERENCES "users"("id")
);

-- Pricing rule applications table
CREATE TABLE IF NOT EXISTS "pricing_rule_applications" (
  "id" TEXT PRIMARY KEY,
  "pricing_rule_id" TEXT NOT NULL REFERENCES "pricing_rules"("id"),
  "booking_id" TEXT NOT NULL REFERENCES "bookings"("id"),
  "user_id" TEXT NOT NULL REFERENCES "users"("id"),
  "applied_at" BIGINT
);

-- Customer notes table
CREATE TABLE IF NOT EXISTS "customer_notes" (
  "id" TEXT PRIMARY KEY,
  "customer_id" TEXT NOT NULL REFERENCES "users"("id"),
  "note" TEXT NOT NULL,
  "created_by" TEXT NOT NULL REFERENCES "users"("id"),
  "created_at" BIGINT
);

-- Customer tags table
CREATE TABLE IF NOT EXISTS "customer_tags" (
  "id" TEXT PRIMARY KEY,
  "customer_id" TEXT NOT NULL REFERENCES "users"("id"),
  "tag" TEXT NOT NULL,
  "created_by" TEXT NOT NULL REFERENCES "users"("id"),
  "created_at" BIGINT
);

-- Referrals table
CREATE TABLE IF NOT EXISTS "referrals" (
  "id" TEXT PRIMARY KEY,
  "referrer_id" TEXT NOT NULL REFERENCES "users"("id"),
  "referred_id" TEXT NOT NULL REFERENCES "users"("id"),
  "status" TEXT NOT NULL DEFAULT 'pending',
  "credit_amount" INTEGER NOT NULL DEFAULT 10000,
  "credit_used" BOOLEAN NOT NULL DEFAULT false,
  "created_at" BIGINT
);

-- Design revisions table
CREATE TABLE IF NOT EXISTS "design_revisions" (
  "id" TEXT PRIMARY KEY,
  "booking_id" TEXT NOT NULL REFERENCES "bookings"("id"),
  "revision_number" INTEGER NOT NULL,
  "design_file_path" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "customer_feedback" TEXT,
  "admin_notes" TEXT,
  "uploaded_by" TEXT NOT NULL REFERENCES "users"("id"),
  "uploaded_at" BIGINT,
  "reviewed_at" BIGINT
);

-- Admin settings table
CREATE TABLE IF NOT EXISTS "admin_settings" (
  "id" TEXT PRIMARY KEY,
  "key" TEXT NOT NULL UNIQUE,
  "value" TEXT NOT NULL,
  "description" TEXT,
  "updated_at" BIGINT,
  "updated_by" TEXT REFERENCES "users"("id")
);

-- Waitlist entries table
CREATE TABLE IF NOT EXISTS "waitlist_entries" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "users"("id"),
  "campaign_id" TEXT NOT NULL REFERENCES "campaigns"("id"),
  "route_id" TEXT NOT NULL REFERENCES "routes"("id"),
  "industry_id" TEXT NOT NULL REFERENCES "industries"("id"),
  "industry_subcategory_id" TEXT REFERENCES "industry_subcategories"("id"),
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "notified_count" INTEGER NOT NULL DEFAULT 0,
  "last_notified_at" BIGINT,
  "last_notified_channels" TEXT,
  "created_at" BIGINT
);

-- Waitlist notifications table
CREATE TABLE IF NOT EXISTS "waitlist_notifications" (
  "id" TEXT PRIMARY KEY,
  "sent_by_admin_id" TEXT NOT NULL REFERENCES "users"("id"),
  "campaign_id" TEXT NOT NULL REFERENCES "campaigns"("id"),
  "route_id" TEXT REFERENCES "routes"("id"),
  "industry_subcategory_id" TEXT REFERENCES "industry_subcategories"("id"),
  "message" TEXT NOT NULL,
  "channels" TEXT NOT NULL,
  "recipient_count" INTEGER NOT NULL DEFAULT 0,
  "recipient_user_ids" TEXT NOT NULL,
  "sent_at" BIGINT
);
