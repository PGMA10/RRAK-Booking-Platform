import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/navigation";
import { DemoBanner } from "@/components/demo-banner";
import { Users, TrendingUp, Percent, Plus, Edit, Settings } from "lucide-react";
import { Redirect } from "wouter";

export default function AdminPage() {
  const { user } = useAuth();

  // Redirect non-admin users
  if (user && user.role !== "admin") {
    return <Redirect to="/" />;
  }

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ["/api/campaigns"],
  });

  const { data: routes, isLoading: routesLoading } = useQuery({
    queryKey: ["/api/routes"],
  });

  const { data: allBookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ["/api/bookings"],
  });

  if (statsLoading || campaignsLoading || routesLoading || bookingsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <DemoBanner />
        <Navigation />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DemoBanner />
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground">Admin Panel</h2>
          <p className="text-muted-foreground mt-2">Manage routes, industries, and campaign settings</p>
        </div>

        {/* Admin Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Customers</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-admin-customers">
                    {stats?.totalCustomers || allBookings?.length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-accent" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-admin-revenue">
                    ${stats?.totalRevenue?.toLocaleString() || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-chart-3/10 rounded-lg">
                  <Percent className="h-6 w-6 text-chart-3" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Occupancy Rate</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-admin-occupancy">
                    {stats?.occupancyRate || 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Campaign Management */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Campaign Management</CardTitle>
              <Button data-testid="button-new-campaign">
                <Plus className="h-4 w-4 mr-2" />
                New Campaign
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Campaign
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Bookings
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {campaigns?.map((campaign: any) => (
                    <tr key={campaign.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                        {campaign.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {new Date(campaign.scheduledDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {campaign.bookedSlots}/{campaign.totalSlots}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        ${(campaign.bookedSlots * 600).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge 
                          variant={
                            campaign.status === "active" ? "default" :
                            campaign.status === "open" ? "secondary" : "outline"
                          }
                          data-testid={`admin-campaign-status-${campaign.id}`}
                        >
                          {campaign.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Button variant="ghost" size="sm" className="mr-2" data-testid={`button-edit-campaign-${campaign.id}`}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" data-testid={`button-view-campaign-${campaign.id}`}>
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Route Configuration and System Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Route Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {routes?.map((route: any) => (
                  <div key={route.id} className="flex justify-between items-center p-3 border border-border rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">Route {route.zipCode}</p>
                      <p className="text-sm text-muted-foreground">{route.name}</p>
                    </div>
                    <Button variant="ghost" size="sm" data-testid={`button-edit-route-${route.zipCode}`}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button 
                variant="outline" 
                className="w-full mt-4 border-dashed"
                data-testid="button-add-route"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Route
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <Label htmlFor="slot-price">Default Slot Price</Label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 py-2 border border-r-0 border-input rounded-l-md bg-muted text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="slot-price"
                      type="number"
                      defaultValue="600"
                      className="rounded-l-none"
                      data-testid="input-slot-price"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="campaign-duration">Campaign Duration (Days)</Label>
                  <Input
                    id="campaign-duration"
                    type="number"
                    defaultValue="30"
                    data-testid="input-campaign-duration"
                  />
                </div>
                <div>
                  <Label htmlFor="booking-window">Booking Window (Days Before)</Label>
                  <Input
                    id="booking-window"
                    type="number"
                    defaultValue="45"
                    data-testid="input-booking-window"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Email Notifications</span>
                  <Button variant="outline" size="sm" data-testid="toggle-email-notifications">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
                <Button className="w-full" data-testid="button-save-settings">
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
