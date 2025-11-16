import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/navigation";
import { DemoBanner } from "@/components/demo-banner";
import { useAuth } from "@/hooks/use-auth";
import { Calendar as CalendarIcon, Package } from "lucide-react";
import type { BookingWithDetails, Campaign, Route, Industry } from "@shared/schema";

export default function CalendarPage() {
  const { user } = useAuth();

  // Fetch user's bookings (for customers) or all campaigns (for admin)
  const { data: bookings, isLoading: bookingsLoading } = useQuery<BookingWithDetails[]>({
    queryKey: ['/api/bookings'],
    enabled: !!user && user.role === "customer",
  });

  const { data: campaigns, isLoading: campaignsLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const { data: routes } = useQuery<Route[]>({
    queryKey: ["/api/routes"],
  });

  const { data: industries } = useQuery<Industry[]>({
    queryKey: ["/api/industries"],
  });

  // Create lookup maps
  const routeMap = new Map(routes?.map(r => [r.id, r]) || []);
  const industryMap = new Map(industries?.map(i => [i.id, i]) || []);
  const campaignMap = new Map(campaigns?.map(c => [c.id, c]) || []);

  const isCustomer = user?.role === "customer";
  const isLoading = isCustomer ? (bookingsLoading || campaignsLoading) : campaignsLoading;

  if (isLoading) {
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

  // Sort campaigns by mail date
  const sortedCampaigns = campaigns?.slice().sort((a, b) => {
    if (!a.mailDate || !b.mailDate) return 0;
    return new Date(a.mailDate).getTime() - new Date(b.mailDate).getTime();
  }) || [];

  return (
    <div className="min-h-screen bg-background">
      <DemoBanner />
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground">
            {isCustomer ? 'My Campaign Calendar' : 'All Campaigns'}
          </h2>
          <p className="text-muted-foreground mt-2">
            {isCustomer 
              ? 'View your upcoming campaign bookings and mail dates' 
              : 'View all campaigns and their scheduled mail dates'
            }
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {isCustomer ? 'Your Upcoming Campaigns' : 'All Scheduled Campaigns'}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {isCustomer 
                ? 'Campaigns you\'ve booked and their scheduled mail dates' 
                : 'All campaigns in the system sorted by mail date'
              }
            </p>
          </CardHeader>
          <CardContent>
            {isCustomer ? (
              // Customer view: Show booked campaigns
              bookings && bookings.length > 0 ? (
                <div className="space-y-4">
                  {bookings.map((booking) => {
                    return (
                      <div 
                        key={booking.id} 
                        className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                        data-testid={`calendar-booking-${booking.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold text-foreground">
                                {booking.campaign?.name || 'Campaign'}
                              </h4>
                              <Badge variant="secondary">
                                {booking.status}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                              <div>
                                <p className="text-muted-foreground">Mail Date</p>
                                <p className="font-medium text-foreground flex items-center gap-2">
                                  <CalendarIcon className="h-4 w-4" />
                                  {booking.campaign?.mailDate ? new Date(booking.campaign.mailDate).toLocaleDateString('en-US', { 
                                    month: 'long', 
                                    day: 'numeric', 
                                    year: 'numeric' 
                                  }) : 'Date TBD'}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Route</p>
                                <p className="font-medium text-foreground">
                                  {booking.route?.zipCode} - {booking.route?.name || 'N/A'}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Industry</p>
                                <p className="font-medium text-foreground">
                                  {booking.industry?.name || 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No upcoming campaigns</h3>
                  <p className="text-muted-foreground">You haven't booked any campaigns yet</p>
                </div>
              )
            ) : (
              // Admin view: Show all campaigns
              sortedCampaigns.length > 0 ? (
                <div className="space-y-4">
                  {sortedCampaigns.map((campaign) => {
                    return (
                      <div 
                        key={campaign.id} 
                        className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                        data-testid={`calendar-campaign-${campaign.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold text-foreground">
                                {campaign.name}
                              </h4>
                              <Badge variant="secondary">
                                {campaign.totalSlots || 0} Total Slots
                              </Badge>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                              <div>
                                <p className="text-muted-foreground">Mail Date</p>
                                <p className="font-medium text-foreground flex items-center gap-2">
                                  <CalendarIcon className="h-4 w-4" />
                                  {campaign.mailDate ? new Date(campaign.mailDate).toLocaleDateString('en-US', { 
                                    month: 'long', 
                                    day: 'numeric', 
                                    year: 'numeric' 
                                  }) : 'Date TBD'}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Print Deadline</p>
                                <p className="font-medium text-foreground">
                                  {campaign.printDeadline ? new Date(campaign.printDeadline).toLocaleDateString('en-US', { 
                                    month: 'long', 
                                    day: 'numeric', 
                                    year: 'numeric' 
                                  }) : 'Not set'}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Base Price</p>
                                <p className="font-medium text-foreground">
                                  ${campaign.baseSlotPrice ? (campaign.baseSlotPrice / 100).toFixed(0) : '600'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No campaigns yet</h3>
                  <p className="text-muted-foreground">No campaigns have been created in the system</p>
                </div>
              )
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
