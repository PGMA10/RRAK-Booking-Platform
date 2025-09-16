import { useAuth } from "@/hooks/use-auth";
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
  Activity
} from "lucide-react";
import { Redirect, Link } from "wouter";
import { 
  demoStats, 
  demoRecentActivities, 
  demoCampaigns, 
  demoQuickActions 
} from "@/lib/demo-data";

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

        {/* 1. Overview Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Active Campaigns</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-active-campaigns">
                    {demoStats.totalActiveCampaigns}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Calendar className="h-6 w-6 text-accent" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Bookings This Month</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-bookings-month">
                    {demoStats.totalBookingsThisMonth}
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
                    ${demoStats.revenueThisMonth.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-chart-5/10 rounded-lg">
                  <Target className="h-6 w-6 text-chart-5" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Available Slots</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-available-slots">
                    {demoStats.availableSlotsRemaining}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {demoQuickActions.map((action) => {
                    const IconComponent = getActivityIcon(action.icon);
                    
                    // Special handling for manage-routes to navigate to route management page
                    if (action.id === 'manage-routes') {
                      return (
                        <Link key={action.id} href="/admin/routes">
                          <Button
                            variant="outline"
                            className="h-auto p-4 flex flex-col items-start space-y-2 w-full"
                            data-testid={`button-${action.id}`}
                          >
                            <div className="flex items-center space-x-2">
                              <IconComponent className="h-5 w-5" />
                              <span className="font-semibold">{action.label}</span>
                            </div>
                            <p className="text-sm text-muted-foreground text-left">
                              {action.description}
                            </p>
                          </Button>
                        </Link>
                      );
                    }
                    
                    // Special handling for manage-industries to navigate to industry management page
                    if (action.id === 'manage-industries') {
                      return (
                        <Link key={action.id} href="/admin/industries">
                          <Button
                            variant="outline"
                            className="h-auto p-4 flex flex-col items-start space-y-2 w-full"
                            data-testid={`button-${action.id}`}
                          >
                            <div className="flex items-center space-x-2">
                              <IconComponent className="h-5 w-5" />
                              <span className="font-semibold">{action.label}</span>
                            </div>
                            <p className="text-sm text-muted-foreground text-left">
                              {action.description}
                            </p>
                          </Button>
                        </Link>
                      );
                    }
                    
                    // Special handling for manage-campaigns to navigate to campaign management page
                    if (action.id === 'manage-campaigns') {
                      return (
                        <Link key={action.id} href="/admin/campaigns">
                          <Button
                            variant="outline"
                            className="h-auto p-4 flex flex-col items-start space-y-2 w-full"
                            data-testid={`button-${action.id}`}
                          >
                            <div className="flex items-center space-x-2">
                              <IconComponent className="h-5 w-5" />
                              <span className="font-semibold">{action.label}</span>
                            </div>
                            <p className="text-sm text-muted-foreground text-left">
                              {action.description}
                            </p>
                          </Button>
                        </Link>
                      );
                    }
                    
                    // Default rendering for other actions
                    return (
                      <Button
                        key={action.id}
                        variant="outline"
                        className="h-auto p-4 flex flex-col items-start space-y-2"
                        data-testid={`button-${action.id}`}
                      >
                        <div className="flex items-center space-x-2">
                          <IconComponent className="h-5 w-5" />
                          <span className="font-semibold">{action.label}</span>
                        </div>
                        <p className="text-sm text-muted-foreground text-left">
                          {action.description}
                        </p>
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* 4. Campaign Status Section */}
            <Card>
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
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* 3. Recent Activity Feed */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Recent Activity</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {demoRecentActivities.map((activity) => {
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
              </CardContent>
            </Card>

            {/* Additional Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle>Business Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Customers</span>
                    <span className="font-semibold text-foreground" data-testid="text-total-customers">
                      {demoStats.totalCustomers}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Occupancy Rate</span>
                    <span className="font-semibold text-foreground" data-testid="text-occupancy-rate">
                      {demoStats.occupancyRate}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Avg. Booking Value</span>
                    <span className="font-semibold text-foreground">$600</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}