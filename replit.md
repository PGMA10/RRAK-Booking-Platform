# Route Reach AK - Direct Mail Booking Platform

## Overview
Route Reach AK is a direct mail booking platform designed for Alaska businesses to book slots in direct mail campaigns across specific routes and industries. The platform offers a customer-facing booking system and an admin dashboard for campaign management, featuring slot-based booking with limited availability, user authentication, and integrated payment processing. Its purpose is to streamline direct mail advertising for local Alaskan businesses, tapping into the market potential for targeted local advertising.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript (Vite)
- **Routing**: Wouter for client-side routing with protected routes
- **UI**: Radix UI primitives with Shadcn/UI, styled using Tailwind CSS with CSS variables
- **State Management**: TanStack Query for server state, React Context for authentication
- **Forms**: React Hook Form with Zod validation

### Backend
- **Runtime**: Node.js with Express.js
- **Authentication**: Passport.js with local strategy (Scrypt for password hashing), session-based with PostgreSQL session store, supporting Customer and Admin roles. Password validation requires: 8+ characters, uppercase, lowercase, number, and special character. Rate limiting: 5 failed attempts per IP per 15 minutes on login/register endpoints.
- **Stripe Webhook Security**: Webhook signature verification using `stripe.webhooks.constructEvent()` with STRIPE_WEBHOOK_SECRET. Rejected webhooks are logged for monitoring. Handles `charge.refunded` events to automatically update booking status and create admin notifications (full refunds only; partial refund support is a future enhancement).
- **API**: RESTful API with JSON responses
- **File Uploads**: Multer middleware for artwork uploads (`uploads/artwork`, `uploads/logos`, `uploads/images`, `uploads/designs`) with validation and workflow (`pending_upload` → `under_review` → `approved`/`rejected`).

### Database
- **ORM**: Drizzle ORM
- **Development**: SQLite (`data.db`)
- **Production**: PostgreSQL (Neon)
- **Schema**: Includes Users, Routes, Industries, IndustrySubcategories, Campaigns, Bookings, CustomerNotes, CustomerTags, Referrals, DesignRevisions, LoyaltyRewards. Key fields support detailed booking, user, and campaign data.
- **Timestamp/Boolean Handling**: Consistent across SQLite (BIGINT/INTEGER) and PostgreSQL (native types).

### Core Features
- **Slot-Based Booking**: Allows booking 1-4 slots per transaction with tiered pricing and bulk discounts.
- **Industry Subcategory System**: Prevents competing businesses from booking the same route/campaign slot, with 13 categories and 56 specific subcategories. An "Other" industry category allows unlimited availability with mandatory business type description.
- **"Other" Industry Auto-Inclusion**: "Other" industry is automatically included in all campaigns (both new and existing). Storage layer enforces this at write-time for both MemStorage and PostgreSQL. Migration runs on app startup to add "Other" to existing campaigns.
- **Artwork Upload & Ad Design Brief System**: Comprehensive workflow for customers to submit design briefs and materials, and for admins to manage approvals and revisions (up to 2 revisions).
- **Customer Self-Service Cancellation**: Allows customers to cancel bookings with automatic Stripe refunds based on a 7-day policy, deducting Stripe processing fees.
- **Admin Dashboard & Notifications**: Centralized notifications for key events, with action items, current campaign metrics, and real-time data integration. Admins can manually mark bookings as paid and add internal notes.
- **Loyalty Rewards Program**: Automatic $150 discount for every 3 slots booked at regular price, with annual reset and customer dashboard tracking.
- **Multi-Campaign Bulk Booking**: Allows booking 1-3 different campaigns in a single transaction with a $300 bulk discount for 3 campaigns.
- **Booking Expiration & Cancellation**: Unpaid bookings expire after 15 minutes, with idempotent cancellation logic and race-condition-free file cleanup.
- **Customer Relationship Management (CRM)**: Features customer list, profiles, notes, and tagging for segmentation and future marketing/referral programs.
- **Industry Management**: DELETE endpoint added for industry deletion with protection against deleting "Other" industry.

### UI/UX
- Consistent use of Radix UI, Shadcn/UI, and Tailwind CSS.
- Loading indicators and skeleton components for improved user experience.
- Lucide React for iconography.

## External Dependencies

### Database & ORM
- SQLite (development)
- Drizzle ORM
- Drizzle Kit

### File Handling
- Multer
- Node.js `fs` module

### Authentication
- Passport.js
- Express-session

### Frontend Libraries
- Radix UI
- Tailwind CSS
- TanStack Query
- React Hook Form
- Zod
- Wouter
- Date-fns

### Development Tools
- Vite
- TypeScript
- ESBuild

### UI Utilities
- Lucide React
- Class Variance Authority (CVA)
- CLSX & Tailwind Merge
- Embla Carousel