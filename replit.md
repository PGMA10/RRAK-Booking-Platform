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
- **Schema**: Users, Routes, Industries, Campaigns, Bookings. Relationships include foreign key constraints.
- **Key Fields**: `mailDate`, `printDeadline` for campaigns; `artworkStatus`, `artworkFilePath`, `rejectionReason` for bookings; `quantity` for multi-slot bookings.
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
- **Customer Self-Service Cancellation**: Customer-initiated booking cancellation with automatic Stripe refund processing based on a 7-day policy relative to the print deadline.
- **Admin Notification Center**: Centralized notifications for new bookings, pending artwork review, and canceled bookings, with a 30-second polling for updates and per-admin dismissal.
- **Admin Dashboard Current Campaign Focus**: Displays current month's campaign metrics (slots booked, print/mail deadline countdowns, revenue) with auto-refresh.
- **Multi-Slot Booking System**: Allows booking 1-4 slots per transaction with tiered pricing: $600 for the first slot, $500 for each additional.
- **Booking Approval System**: Admin workflow for approving or rejecting new bookings with mandatory rejection notes, updating `approvalStatus`.
- **Pre-Booking Pricing System**: Rule-driven pricing engine with a hierarchical system: User fixed-price/discount, Campaign base price/discount, Default tiered pricing. Rules can be `fixed_price`, `discount_amount`, or `discount_percent`.

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