export const schemaSQL = `
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
  "admin_notes" TEXT,
  "created_at" BIGINT
);

-- Add admin_notes column to existing bookings table (for existing databases)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'admin_notes'
  ) THEN
    ALTER TABLE "bookings" ADD COLUMN "admin_notes" TEXT;
  END IF;
END $$;

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
`;

export const seedSQL = `
-- Route Reach AK - Seed Data
-- This file is automatically executed on production startup after schema creation

-- Insert admin user (password: admin123, hashed with scrypt)
-- Hash format: {64-byte-hex}.{16-byte-salt-hex}
INSERT INTO "users" ("id", "username", "password", "email", "name", "role", "created_at")
VALUES (
  'admin-001',
  'admin',
  '26273261973baafcfdf1deacfe5282e06d4f45ea50824413a7691250bedb19d916e3ef3e87e1f890838b3d86a3f30d9667a3e90c72b6298a9ebe6a8ff9cd1a5e.0a906e7acbebb63364c7d6b7e11fb011',
  'admin@routereach.ak',
  'Admin User',
  'admin',
  EXTRACT(EPOCH FROM NOW()) * 1000
)
ON CONFLICT ("username") DO NOTHING;

-- Insert 5 Anchorage routes
INSERT INTO "routes" ("id", "zip_code", "name", "description", "household_count", "status")
VALUES 
  ('route-99501', '99501', 'Downtown Anchorage', 'Downtown business district and surrounding residential areas', 4500, 'active'),
  ('route-99502', '99502', 'Midtown Anchorage', 'Central Anchorage including Midtown Mall area', 6200, 'active'),
  ('route-99503', '99503', 'Spenard', 'Spenard neighborhood and Lake Hood area', 5100, 'active'),
  ('route-99504', '99504', 'East Anchorage', 'Muldoon and East Anchorage communities', 7800, 'active'),
  ('route-99507', '99507', 'South Anchorage', 'South Anchorage including Huffman and Rabbit Creek', 6500, 'active')
ON CONFLICT ("zip_code") DO NOTHING;

-- Insert 13 industries with icons
INSERT INTO "industries" ("id", "name", "description", "status", "icon")
VALUES 
  ('ind-construction', 'Construction', 'Building, renovation, and construction services', 'active', 'Hammer'),
  ('ind-healthcare', 'Healthcare', 'Medical and healthcare services', 'active', 'Heart'),
  ('ind-financial', 'Financial Services', 'Banking, insurance, and financial planning', 'active', 'DollarSign'),
  ('ind-realestate', 'Real Estate', 'Property sales, rentals, and management', 'active', 'Home'),
  ('ind-beauty', 'Beauty & Wellness', 'Salons, spas, and wellness services', 'active', 'Sparkles'),
  ('ind-home', 'Home Services', 'Cleaning, landscaping, and home maintenance', 'active', 'Wrench'),
  ('ind-automotive', 'Automotive', 'Auto repair, sales, and services', 'active', 'Car'),
  ('ind-food', 'Food & Beverage', 'Restaurants, catering, and food services', 'active', 'UtensilsCrossed'),
  ('ind-professional', 'Professional Services', 'Legal, consulting, and business services', 'active', 'Briefcase'),
  ('ind-retail', 'Retail', 'Retail stores and shopping', 'active', 'ShoppingBag'),
  ('ind-pet', 'Pet Services', 'Veterinary, grooming, and pet care', 'active', 'Dog'),
  ('ind-fitness', 'Fitness & Recreation', 'Gyms, sports, and recreational activities', 'active', 'Dumbbell'),
  ('ind-outdoor', 'Outdoor Recreation and Tours', 'Hunting, fishing, and outdoor adventures', 'active', 'Mountain')
ON CONFLICT ("name") DO NOTHING;

-- Insert industry subcategories
-- Construction subcategories
INSERT INTO "industry_subcategories" ("id", "industry_id", "name", "description", "status", "sort_order", "created_at")
VALUES 
  ('sub-elec', 'ind-construction', 'Electrical', 'Electrical contractors and services', 'active', 1, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sub-carp', 'ind-construction', 'Carpentry', 'Carpentry and woodworking services', 'active', 2, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sub-plumb', 'ind-construction', 'Plumbing & HVAC', 'Plumbing and HVAC services', 'active', 3, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sub-roof', 'ind-construction', 'Roofing', 'Roofing installation and repair', 'active', 4, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sub-conc', 'ind-construction', 'Concrete & Masonry', 'Concrete and masonry work', 'active', 5, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sub-gen', 'ind-construction', 'General Contractor', 'General contracting services', 'active', 6, EXTRACT(EPOCH FROM NOW()) * 1000)
ON CONFLICT ("id") DO NOTHING;

-- Healthcare subcategories
INSERT INTO "industry_subcategories" ("id", "industry_id", "name", "description", "status", "sort_order", "created_at")
VALUES 
  ('sub-dent', 'ind-healthcare', 'Dentist/Orthodontist', 'Dental and orthodontic services', 'active', 1, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sub-psych', 'ind-healthcare', 'Psychiatry/Mental Health', 'Mental health services', 'active', 2, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sub-chiro', 'ind-healthcare', 'Chiropractic', 'Chiropractic care', 'active', 3, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sub-optom', 'ind-healthcare', 'Optometry', 'Eye care and optometry', 'active', 4, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sub-pt', 'ind-healthcare', 'Physical Therapy', 'Physical therapy services', 'active', 5, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sub-massage', 'ind-healthcare', 'Massage Therapy', 'Therapeutic massage', 'active', 6, EXTRACT(EPOCH FROM NOW()) * 1000)
ON CONFLICT ("id") DO NOTHING;

-- Financial Services subcategories
INSERT INTO "industry_subcategories" ("id", "industry_id", "name", "description", "status", "sort_order", "created_at")
VALUES 
  ('sub-acct', 'ind-financial', 'Accounting/Bookkeeping', 'Accounting and bookkeeping services', 'active', 1, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sub-finplan', 'ind-financial', 'Financial Planning', 'Financial planning and wealth management', 'active', 2, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sub-insur', 'ind-financial', 'Insurance', 'Insurance services', 'active', 3, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sub-tax', 'ind-financial', 'Tax Services', 'Tax preparation and planning', 'active', 4, EXTRACT(EPOCH FROM NOW()) * 1000)
ON CONFLICT ("id") DO NOTHING;

-- Real Estate subcategories
INSERT INTO "industry_subcategories" ("id", "industry_id", "name", "description", "status", "sort_order", "created_at")
VALUES 
  ('sub-realtor', 'ind-realestate', 'Realtor/Agent', 'Real estate agents and brokers', 'active', 1, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sub-mortgage', 'ind-realestate', 'Loan Originator/Mortgage', 'Mortgage and loan services', 'active', 2, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sub-propmgmt', 'ind-realestate', 'Property Management', 'Property management services', 'active', 3, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sub-appraise', 'ind-realestate', 'Appraisal Services', 'Property appraisal services', 'active', 4, EXTRACT(EPOCH FROM NOW()) * 1000)
ON CONFLICT ("id") DO NOTHING;

-- Beauty & Wellness subcategories
INSERT INTO "industry_subcategories" ("id", "industry_id", "name", "description", "status", "sort_order", "created_at")
VALUES 
  ('sub-hairsal', 'ind-beauty', 'Hair Salon', 'Hair styling and cutting', 'active', 1, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sub-spa', 'ind-beauty', 'Spa/Massage', 'Spa and massage services', 'active', 2, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sub-beautystore', 'ind-beauty', 'Beauty Supply Store', 'Beauty product retail', 'active', 3, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sub-nail', 'ind-beauty', 'Nail Salon', 'Nail care services', 'active', 4, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sub-medspa', 'ind-beauty', 'Aesthetics/Med Spa', 'Medical spa and aesthetics', 'active', 5, EXTRACT(EPOCH FROM NOW()) * 1000)
ON CONFLICT ("id") DO NOTHING;

-- Home Services subcategories
INSERT INTO "industry_subcategories" ("id", "industry_id", "name", "description", "status", "sort_order", "created_at")
VALUES 
  ('sub-clean', 'ind-home', 'Cleaning Services', 'Residential and commercial cleaning', 'active', 1, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sub-landscape', 'ind-home', 'Landscaping/Lawn Care', 'Lawn and landscaping services', 'active', 2, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sub-pest', 'ind-home', 'Pest Control', 'Pest control services', 'active', 3, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sub-appliance', 'ind-home', 'Appliance Repair', 'Home appliance repair', 'active', 4, EXTRACT(EPOCH FROM NOW()) * 1000)
ON CONFLICT ("id") DO NOTHING;

-- Automotive subcategories
INSERT INTO "industry_subcategories" ("id", "industry_id", "name", "description", "status", "sort_order", "created_at")
VALUES 
  ('sub-autorepair', 'ind-automotive', 'Auto Repair/Mechanic', 'Auto repair and mechanical services', 'active', 1, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sub-autodetail', 'ind-automotive', 'Auto Detailing', 'Car detailing and cleaning', 'active', 2, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sub-tire', 'ind-automotive', 'Tire Services', 'Tire sales and services', 'active', 3, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sub-autobody', 'ind-automotive', 'Auto Body/Paint', 'Body work and painting', 'active', 4, EXTRACT(EPOCH FROM NOW()) * 1000)
ON CONFLICT ("id") DO NOTHING;

-- Food & Beverage subcategories
INSERT INTO "industry_subcategories" ("id", "industry_id", "name", "description", "status", "sort_order", "created_at")
VALUES 
  ('sub-restaurant', 'ind-food', 'Restaurant', 'Restaurants and dining', 'active', 1, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sub-catering', 'ind-food', 'Catering', 'Catering services', 'active', 2, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sub-bakery', 'ind-food', 'Bakery/Cafe', 'Bakeries and cafes', 'active', 3, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sub-bar', 'ind-food', 'Bar/Brewery', 'Bars and breweries', 'active', 4, EXTRACT(EPOCH FROM NOW()) * 1000)
ON CONFLICT ("id") DO NOTHING;

-- Professional Services subcategories
INSERT INTO "industry_subcategories" ("id", "industry_id", "name", "description", "status", "sort_order", "created_at")
VALUES 
  ('sub-legal', 'ind-professional', 'Legal Services', 'Law firms and legal services', 'active', 1, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sub-it', 'ind-professional', 'IT Services', 'IT and technology services', 'active', 2, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sub-consult', 'ind-professional', 'Consulting', 'Business consulting', 'active', 3, EXTRACT(EPOCH FROM NOW()) * 1000)
ON CONFLICT ("id") DO NOTHING;

-- Retail subcategories
INSERT INTO "industry_subcategories" ("id", "industry_id", "name", "description", "status", "sort_order", "created_at")
VALUES 
  ('sub-clothing', 'ind-retail', 'Clothing/Apparel', 'Clothing and apparel stores', 'active', 1, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sub-sporting', 'ind-retail', 'Sporting Goods', 'Sporting goods stores', 'active', 2, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sub-electronics', 'ind-retail', 'Electronics', 'Electronics stores', 'active', 3, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sub-homegoods', 'ind-retail', 'Home Goods', 'Home goods and furniture', 'active', 4, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sub-specialty', 'ind-retail', 'Specialty Retail', 'Specialty retail stores', 'active', 5, EXTRACT(EPOCH FROM NOW()) * 1000)
ON CONFLICT ("id") DO NOTHING;

-- Pet Services subcategories
INSERT INTO "industry_subcategories" ("id", "industry_id", "name", "description", "status", "sort_order", "created_at")
VALUES 
  ('sub-vet', 'ind-pet', 'Veterinary Care', 'Veterinary services', 'active', 1, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sub-petgroom', 'ind-pet', 'Pet Grooming', 'Pet grooming services', 'active', 2, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sub-petsit', 'ind-pet', 'Dog Walking/Pet Sitting', 'Pet sitting and walking', 'active', 3, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sub-petstore', 'ind-pet', 'Pet Supply Store', 'Pet supplies and retail', 'active', 4, EXTRACT(EPOCH FROM NOW()) * 1000)
ON CONFLICT ("id") DO NOTHING;

-- Fitness & Recreation subcategories
INSERT INTO "industry_subcategories" ("id", "industry_id", "name", "description", "status", "sort_order", "created_at")
VALUES 
  ('sub-gym', 'ind-fitness', 'Gym/Fitness Center', 'Gyms and fitness centers', 'active', 1, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sub-trainer', 'ind-fitness', 'Personal Training', 'Personal training services', 'active', 2, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sub-yoga', 'ind-fitness', 'Yoga/Pilates Studio', 'Yoga and pilates studios', 'active', 3, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sub-sports', 'ind-fitness', 'Sports Facilities', 'Sports facilities and courts', 'active', 4, EXTRACT(EPOCH FROM NOW()) * 1000)
ON CONFLICT ("id") DO NOTHING;

-- Outdoor Recreation and Tours subcategories
INSERT INTO "industry_subcategories" ("id", "industry_id", "name", "description", "status", "sort_order", "created_at")
VALUES 
  ('sub-hunting', 'ind-outdoor', 'Hunting Guides', 'Hunting guide services', 'active', 1, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sub-scenic', 'ind-outdoor', 'Scenic Touring', 'Scenic tours and sightseeing', 'active', 2, EXTRACT(EPOCH FROM NOW()) * 1000),
  ('sub-fishing', 'ind-outdoor', 'Fishing Charters', 'Fishing charter services', 'active', 3, EXTRACT(EPOCH FROM NOW()) * 1000)
ON CONFLICT ("id") DO NOTHING;

-- Insert default admin settings
INSERT INTO "admin_settings" ("id", "key", "value", "description", "updated_at")
VALUES 
  ('setting-bulk', 'bulkBookingThreshold', '3', 'Number of campaigns for bulk discount', EXTRACT(EPOCH FROM NOW()) * 1000),
  ('setting-bulk-disc', 'bulkBookingDiscount', '30000', 'Bulk booking discount in cents ($300)', EXTRACT(EPOCH FROM NOW()) * 1000),
  ('setting-loyalty', 'loyaltySlotThreshold', '3', 'Slots needed for loyalty discount', EXTRACT(EPOCH FROM NOW()) * 1000),
  ('setting-loyalty-disc', 'loyaltyDiscountAmount', '15000', 'Loyalty discount amount in cents ($150)', EXTRACT(EPOCH FROM NOW()) * 1000)
ON CONFLICT ("key") DO NOTHING;
`;
