import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/navigation";
import { DemoBanner } from "@/components/demo-banner";
import { 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Users, 
  Target,
  Plus,
  CalendarCheck,
  Map,
  Briefcase,
  UserPlus,
  Clock,
  Activity,
  FileText,
  Bell,
  ChevronRight,
  AlertCircle
} from "lucide-react";
import { Redirect, Link } from "wouter";
import type { Booking } from "@shared/schema";

const iconMap = {
  "user-plus": UserPlus,
  "calendar-check": CalendarCheck,
  "dollar-sign": DollarSign,
  "plus": Plus,
  "calendar": Calendar,
  "map": Map,
  "briefcase": Briefcase
};

export default function AdminPage() {
  const { user } = useAuth();

  // Redirect non-admin users
  if (user && user.role !== "admin") {
    return <Redirect to="/" />;
  }

  // Fetch dashboard stats
  const { data: dashboardStats, isLoading: statsLoading } = useQuery<{
    campaignId: string | null;
    campaignName: string | null;
    slotsBooked: number;
    totalSlots: number;
    printDeadline: string | null;
    mailDeadline: string | null;
    revenueThisMonth: number;
  }>({
    queryKey: ['/api/admin/dashboard-stats'],
    enabled: !!user && user.role === "admin",
    refetchInterval: 60000, // Refresh every minute for countdown updates
  });

  // Fetch recent activity
  const { data: recentActivities, isLoading: activitiesLoading } = useQuery<Array<{
    id: string;
    type: 'booking' | 'payment' | 'registration';
    message: string;
    timestamp: string;
    icon: string;
  }>>({
    queryKey: ['/api/admin/recent-activity'],
    enabled: !!user && user.role === "admin",
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch business metrics
  const { data: businessMetrics, isLoading: metricsLoading } = useQuery<{
    totalCustomers: number;
    occupancyRate: number;
    avgBookingValue: number;
  }>({
    queryKey: ['/api/admin/business-metrics'],
    enabled: !!user && user.role === "admin",
    refetchInterval: 60000, // Refresh every minute
  });

  // Calculate countdown for deadlines
  const getCountdown = (deadline: string | null): string => {
    if (!deadline) return "Not set";
    
    const now = new Date();
    const target = new Date(deadline);
    const diffMs = target.getTime() - now.getTime();
    
    if (diffMs < 0) return "Passed";
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''} ${hours}h`;
    } else {
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
    }
  };

  // Fetch pending artwork reviews count
  const { data: pendingArtwork } = useQuery<Booking[]>({
    queryKey: ['/api/bookings/artwork/review'],
    enabled: !!user && user.role === "admin",
  });

  const pendingCount = pendingArtwork?.length || 0;

  // Fetch notification summary for Action Items widget
  const { data: notificationSummary } = useQuery<{
    newBookings: number;
    artworkReviews: number;
    total: number;
  }>({
    queryKey: ['/api/notifications/summary'],
    enabled: !!user && user.role === "admin",
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getActivityIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName as keyof typeof iconMap] || Activity;
    return IconComponent;
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'registration': return 'text-blue-500';
      case 'booking': return 'text-green-500';
      case 'payment': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'open': return 'secondary';
      case 'planning': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DemoBanner />
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground">Admin Dashboard</h2>
          <p className="text-muted-foreground mt-2">Route Reach AK business operations overview</p>
        </div>

        {/* 1. Current Campaign Overview */}
        {!statsLoading && (
          <div className="mb-4">
            {dashboardStats?.campaignName ? (
              <h3 className="text-lg font-semibold text-foreground">
                Current Campaign: {dashboardStats.campaignName}
              </h3>
            ) : (
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <p className="text-sm text-muted-foreground">
                  No campaign scheduled for this month. Create a campaign to start tracking metrics.
                </p>
              </div>
            )}
          </div>
        )}

        {/* 2. Overview Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Target className="h-6 w-6 text-primary" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-muted-foreground">Slots Booked</p>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-slots-booked">
                    {statsLoading ? '...' : `${dashboardStats?.slotsBooked || 0}/${dashboardStats?.totalSlots || 64}`}
                  </p>
                  <div className="mt-2 w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ 
                        width: `${dashboardStats && dashboardStats.totalSlots > 0 ? (dashboardStats.slotsBooked / dashboardStats.totalSlots) * 100 : 0}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-chart-1/10 rounded-lg">
                  <Calendar className="h-6 w-6 text-chart-1" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Print Deadline</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-print-deadline">
                    {statsLoading ? '...' : getCountdown(dashboardStats?.printDeadline || null)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-chart-2/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-chart-2" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Mail Deadline</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-mail-deadline">
                    {statsLoading ? '...' : getCountdown(dashboardStats?.mailDeadline || null)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-chart-3/10 rounded-lg">
                  <DollarSign className="h-6 w-6 text-chart-3" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Revenue This Month</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-revenue-month">
                    {statsLoading ? '...' : `$${(dashboardStats?.revenueThisMonth || 0).toLocaleString()}`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* 2. Quick Action Buttons */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Link href="/admin/routes">
                    <Button variant="outline" className="h-auto p-4 flex flex-col items-start space-y-2 w-full" data-testid="button-manage-routes">
                      <div className="flex items-center space-x-2">
                        <Map className="h-5 w-5" />
                        <span className="font-semibold">Manage Routes</span>
                      </div>
                      <p className="text-sm text-muted-foreground text-left">Add, edit, or remove delivery routes</p>
                    </Button>
                  </Link>
                  <Link href="/admin/industries">
                    <Button variant="outline" className="h-auto p-4 flex flex-col items-start space-y-2 w-full" data-testid="button-manage-industries">
                      <div className="flex items-center space-x-2">
                        <Briefcase className="h-5 w-5" />
                        <span className="font-semibold">Manage Industries</span>
                      </div>
                      <p className="text-sm text-muted-foreground text-left">Configure available industry categories</p>
                    </Button>
                  </Link>
                  <Link href="/admin/campaigns">
                    <Button variant="outline" className="h-auto p-4 flex flex-col items-start space-y-2 w-full" data-testid="button-manage-campaigns">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-5 w-5" />
                        <span className="font-semibold">Manage Campaigns</span>
                      </div>
                      <p className="text-sm text-muted-foreground text-left">View and manage all campaigns</p>
                    </Button>
                  </Link>
                  <Link href="/admin/campaigns">
                    <Button variant="outline" className="h-auto p-4 flex flex-col items-start space-y-2 w-full" data-testid="button-create-campaign">
                      <div className="flex items-center space-x-2">
                        <Plus className="h-5 w-5" />
                        <span className="font-semibold">Create Campaign</span>
                      </div>
                      <p className="text-sm text-muted-foreground text-left">Set up a new direct mail campaign</p>
                    </Button>
                  </Link>
                  <Link href="/admin/notifications">
                    <Button variant="outline" className="h-auto p-4 flex flex-col items-start space-y-2 w-full" data-testid="button-view-notifications">
                      <div className="flex items-center space-x-2">
                        <Bell className="h-5 w-5" />
                        <span className="font-semibold">View Notifications</span>
                      </div>
                      <p className="text-sm text-muted-foreground text-left">Review all pending notifications</p>
                    </Button>
                  </Link>
                  <Link href="/admin/artwork">
                    <Button variant="outline" className="h-auto p-4 flex flex-col items-start space-y-2 w-full" data-testid="button-review-artwork">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-5 w-5" />
                        <span className="font-semibold">Review Artwork</span>
                        {pendingCount > 0 && (
                          <Badge variant="destructive" className="ml-auto h-6 min-w-6 flex items-center justify-center" data-testid="badge-pending-count">
                            {pendingCount}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground text-left">Approve or reject customer artwork submissions</p>
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* 4. Campaign Status Section - Commented out (used demo data) */}
            {/* <Card>
              <CardHeader>
                <CardTitle>Campaign Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {demoCampaigns.map((campaign) => (
                    <div key={campaign.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold text-foreground">{campaign.name}</h4>
                          <Badge variant={getStatusColor(campaign.status)} data-testid={`badge-campaign-${campaign.id}`}>
                            {campaign.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Mail Date: {new Date(campaign.mailDate).toLocaleDateString()} | 
                          Deadline: {new Date(campaign.deadline).toLocaleDateString()}
                        </p>
                        <div className="flex items-center space-x-4 text-sm">
                          <span className="text-muted-foreground">
                            Slots: {campaign.bookedSlots}/{campaign.totalSlots}
                          </span>
                          <span className="text-muted-foreground">
                            Revenue: ${(campaign.bookedSlots * 600).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <div className="w-20 bg-secondary rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all" 
                            style={{ width: `${(campaign.bookedSlots / campaign.totalSlots) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {Math.round((campaign.bookedSlots / campaign.totalSlots) * 100)}% filled
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card> */}
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Action Items Widget */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="h-5 w-5" />
                  <span>Action Items</span>
                  {notificationSummary && notificationSummary.total > 0 && (
                    <Badge variant="destructive" className="ml-auto" data-testid="badge-action-items-total">
                      {notificationSummary.total}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* New Bookings */}
                  <Link href="/admin/notifications">
                    <div className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer" data-testid="action-item-new-bookings">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                          <UserPlus className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">New Bookings</p>
                          <p className="text-sm text-muted-foreground">
                            {notificationSummary?.newBookings || 0} awaiting confirmation
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {notificationSummary && notificationSummary.newBookings > 0 && (
                          <Badge variant="outline" data-testid="badge-new-bookings-count">
                            {notificationSummary.newBookings}
                          </Badge>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </Link>

                  {/* Artwork Reviews */}
                  <Link href="/admin/artwork">
                    <div className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer" data-testid="action-item-artwork-reviews">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Artwork Pending Review</p>
                          <p className="text-sm text-muted-foreground">
                            {notificationSummary?.artworkReviews || 0} submissions to review
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {notificationSummary && notificationSummary.artworkReviews > 0 && (
                          <Badge variant="outline" data-testid="badge-artwork-reviews-count">
                            {notificationSummary.artworkReviews}
                          </Badge>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </Link>

                  {notificationSummary && notificationSummary.total === 0 && (
                    <div className="text-center py-6">
                      <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No pending action items</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 3. Recent Activity Feed */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Recent Activity</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activitiesLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-start space-x-3 animate-pulse">
                        <div className="p-1.5 rounded-full bg-muted w-8 h-8" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-3/4" />
                          <div className="h-3 bg-muted rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentActivities && recentActivities.length > 0 ? (
                  <div className="space-y-4">
                    {recentActivities.map((activity) => {
                      const IconComponent = getActivityIcon(activity.icon);
                      return (
                        <div key={activity.id} className="flex items-start space-x-3">
                          <div className={`p-1.5 rounded-full ${getActivityColor(activity.type)} bg-current/10`}>
                            <IconComponent className={`h-4 w-4 ${getActivityColor(activity.type)}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground" data-testid={`activity-${activity.id}`}>
                              {activity.message}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center mt-1">
                              <Clock className="h-3 w-3 mr-1" />
                              {activity.timestamp}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Additional Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle>Business Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                {metricsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex justify-between items-center animate-pulse">
                        <div className="h-4 bg-muted rounded w-1/3" />
                        <div className="h-4 bg-muted rounded w-1/4" />
                      </div>
                    ))}
                  </div>
                ) : businessMetrics ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Customers</span>
                      <span className="font-semibold text-foreground" data-testid="text-total-customers">
                        {businessMetrics.totalCustomers}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Occupancy Rate</span>
                      <span className="font-semibold text-foreground" data-testid="text-occupancy-rate">
                        {businessMetrics.occupancyRate}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Avg. Booking Value</span>
                      <span className="font-semibold text-foreground">${businessMetrics.avgBookingValue}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground">No data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}