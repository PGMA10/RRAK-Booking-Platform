# Route Reach AK - Direct Mail Booking Platform

## Overview
Route Reach AK is a direct mail booking platform for Alaska businesses, enabling them to book slots in direct mail campaigns across specific routes and industries. The platform features a customer-facing booking system and an admin dashboard for campaign management. It uses a slot-based booking system with limited availability, user authentication, campaign management, a comprehensive booking workflow, artwork upload and review, and integrated payment processing. The business vision is to streamline direct mail advertising for local Alaskan businesses, offering a clear market potential for targeted local advertising.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript (Vite)
- **Routing**: Wouter for client-side routing with protected routes
- **UI Components**: Radix UI primitives with Shadcn/UI
- **Styling**: Tailwind CSS with CSS variables
- **State Management**: TanStack Query for server state, React Context for authentication
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Authentication**: Passport.js with local strategy (bcrypt hashing)
- **Session Management**: Express sessions with PostgreSQL session store
- **API Design**: RESTful API with JSON responses
- **Development Tools**: TSX for TypeScript execution

### Database Architecture
- **ORM**: Drizzle ORM
- **Development Database**: SQLite
- **Production Database**: PostgreSQL
- **Schema**: Users, Routes, Industries, Campaigns, Bookings, CustomerNotes, CustomerTags, Referrals, DesignRevisions. Relationships include foreign key constraints.
- **Key Fields**: `mailDate`, `printDeadline` for campaigns; `artworkStatus`, `artworkFilePath`, `rejectionReason`, `basePriceBeforeDiscounts`, `loyaltyDiscountApplied`, `countsTowardLoyalty` for bookings; `quantity` for multi-slot bookings; `marketingOptIn`, `referredByUserId`, `referralCode`, `phone`, `loyaltySlotsEarned`, `loyaltyDiscountsAvailable`, `loyaltyYearReset` for users; `mainMessage`, `qrCodeDestination`, `brandColor`, `adStyle`, `logoFilePath`, `optionalImagePath`, `designStatus`, `revisionCount` for ad design briefs; `bulkBookingThreshold`, `bulkBookingDiscount`, `loyaltySlotThreshold`, `loyaltyDiscountAmount` for admin_settings.
- **Timestamp Handling**: SQLite stores dates as INTEGER, converted to Date objects on read.

### Authentication & Authorization
- **Strategy**: Session-based authentication with Scrypt password hashing
- **User Roles**: Customer and Admin with route-level protection
- **Session Storage**: PostgreSQL-backed session store

### Data Flow Architecture
- **Client-Server Communication**: HTTP REST API (JSON payloads, multipart/form-data for file uploads)
- **Query Management**: TanStack Query for caching and syncing
- **Error Handling**: Centralized error boundaries with toast notifications
- **File Uploads**: Multer middleware for artwork uploads with validation.

### Core Features & Implementations
- **Artwork Upload System**: Multer-based file upload (PNG, JPG, PDF, max 10MB) to `uploads/artwork` directory. Workflow: `pending_upload` → `under_review` → `approved`/`rejected`.
- **Customer Self-Service Cancellation**: Customer-initiated booking cancellation with automatic Stripe refund processing based on a 7-day policy relative to the print deadline. Refunds automatically deduct Stripe processing fees (2.9% + $0.30) from the refund amount. API responses include full breakdown: original payment amount, processing fee deducted, and net refund issued.
- **Admin Notification Center**: Centralized notifications for new bookings, pending artwork review, canceled bookings, design brief submissions, and design revision requests, with a 30-second polling for updates and per-admin dismissal. Includes Action Items widget on admin dashboard and Quick Actions button for "Review Ad Materials" with notification badge counts.
- **Admin Dashboard Current Campaign Focus**: Displays current month's campaign metrics (slots booked, print/mail deadline countdowns, revenue) with auto-refresh.
- **Admin Dashboard Real-Data Integration**: Dashboard uses live API endpoints (`/api/admin/dashboard-stats`, `/api/admin/recent-activity`, `/api/admin/business-metrics`) to display real-time data including current campaign statistics, recent booking activity, and business metrics. Features TanStack Query with auto-refresh intervals and loading states.
- **Multi-Slot Booking System**: Allows booking 1-4 slots per transaction with tiered pricing: $600 for the first slot, $500 for each additional.
- **Booking Approval System**: Admin workflow for approving or rejecting new bookings with mandatory rejection notes, updating `approvalStatus`.
- **Pre-Booking Pricing System**: Rule-driven pricing engine with a hierarchical system: User fixed-price/discount, Campaign base price/discount, Default tiered pricing. Rules can be `fixed_price`, `discount_amount`, or `discount_percent`.
- **Customer Relationship Management (CRM)**: Comprehensive CRM system with customer list view (search, sort, filter), detailed customer profiles showing lifetime value and booking history, customer notes for internal tracking, customer tagging for segmentation, and future-ready infrastructure for email marketing, referral programs ($100 off per referral, stackable, unlimited), and waitlist management.
- **"Other" Industry Unlimited Availability**: The "Other" industry category always shows as available regardless of existing bookings, allowing multiple businesses with different offerings to select it. When selected, customers must provide a mandatory description of their business type for admin review.
- **Ad Design Brief System**: Comprehensive collaborative ad design workflow where customers submit detailed design briefs with brand materials (logo, main message, QR code preferences, brand colors, ad style, optional images), admins create custom designs, and customers can approve or request revisions (up to 2 revisions for 3 total design attempts). Features dedicated `design_revisions` table for tracking revision history, separate file storage for logos (`uploads/logos`), images (`uploads/images`), and completed designs (`uploads/designs`), and full audit trail with upload/review timestamps.
- **Loyalty Rewards Program**: Automatic appreciation discount system where customers earn $150 off for every 3 slots booked at regular price. System tracks slots per user with annual reset on January 1st, applies discounts hierarchically in pricing service (after user fixed-price rules, before campaign rules), and deducts used discounts automatically upon payment. Features customer dashboard widget showing progress toward next reward (X/3 slots), available discount balance, and year-to-date total slots. Admin settings table allows configuration of threshold and discount amount. Discounts stack and persist until used. **Implementation note**: Loyalty tracking uses persistent pricing metadata (`basePriceBeforeDiscounts`, `loyaltyDiscountApplied`, `countsTowardLoyalty`) stored with each booking to accurately determine eligibility regardless of campaign-specific pricing, bulk discounts, or custom pricing rules.
- **Customer Dashboard Enhancements**: Filter toggle for bookings view with "Current/Upcoming" (default) showing only future campaigns and "All History" showing complete booking history. Active campaigns stat properly filters by payment status and future mail dates to show only valid active bookings.
- **Multi-Campaign Bulk Booking**: Dedicated booking flow (/customer/booking/multi) allowing customers to book 1-3 different campaigns (different mail dates) in a single checkout transaction. When 3 campaigns are booked together, customers receive a $300 bulk discount (pricing: $600 + $450 + $450 = $1,500 total vs. $1,800 regular). Each campaign requires unique route and industry selection. Multi-campaign checkout creates separate bookings for each campaign, processes payment through Stripe with combined total, and webhook updates all bookings upon successful payment. Loyalty tracking counts all slots from multi-campaign bookings toward the 3-slot threshold.
- **Booking Expiration & Cancellation System**: Production-ready system with race-condition-free file cleanup and idempotent cancellation logic. Unpaid pending bookings automatically expire after 15 minutes (tracked via `pendingSince` timestamp), with singleton-guarded background service running every minute. Cancellation is idempotent: `cancelBooking` returns `{ booking, cancelledNow: boolean }` to indicate whether fresh cancellation occurred. Both manual cancellation (via API) and automatic expiration verify booking state post-cancellation before deleting files (artwork, logo, optional image), preventing data loss if payment completes concurrently. File path columns are cleared in database upon cancellation to prevent orphaned references. Contract acceptance timestamp is refreshed when users pay for existing pending bookings, ensuring legal compliance.

### UI/UX Decisions
- Consistent use of Radix UI and Shadcn/UI for components.
- Tailwind CSS for styling and theming.
- Skeleton components and loading indicators for loading states.
- Lucide React for iconography.
- Wouter for a lightweight routing experience.

## External Dependencies

### Database Services
- **SQLite**: Development database.
- **Drizzle Kit**: Migrations and schema management.

### File Upload Services
- **Multer**: Multipart form data handling.
- **Node.js fs module**: File storage and cleanup.

### Authentication Services
- **Passport.js**: Authentication middleware.
- **Express-session**: Session management.

### Frontend Libraries
- **Radix UI**: Headless UI primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **TanStack Query**: Server state management.
- **React Hook Form**: Form handling.
- **Zod**: Schema validation.
- **Wouter**: Client-side routing.
- **Date-fns**: Date manipulation.

### Development Tools
- **Vite**: Build tool and development server.
- **TypeScript**: Type safety.
- **ESBuild**: Fast JavaScript bundler.
- **Replit Plugins**: Development environment integration.

### UI Enhancement
- **Lucide React**: Icon library.
- **Class Variance Authority**: Type-safe CSS class composition.
- **CLSX & Tailwind Merge**: Conditional and merged CSS classes.
- **Embla Carousel**: Carousel components.