import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/navigation";
import { DemoBanner } from "@/components/demo-banner";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

export default function CalendarPage() {
  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ["/api/campaigns"],
  });

  const { data: routes, isLoading: routesLoading } = useQuery({
    queryKey: ["/api/routes"],
  });

  const { data: industries, isLoading: industriesLoading } = useQuery({
    queryKey: ["/api/industries"],
  });

  if (campaignsLoading || routesLoading || industriesLoading) {
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
          <h2 className="text-3xl font-bold text-foreground">Campaign Calendar</h2>
          <p className="text-muted-foreground mt-2">View scheduled campaigns across all routes</p>
        </div>

        {/* Calendar Controls */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Upcoming Campaigns</CardTitle>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" data-testid="button-previous-month">
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button variant="outline" size="sm" data-testid="button-next-month">
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaigns?.map((campaign: any) => (
                <Card key={campaign.id} className="border border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-foreground">{campaign.name}</h4>
                      <Badge 
                        variant={
                          campaign.status === "active" ? "default" :
                          campaign.status === "open" ? "secondary" : "outline"
                        }
                        data-testid={`campaign-status-${campaign.id}`}
                      >
                        {campaign.status}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 mr-2" />
                        {new Date(campaign.scheduledDate).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Bookings: {campaign.bookedSlots}/{campaign.totalSlots} slots
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${(campaign.bookedSlots / campaign.totalSlots) * 100}%` }}
                        ></div>
                      </div>
                      <div className="text-sm font-medium text-foreground">
                        Revenue: ${((campaign.bookedSlots * 600)).toLocaleString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Slot Availability Matrix */}
        <Card>
          <CardHeader>
            <CardTitle>Slot Availability by Route</CardTitle>
            <p className="text-sm text-muted-foreground">Current campaign booking status</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Industry</th>
                    {routes?.map((route: any) => (
                      <th key={route.id} className="px-4 py-2 text-center text-sm font-medium text-muted-foreground">
                        {route.zipCode}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="space-y-2">
                  {industries?.slice(0, 8).map((industry: any) => (
                    <tr key={industry.id}>
                      <td className="px-4 py-3 text-sm font-medium text-foreground">
                        {industry.name}
                      </td>
                      {routes?.map((route: any) => (
                        <td key={`${industry.id}-${route.id}`} className="px-4 py-3 text-center">
                          <span 
                            className={`inline-block w-4 h-4 rounded-full ${
                              Math.random() > 0.5 ? "bg-destructive" : "bg-accent"
                            }`}
                            title={Math.random() > 0.5 ? "Booked" : "Available"}
                            data-testid={`slot-${industry.name.toLowerCase().replace(/\s+/g, '-')}-${route.zipCode}`}
                          ></span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center space-x-4 text-sm">
              <div className="flex items-center">
                <span className="inline-block w-4 h-4 bg-accent rounded-full mr-2"></span>
                <span className="text-muted-foreground">Available</span>
              </div>
              <div className="flex items-center">
                <span className="inline-block w-4 h-4 bg-destructive rounded-full mr-2"></span>
                <span className="text-muted-foreground">Booked</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
