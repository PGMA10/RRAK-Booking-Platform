# Design Guidelines: Alaska Direct Mail Booking Platform

## Design Approach

**Selected Framework:** Material Design with Alaska-inspired visual identity
**Justification:** Information-dense admin tools require systematic patterns while customer interface benefits from welcoming, clean aesthetics. Material Design provides robust component library for both needs.

## Core Design Elements

### A. Color Palette

**Route Reach AK Brand Colors:**
- **Dark Blue (Primary):** #052D4B | hsl(205, 88%, 16%)
  - Brand color from logo
  - Use for: Primary buttons, body text, headings, navigation
  - Hover state: hsl(205, 88%, 24%)
  - Active state: hsl(205, 88%, 11%)
  - Excellent 12.3:1 contrast ratio on white backgrounds
  
- **Orange (Accent):** #EE5E18 | hsl(20, 86%, 51%)
  - Brand accent color from logo
  - Use for: Large headings (18pt+ bold), icons, badges, status indicators, statistics/numbers
  - **DO NOT use for:** Small text, thin typography, primary button labels
  - Reason: Only 3.3:1 contrast against white (fails WCAG for small text)
  - Safe for large bold text and decorative elements

**Light Mode Colors:**
- Background: hsl(210, 25%, 98%) - Cool off-white
- Foreground/Text: hsl(205, 88%, 16%) - Dark blue
- Card: hsl(0, 0%, 100%) - Pure white
- Muted: hsl(210, 25%, 96%) - Light gray backgrounds
- Border: hsl(210, 25%, 90%) - Subtle borders

**Dark Mode Colors:**
- Background: hsl(205, 30%, 8%) - Very dark blue-tinted
- Foreground/Text: hsl(210, 20%, 92%) - Light text
- Primary: hsl(205, 70%, 45%) - Lighter blue (visible on dark)
- Accent: hsl(20, 86%, 55%) - Brighter orange (dark mode visibility)
- Card: hsl(205, 25%, 12%) - Dark blue card

**Button Strategy:**
- **Primary Buttons:** Dark blue (#052D4B) background + white text
  - Excellent contrast: 12.3:1 ratio
  - Hover: Lighter blue hsl(205, 88%, 24%)
- **Secondary Buttons:** Light gray background + dark blue text
  - Uses hsl(210, 20%, 95%) background with dark blue text
  - Meets WCAG AA with >12:1 contrast
  - **Note:** Orange cannot be used for secondary button text due to insufficient contrast (3.3:1)
- **Accent/Badge Elements:** Very light orange background with dark blue text
  - Light mode: hsl(20, 95%, 96%) background + dark blue text
  - Dark mode: Dark orange background hsl(20, 40%, 25%) + bright orange text hsl(20, 86%, 70%)
- **Hover States:** Use lighter blue variants for interactive feedback

**Semantic Colors:**
- Success: hsl(150, 60%, 45%) - Green for approvals
- Warning: hsl(35, 85%, 55%) - Yellow for pending
- Error: hsl(0, 70%, 50%) - Red for rejections
- Info: hsl(205, 60%, 50%) - Blue for information

**Accessibility Notes:**
- All text meets WCAG AA standards (4.5:1 minimum)
- Orange accent limited to large/bold elements or decorative use
- Dark blue provides excellent readability for body text
- Focus indicators use dark blue ring with sufficient contrast

### B. Typography

**Font Stack:**
- Headers: 'Inter' (via Google Fonts) - weights 600, 700
- Body: 'Inter' - weights 400, 500, 600
- Mono (data): 'JetBrains Mono' - weight 400

**Scale:**
- H1: text-4xl md:text-5xl font-bold
- H2: text-2xl md:text-3xl font-semibold
- H3: text-xl font-semibold
- Body: text-base
- Small: text-sm
- Tiny: text-xs

### C. Layout System

**Spacing Primitives:** Use Tailwind units: 1, 2, 3, 4, 6, 8, 12, 16, 20
- Component padding: p-4 to p-6
- Section spacing: space-y-6 to space-y-8
- Card gaps: gap-4 to gap-6
- Page margins: px-4 md:px-6 lg:px-8

**Grid System:**
- Admin Dashboard: 12-column grid, sidebar + main content
- Customer Interface: Single column mobile, 2-3 columns tablet/desktop
- Sidebar: w-64 fixed on desktop, slide-over on mobile

### D. Component Library

**Navigation:**
- Admin: Fixed sidebar with icon + label navigation, collapsible on tablet
- Customer: Top navigation bar with profile dropdown, breadcrumbs for deep pages
- Mobile: Bottom tab bar for customer, slide-over menu for admin

**Cards & Containers:**
- Elevated cards: shadow-lg with rounded-xl corners
- Stats cards: p-6, hover:shadow-xl transition
- List items: border-b last:border-b-0, hover:bg-opacity-5

**Data Display:**
- Tables: Sticky headers, alternating row backgrounds, sortable columns
- Charts: Use Chart.js - line charts for bookings over time, bar charts for business comparisons
- Stats: Large numbers (text-3xl font-bold) with trend indicators (↑↓ arrows with color)
- Badges: Rounded-full px-3 py-1 for status (pending, completed, cancelled)

**Forms:**
- Input fields: ring-2 focus:ring-primary, rounded-lg, p-3
- Date pickers: Calendar overlay with range selection for booking dates
- Payment forms: Stripe-inspired with card preview
- Validation: Inline error messages below fields in error color

**Admin-Specific:**
- KPI Dashboard: 4-column grid of metric cards with sparkline charts
- Business Management: Searchable table with filters, bulk actions
- Analytics: Full-width chart panels with date range selector

**Customer-Specific:**
- Booking Flow: Multi-step wizard with progress indicator
- Booking Cards: Image thumbnail, business name, date/time, status badge, action buttons
- Payment History: Timeline view with transaction details, downloadable receipts

### E. Images

**Hero Section (Customer Interface):**
- Large hero image: 1920x800px Alaska landscape (mountains, northern lights, or glacier)
- Placement: Top of customer dashboard with welcome message overlay
- Treatment: Subtle gradient overlay (from 220 15% 12% at 50% to transparent)
- Buttons on hero: variant="outline" with backdrop-blur-md bg-white/10

**Additional Images:**
- Business thumbnails: 400x300px in booking cards
- Empty states: 600x400px illustrations for no bookings/no data
- Profile avatars: 40x40px circular

**No hero image for admin dashboard** - prioritize data density and immediate utility

### F. Interactions

**Micro-interactions:**
- Hover states: Scale 1.02 for cards, opacity 0.9 for buttons
- Loading: Skeleton screens for data tables, pulse animation
- Success actions: Subtle checkmark animation, toast notifications
- Transitions: duration-200 ease-in-out for most interactions

**Page Transitions:**
- Admin: Instant panel switches, no page-level animations
- Customer: Smooth fade transitions between booking steps

## Key Design Patterns

**Admin Dashboard Layout:**
- Left sidebar: Logo, main navigation, user profile at bottom
- Top bar: Page title, search, notifications, quick actions
- Main content: Grid of KPI cards, followed by data tables/charts
- Use max-w-7xl container for main content area

**Customer Dashboard Layout:**
- Hero section with personalized greeting and quick booking CTA
- Below hero: 3-column grid (upcoming bookings, recent activity, quick actions)
- Booking history: Filterable list view with status filters
- Use max-w-6xl container for content

**Responsive Breakpoints:**
- Mobile: Stack everything single column, bottom navigation
- Tablet (md:): 2-column grids, collapsible sidebar
- Desktop (lg:): Full multi-column layouts, persistent sidebar