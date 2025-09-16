// Demo data service for Route Reach AK admin dashboard
export const demoStats = {
  totalActiveCampaigns: 3,
  totalBookingsThisMonth: 28,
  revenueThisMonth: 16800,
  availableSlotsRemaining: 36,
  totalCustomers: 42,
  occupancyRate: 73
};

export const demoRecentActivities = [
  {
    id: '1',
    type: 'registration',
    message: 'Arctic Plumbing Services registered',
    timestamp: '2 hours ago',
    icon: 'user-plus'
  },
  {
    id: '2',
    type: 'booking',
    message: 'New booking: Financial Services on Route 99502',
    timestamp: '4 hours ago',
    icon: 'calendar-check'
  },
  {
    id: '3',
    type: 'payment',
    message: 'Payment received: $600 from Northland Auto',
    timestamp: '6 hours ago',
    icon: 'dollar-sign'
  },
  {
    id: '4',
    type: 'registration',
    message: 'Midnight Sun Real Estate registered',
    timestamp: '1 day ago',
    icon: 'user-plus'
  },
  {
    id: '5',
    type: 'booking',
    message: 'New booking: Healthcare on Route 99507',
    timestamp: '1 day ago',
    icon: 'calendar-check'
  },
  {
    id: '6',
    type: 'payment',
    message: 'Payment received: $1,200 from Alaska Electric',
    timestamp: '2 days ago',
    icon: 'dollar-sign'
  }
];

export const demoCampaigns = [
  {
    id: '1',
    name: 'November 2024 Campaign',
    scheduledDate: '2024-11-15',
    status: 'active',
    bookedSlots: 18,
    totalSlots: 64,
    deadline: '2024-11-10',
    mailDate: '2024-11-15'
  },
  {
    id: '2',
    name: 'December 2024 Campaign',
    scheduledDate: '2024-12-15',
    status: 'open',
    bookedSlots: 7,
    totalSlots: 64,
    deadline: '2024-12-10',
    mailDate: '2024-12-15'
  },
  {
    id: '3',
    name: 'January 2025 Campaign',
    scheduledDate: '2025-01-15',
    status: 'planning',
    bookedSlots: 0,
    totalSlots: 64,
    deadline: '2025-01-10',
    mailDate: '2025-01-15'
  }
];

export const demoRoutes = [
  { id: '1', zipCode: '99502', name: 'Downtown/Midtown', description: 'Central Anchorage business district' },
  { id: '2', zipCode: '99507', name: 'South Anchorage', description: 'Residential and commercial areas' },
  { id: '3', zipCode: '99515', name: 'Hillside', description: 'Hillside residential area' },
  { id: '4', zipCode: '99516', name: 'Abbott Loop', description: 'Abbott Loop area' }
];

export const demoQuickActions = [
  {
    id: 'manage-campaigns',
    label: 'Manage Campaigns',
    description: 'Create and manage monthly campaigns',
    icon: 'calendar',
    color: 'primary'
  },
  {
    id: 'view-bookings',
    label: 'View All Bookings',
    description: 'Review current and past bookings',
    icon: 'calendar-check',
    color: 'secondary'
  },
  {
    id: 'manage-routes',
    label: 'Manage Routes',
    description: 'Configure delivery routes and areas',
    icon: 'map',
    color: 'accent'
  },
  {
    id: 'manage-industries',
    label: 'Manage Industries',
    description: 'Add or edit industry categories',
    icon: 'briefcase',
    color: 'chart-3'
  }
];