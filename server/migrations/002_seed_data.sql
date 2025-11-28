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
