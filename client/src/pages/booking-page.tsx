import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/navigation";
import { DemoBanner } from "@/components/demo-banner";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MapPin, CheckCircle, CreditCard, Loader2 } from "lucide-react";
import { useLocation } from "wouter";

export default function BookingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [selectedRoute, setSelectedRoute] = useState<any>(null);
  const [selectedIndustry, setSelectedIndustry] = useState<any>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [bookingForm, setBookingForm] = useState({
    businessName: user?.businessName || "",
    contactEmail: user?.email || "",
    contactPhone: user?.phone || "",
  });

  const { data: routes, isLoading: routesLoading } = useQuery({
    queryKey: ["/api/routes"],
  });

  const { data: industries, isLoading: industriesLoading } = useQuery({
    queryKey: ["/api/industries"],
  });

  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ["/api/campaigns"],
  });

  const bookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      const res = await apiRequest("POST", "/api/bookings", bookingData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Booking Confirmed!",
        description: "Your campaign slot has been successfully booked.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Booking Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmitBooking = async () => {
    if (!selectedRoute || !selectedIndustry || !selectedCampaign) {
      toast({
        title: "Incomplete Selection",
        description: "Please select a route, industry, and campaign.",
        variant: "destructive",
      });
      return;
    }

    const bookingData = {
      campaignId: selectedCampaign.id,
      routeId: selectedRoute.id,
      industryId: selectedIndustry.id,
      businessName: bookingForm.businessName,
      contactEmail: bookingForm.contactEmail,
      contactPhone: bookingForm.contactPhone,
      amount: 60000, // $600 in cents
    };

    bookingMutation.mutate(bookingData);
  };

  if (routesLoading || industriesLoading || campaignsLoading) {
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

  const openCampaign = campaigns?.find((c: any) => c.status === "open");

  return (
    <div className="min-h-screen bg-background">
      <DemoBanner />
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground">Book Campaign</h2>
          <p className="text-muted-foreground mt-2">
            Select your route and industry slot for direct mail marketing
          </p>
        </div>

        {/* Campaign Selection */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Available Campaign</CardTitle>
          </CardHeader>
          <CardContent>
            {openCampaign ? (
              <div 
                className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedCampaign?.id === openCampaign.id 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary"
                }`}
                onClick={() => setSelectedCampaign(openCampaign)}
                data-testid={`campaign-${openCampaign.id}`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-foreground">{openCampaign.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Mail date: {new Date(openCampaign.scheduledDate).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {openCampaign.bookedSlots}/{openCampaign.totalSlots} slots booked
                    </p>
                  </div>
                  <Badge variant="secondary">{openCampaign.status}</Badge>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No campaigns available for booking at this time.</p>
            )}
          </CardContent>
        </Card>

        {/* Route Selection */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Select Route</CardTitle>
            <p className="text-sm text-muted-foreground">Choose your target area in Anchorage</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {routes?.map((route: any) => (
                <div
                  key={route.id}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedRoute?.id === route.id 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary"
                  }`}
                  onClick={() => setSelectedRoute(route)}
                  data-testid={`route-${route.zipCode}`}
                >
                  <div className="text-center">
                    <MapPin className="text-primary text-2xl mx-auto mb-2" />
                    <h4 className="font-semibold text-foreground">Route {route.zipCode}</h4>
                    <p className="text-sm text-muted-foreground">{route.name}</p>
                    <p className="text-xs text-muted-foreground mt-2">{route.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Industry Selection */}
        {selectedRoute && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Select Industry Category</CardTitle>
              <p className="text-sm text-muted-foreground">
                Choose your business industry for route <span className="font-semibold text-primary">{selectedRoute.zipCode}</span>
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {industries?.map((industry: any) => (
                  <div
                    key={industry.id}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedIndustry?.id === industry.id 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary"
                    }`}
                    onClick={() => setSelectedIndustry(industry)}
                    data-testid={`industry-${industry.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <div className="text-center">
                      <i className={`${industry.icon} text-2xl text-accent mb-2`}></i>
                      <h4 className="font-semibold text-foreground">{industry.name}</h4>
                      <Badge variant="outline" className="mt-2">Available</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Booking Form */}
        {selectedRoute && selectedIndustry && selectedCampaign && (
          <Card>
            <CardHeader>
              <CardTitle>Complete Your Booking</CardTitle>
              <p className="text-sm text-muted-foreground">Review details and submit your campaign booking</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-semibold text-foreground mb-4">Booking Summary</h4>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Campaign:</span>
                      <span className="text-sm font-medium text-foreground" data-testid="summary-campaign">
                        {selectedCampaign.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Route:</span>
                      <span className="text-sm font-medium text-foreground" data-testid="summary-route">
                        Anchorage {selectedRoute.zipCode}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Industry:</span>
                      <span className="text-sm font-medium text-foreground" data-testid="summary-industry">
                        {selectedIndustry.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Mail Date:</span>
                      <span className="text-sm font-medium text-foreground">
                        {new Date(selectedCampaign.scheduledDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="border-t border-border pt-3">
                      <div className="flex justify-between">
                        <span className="text-sm font-semibold text-foreground">Total:</span>
                        <span className="text-lg font-bold text-primary" data-testid="summary-total">$600</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-4">Business Information</h4>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="business-name">Business Name</Label>
                      <Input
                        id="business-name"
                        data-testid="input-business-name"
                        value={bookingForm.businessName}
                        onChange={(e) => setBookingForm({ ...bookingForm, businessName: e.target.value })}
                        placeholder="Your Business Name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="contact-email">Contact Email</Label>
                      <Input
                        id="contact-email"
                        data-testid="input-contact-email"
                        type="email"
                        value={bookingForm.contactEmail}
                        onChange={(e) => setBookingForm({ ...bookingForm, contactEmail: e.target.value })}
                        placeholder="contact@business.com"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="contact-phone">Phone Number</Label>
                      <Input
                        id="contact-phone"
                        data-testid="input-contact-phone"
                        type="tel"
                        value={bookingForm.contactPhone}
                        onChange={(e) => setBookingForm({ ...bookingForm, contactPhone: e.target.value })}
                        placeholder="(907) 555-0123"
                      />
                    </div>
                    <Button 
                      onClick={handleSubmitBooking}
                      className="w-full" 
                      disabled={bookingMutation.isPending}
                      data-testid="button-submit-booking"
                    >
                      {bookingMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Complete Booking ($600)
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
