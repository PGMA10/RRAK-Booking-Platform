# Route Reach AK - Direct Mail Booking Platform

## Overview

Route Reach AK is a direct mail booking platform designed specifically for Alaska businesses. The application allows businesses to book slots in direct mail campaigns across different routes (zip codes) and industries. It features a customer-facing booking system and an admin dashboard for campaign management.

The platform operates on a slot-based booking system where campaigns have limited availability (64 slots by default), and businesses can reserve their spot for specific routes and industries. The system includes user authentication, campaign management, a comprehensive booking workflow, and an artwork upload and review system where customers submit their ad designs for admin approval before printing.

## User Preferences

Preferred communication style: Simple, everyday language.

## Test Credentials

### Seeded Users (automatically created on server start)
- **Admin**: Username `admin`, Password `admin123`
- **Customer**: Username `testcustomer`, Password `customer123`

### Home Page Redirect (November 1, 2025)
- Removed customer dashboard landing page for streamlined user experience
- Home page ("/") now redirects based on user role:
  - Customers → `/customer/booking` (direct to booking interface)
  - Admins → `/admin` (admin dashboard)
- Clicking "Route Reach AK" logo takes users directly to their primary workflow

### Session Cookie Fix (October 31, 2025)
- Fixed 401 Unauthorized errors after login by disabling `trust proxy` in development mode
- Session cookies now work correctly - authentication persists across requests
- Issue was caused by Express proxy settings interfering with cookie handling in Replit environment

### Stripe Payment Verification Fix (October 31, 2025)
- **Issue**: Bookings remained in "Payment Pending" status even after successful Stripe checkout in test/dev mode
- **Root Cause**: Stripe webhooks are not automatically triggered in local development - they require Stripe CLI or configured webhook endpoints
- **Solution**: Implemented manual payment verification on confirmation page
  - Added `/api/stripe-verify-session` endpoint that retrieves Stripe session status via API
  - Confirmation page automatically calls verification endpoint on load
  - Booking status updates from "pending" to "paid" when Stripe confirms payment
  - Updates payment details: `stripePaymentIntentId`, `amountPaid`, `paidAt` timestamp
- **User Experience**: Payment status now correctly shows "Paid" immediately after successful Stripe checkout
- **Business License Removal**: Removed all business license verification fields per user request - businesses will be vetted manually outside the system

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, built using Vite
- **Routing**: Wouter for client-side routing with protected routes
- **UI Components**: Radix UI primitives with Shadcn/UI component library
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query for server state, React Context for authentication
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Authentication**: Passport.js with local strategy using bcrypt-style password hashing
- **Session Management**: Express sessions with PostgreSQL session store
- **API Design**: RESTful API with JSON responses
- **Development Tools**: TSX for TypeScript execution, Vite for development server

### Database Architecture
- **ORM**: Drizzle ORM with SQLite for development (migrations to PostgreSQL for production)
- **Schema**: Five main entities - users, routes, industries, campaigns, and bookings
- **Relationships**: Foreign key constraints linking bookings to users, campaigns, routes, and industries
- **Data Types**: Auto-incrementing IDs, timestamps for audit trails, text fields for status
- **Campaign Date Fields**: Campaigns have mailDate (when postcards are mailed) and printDeadline (deadline for print-ready artwork, used for cancellation refund eligibility)
- **Artwork Fields**: Bookings table includes artwork tracking (status, file path, filename, upload/review timestamps, rejection reason)
- **Timestamp Handling**: SQLite stores dates as INTEGER (milliseconds since epoch), converted to Date objects when read using convertBookingTimestamps helper

### Authentication & Authorization
- **Strategy**: Session-based authentication with secure password hashing
- **User Roles**: Customer and admin roles with route-level protection
- **Session Storage**: PostgreSQL-backed session store for persistence
- **Password Security**: Scrypt hashing with salt for password storage

### Data Flow Architecture
- **Client-Server Communication**: HTTP REST API with JSON payloads and multipart/form-data for file uploads
- **Query Management**: TanStack Query for caching, optimistic updates, and background syncing
- **Error Handling**: Centralized error boundaries with toast notifications
- **Loading States**: Skeleton components and loading indicators throughout the UI
- **File Uploads**: Multer middleware for artwork uploads with type and size validation

### Artwork Upload System
- **File Upload**: Multer-based file upload with validation (PNG, JPG, PDF up to 10MB)
- **Storage**: Files organized in uploads/artwork directory by booking ID
- **Workflow States**: pending_upload → under_review → approved/rejected
- **Customer Features**: Upload artwork, view status, see rejection reasons, re-upload after rejection
- **Admin Features**: Review queue, approve/reject with reasons, track review timestamps
- **Security**: File type validation, size limits, user authorization checks, proper error handling

### Customer Self-Service Cancellation System
- **Feature**: Customer-initiated booking cancellation with automatic Stripe refund processing
- **Cancellation Policy**: 7-day deadline - full refund if 7+ days before campaign print deadline, no refund within 7 days
- **Eligibility**: Any non-cancelled booking with 'paid' or 'pending' payment status
- **Refund Processing**: Automatic Stripe refund via API for eligible cancellations (7+ days before print deadline)
- **Slot Release**: Canceled bookings immediately release their slot, decrement campaign bookedSlots and revenue
- **Database Fields**: cancellationDate (timestamp), refundAmount (cents), refundStatus ('pending'|'processed'|'no_refund'|'failed')
- **Customer UI**: Cancel Booking button on dashboard with confirmation dialog showing refund eligibility
- **Admin Visibility**: Canceled bookings appear in admin notifications (last 7 days) with refund status
- **API Endpoint**: `POST /api/bookings/:bookingId/cancel` with authorization checks
- **Error Handling**: Validates campaign print deadline exists, proper payment status, booking ownership

### Admin Notification Center
- **Purpose**: Centralized actionable items tracking separate from Recent Activity historical timeline
- **Notification Types**: New bookings (last 24 hours), artwork pending review (under_review status), canceled bookings (last 7 days)
- **Components**: Action Items dashboard widget, dedicated Notifications page, navigation badge counter
- **Data Model**: Notifications derived from booking state (not separately persisted)
- **Real-time Updates**: 30-second polling for counts and notifications
- **API Endpoints**: `/api/notifications/count`, `/api/notifications/summary`, `/api/notifications`
- **Security**: All notification endpoints enforce admin-only access
- **UI Design**: Action Items widget above Recent Activity, grouped notifications by type, consistent counts across all locations
- **Canceled Bookings Display**: Shows refund status (processed/pending/no_refund/failed), cancellation time, booking details

### Notification Dismissal System (November 1, 2025)
- **Feature**: Per-admin notification dismissal to manage notification visibility individually
- **Database**: dismissedNotifications table tracks bookingId, userId, notificationType, and dismissedAt timestamp
- **Behavior**: Dismissed notifications are filtered from all counts, lists, and summaries per-admin
- **UI Controls**: X icon dismiss button on all notification cards, auto-dismiss on "View Details" click
- **API Endpoint**: `POST /api/notifications/:bookingId/dismiss` with notificationType parameter
- **Cache Management**: Automatic query invalidation ensures real-time UI updates after dismissal
- **Per-User Tracking**: Each admin can dismiss/view notifications independently without affecting other admins
- **Data Model**: Uses separate dismissedNotifications table to maintain backward compatibility with derived notifications approach

### Admin Dashboard Current Campaign Focus (November 1, 2025)
- **Feature**: Admin dashboard shows current month's campaign metrics instead of aggregate stats
- **Current Month Detection**: Finds campaign where mailDate matches current month/year
- **Dashboard Metrics**:
  - **Slots Booked**: Shows "X/64" format with visual progress bar
  - **Print Deadline**: Countdown timer showing days/hours until print deadline
  - **Mail Deadline**: Countdown timer showing days/hours until mail date
  - **Revenue This Month**: Total revenue from paid bookings in current campaign
- **Empty State**: Shows "No campaign scheduled for this month" message when no current campaign exists
- **Countdown Format**: "X days Yh" for >24 hours, "Xh Ym" for <24 hours, "Not set" if null, "Passed" if in past
- **Auto-refresh**: Stats refresh every 60 seconds to keep countdown timers current
- **API Endpoint**: GET /api/dashboard/stats returns campaign-specific data for current month
- **Edge Cases**: Guards against division by zero in progress bar, handles null deadlines gracefully

### Booking Approval System (October 31, 2025)
- **Feature**: Admin approval/rejection workflow for new bookings with rejection notes
- **Approval States**: pending (default) → approved/rejected
- **Database Fields**: approvalStatus, approvedAt, rejectedAt, rejectionNote
- **Admin UI**: Approve/Reject buttons in BookingDetailsModal for pending bookings
- **Rejection Dialog**: Clean AlertDialog with textarea for rejection notes (required field)
- **API Endpoints**: `POST /api/bookings/:bookingId/approve`, `POST /api/bookings/:bookingId/reject`
- **Notification Integration**: Modal accessible from all notification "View Details" buttons
- **Display**: Approval Status section shows current status, approval/rejection timestamps, rejection notes
- **Business Logic**: Only pending, non-cancelled bookings show approve/reject buttons
- **Cache Invalidation**: Automatically refreshes notifications after approval/rejection actions
- **User Communication**: Rejection notes visible to admins for tracking and future customer communication

## External Dependencies

### Database Services
- **SQLite**: Development database with better-sqlite3 driver
- **Drizzle Kit**: Database migrations and schema management
- **MemoryStore**: In-memory session store for development

### File Upload Services
- **Multer**: Multipart form data handling for artwork uploads
- **File System**: Node.js fs module for file storage and cleanup

### Authentication Services
- **Passport.js**: Authentication middleware with local strategy
- **Express-session**: Session management with secure cookie handling

### Frontend Libraries
- **Radix UI**: Headless UI primitives for accessibility and functionality
- **Tailwind CSS**: Utility-first CSS framework for styling
- **TanStack Query**: Server state management and caching
- **React Hook Form**: Form handling with validation
- **Zod**: Schema validation for forms and API data
- **Wouter**: Lightweight client-side routing
- **Date-fns**: Date manipulation and formatting

### Development Tools
- **Vite**: Build tool and development server with HMR
- **TypeScript**: Type safety across the entire stack
- **ESBuild**: Fast JavaScript bundler for production builds
- **Replit Plugins**: Development environment integration for cartographer and dev banner

### UI Enhancement
- **Lucide React**: Icon library for consistent iconography
- **Class Variance Authority**: Type-safe CSS class composition
- **CLSX & Tailwind Merge**: Conditional and merged CSS classes
- **Embla Carousel**: Carousel components for UI elements