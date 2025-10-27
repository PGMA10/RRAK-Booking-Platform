# Route Reach AK - Direct Mail Booking Platform

## Overview

Route Reach AK is a direct mail booking platform designed specifically for Alaska businesses. The application allows businesses to book slots in direct mail campaigns across different routes (zip codes) and industries. It features a customer-facing booking system and an admin dashboard for campaign management.

The platform operates on a slot-based booking system where campaigns have limited availability (64 slots by default), and businesses can reserve their spot for specific routes and industries. The system includes user authentication, campaign management, a comprehensive booking workflow, and an artwork upload and review system where customers submit their ad designs for admin approval before printing.

## User Preferences

Preferred communication style: Simple, everyday language.

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
- **Artwork Fields**: Bookings table includes artwork tracking (status, file path, filename, upload/review timestamps, rejection reason)

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