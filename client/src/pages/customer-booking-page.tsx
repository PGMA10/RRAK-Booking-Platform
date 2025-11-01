import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation, Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, MapPin, Briefcase, DollarSign, CheckCircle, XCircle, Clock, CreditCard } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import type { Campaign, Route, Industry } from "@shared/schema";

// Customer booking form schema
const customerBookingSchema = z.object({
  campaignId: z.string().min(1, "Please select a campaign"),
  routeId: z.string().min(1, "Please select a route"),
  industryId: z.string().min(1, "Please confirm your industry"),
  quantity: z.string().min(1, "Please select quantity"),
});

type CustomerBookingData = z.infer<typeof customerBookingSchema>;

// Calculate tiered price based on quantity
const calculatePrice = (quantity: number): number => {
  // First slot: $600, each additional slot: $500
  return 60000 + ((quantity - 1) * 50000); // in cents
};

export default function CustomerBookingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // Redirect non-authenticated users or admins
  if (!user) {
    return <Redirect to="/auth" />;
  }
  
  if (user.role === "admin") {
    return <Redirect to="/admin" />;
  }

  // State management
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [selectedIndustry, setSelectedIndustry] = useState<Industry | null>(null);
  const [slotAvailable, setSlotAvailable] = useState<boolean | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  // Form handling
  const form = useForm<CustomerBookingData>({
    resolver: zodResolver(customerBookingSchema),
    defaultValues: {
      campaignId: "",
      routeId: "",
      industryId: "",
      quantity: "1",
    },
  });

  // Data fetching
  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const { data: routes = [] } = useQuery<Route[]>({
    queryKey: ["/api/routes"],
  });

  const { data: industries = [] } = useQuery<Industry[]>({
    queryKey: ["/api/industries"],
  });

  // Filter campaigns that are open for booking
  const availableCampaigns = campaigns.filter(campaign => 
    campaign.status === "booking_open" || campaign.status === "planning"
  );

  // Check slot availability when all selections are made
  useEffect(() => {
    const checkSlotAvailability = async () => {
      const campaignId = form.getValues("campaignId");
      const routeId = form.getValues("routeId");
      const industryId = form.getValues("industryId");

      if (!campaignId || !routeId || !industryId) {
        setSlotAvailable(null);
        return;
      }

      setCheckingAvailability(true);
      try {
        const response = await fetch(`/api/availability/${campaignId}/${routeId}/${industryId}`, {
          credentials: "include",
        });
        const data = await response.json();
        setSlotAvailable(data.available);
      } catch (error) {
        console.error("Error checking availability:", error);
        setSlotAvailable(null);
      } finally {
        setCheckingAvailability(false);
      }
    };

    checkSlotAvailability();
  }, [form.watch("campaignId"), form.watch("routeId"), form.watch("industryId")]);

  // Update selected objects when form values change
  useEffect(() => {
    const campaignId = form.getValues("campaignId");
    setSelectedCampaign(campaigns.find(c => c.id === campaignId) || null);
  }, [form.watch("campaignId"), campaigns]);

  useEffect(() => {
    const routeId = form.getValues("routeId");
    setSelectedRoute(routes.find(r => r.id === routeId) || null);
  }, [form.watch("routeId"), routes]);

  useEffect(() => {
    const industryId = form.getValues("industryId");
    setSelectedIndustry(industries.find(i => i.id === industryId) || null);
  }, [form.watch("industryId"), industries]);

  useEffect(() => {
    const quantity = form.getValues("quantity");
    setSelectedQuantity(parseInt(quantity) || 1);
  }, [form.watch("quantity")]);

  // Create Stripe Checkout session mutation
  const checkoutMutation = useMutation({
    mutationFn: async (bookingData: CustomerBookingData) => {
      const response = await apiRequest("POST", "/api/create-checkout-session", {
        ...bookingData,
        businessName: user?.businessName || user?.username || "Unknown Business",
        contactEmail: user?.email || "",
        contactPhone: user?.phone || "",
        amount: 60000, // $600 in cents
      });
      return await response.json();
    },
    onSuccess: (data: { sessionUrl: string; bookingId: string }) => {
      // Redirect to Stripe Checkout
      window.location.href = data.sessionUrl;
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Booking Failed",
        description: error.message || "Failed to create checkout session. Please try again.",
      });
    },
  });

  // Handle proceed to payment
  const handleProceedToPayment = (data: CustomerBookingData) => {
    if (slotAvailable === false) {
      toast({
        variant: "destructive",
        description: "This slot is no longer available. Please select a different combination.",
      });
      return;
    }

    if (slotAvailable === null) {
      toast({
        variant: "destructive",
        description: "Please wait for availability check to complete.",
      });
      return;
    }

    // Create Stripe Checkout session
    checkoutMutation.mutate(data);
  };

  const formatCurrency = (amountInCents: number) => {
    return `$${(amountInCents / 100).toFixed(2)}`;
  };

  const getAvailabilityStatus = () => {
    if (checkingAvailability) {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">
          <Clock className="h-3 w-3 mr-1" />
          Checking...
        </Badge>
      );
    }
    
    if (slotAvailable === true) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">
          <CheckCircle className="h-3 w-3 mr-1" />
          Available
        </Badge>
      );
    }
    
    if (slotAvailable === false) {
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Unavailable
        </Badge>
      );
    }
    
    return null;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/customer/dashboard">
              <Button variant="outline" size="sm" data-testid="button-back-home">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">
                Book Your Campaign Slot
              </h1>
              <p className="text-muted-foreground" data-testid="text-page-description">
                Reserve your exclusive industry slot in our direct mail campaigns
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Welcome,</p>
            <p className="font-medium" data-testid="text-user-business">
              {user.businessName || user.username}
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleProceedToPayment)} className="space-y-8">
              
              {/* Campaign Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Select Campaign
                  </CardTitle>
                  <CardDescription>
                    Choose which monthly direct mail campaign to join
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="campaignId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Available Campaigns</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-campaign">
                              <SelectValue placeholder="Select a campaign..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableCampaigns.map((campaign) => (
                              <SelectItem 
                                key={campaign.id} 
                                value={campaign.id}
                                data-testid={`option-campaign-${campaign.id}`}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span>{campaign.name}</span>
                                  <div className="flex items-center gap-2 ml-4">
                                    <Badge variant="outline">
                                      {new Date(campaign.mailDate).toLocaleDateString()}
                                    </Badge>
                                    <Badge 
                                      variant={campaign.status === "booking_open" ? "default" : "secondary"}
                                    >
                                      {campaign.status === "booking_open" ? "Open" : "Planning"}
                                    </Badge>
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {selectedCampaign && (
                    <div className="mt-4 p-4 bg-muted rounded-lg" data-testid="selected-campaign-details">
                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Mail Date</p>
                          <p className="font-medium">
                            {new Date(selectedCampaign.mailDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Available Slots</p>
                          <p className="font-medium">
                            {selectedCampaign.totalSlots - selectedCampaign.bookedSlots} of {selectedCampaign.totalSlots}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Status</p>
                          <Badge variant={selectedCampaign.status === "booking_open" ? "default" : "secondary"}>
                            {selectedCampaign.status === "booking_open" ? "Booking Open" : "Planning Phase"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Route Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Select Delivery Route
                  </CardTitle>
                  <CardDescription>
                    Choose the Anchorage area where you want to reach customers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="routeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Available Routes</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-route">
                              <SelectValue placeholder="Select a delivery route..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {routes.map((route) => (
                              <SelectItem 
                                key={route.id} 
                                value={route.id}
                                data-testid={`option-route-${route.zipCode}`}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <div>
                                    <span className="font-medium">{route.zipCode} - {route.name}</span>
                                    <p className="text-xs text-muted-foreground">{route.description}</p>
                                  </div>
                                  <Badge variant="outline" className="ml-4">
                                    {route.householdCount?.toLocaleString()} households
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {selectedRoute && (
                    <div className="mt-4 p-4 bg-muted rounded-lg" data-testid="selected-route-details">
                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Zip Code</p>
                          <p className="font-medium">{selectedRoute.zipCode}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Area</p>
                          <p className="font-medium">{selectedRoute.name}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Households</p>
                          <p className="font-medium">{selectedRoute.householdCount?.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Industry Confirmation */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Confirm Your Industry
                  </CardTitle>
                  <CardDescription>
                    Verify your business industry category for this campaign
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="industryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Industry</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-industry">
                              <SelectValue placeholder="Select your industry..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {industries.map((industry) => (
                              <SelectItem 
                                key={industry.id} 
                                value={industry.id}
                                data-testid={`option-industry-${industry.name.replace(/\s+/g, '-').toLowerCase()}`}
                              >
                                {industry.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {selectedIndustry && (
                    <div className="mt-4 p-4 bg-muted rounded-lg" data-testid="selected-industry-details">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{selectedIndustry.name}</p>
                          <p className="text-sm text-muted-foreground">{selectedIndustry.description}</p>
                        </div>
                        <Badge variant="outline">Exclusive Category</Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quantity Selection */}
              {selectedRoute && selectedIndustry && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Select Quantity
                    </CardTitle>
                    <CardDescription>
                      How many slots would you like to book? First slot $600, each additional slot $500
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Slots</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-quantity">
                                <SelectValue placeholder="Select quantity..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1" data-testid="option-quantity-1">
                                <div className="flex items-center justify-between w-full gap-4">
                                  <span>1 slot</span>
                                  <span className="font-medium">$600</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="2" data-testid="option-quantity-2">
                                <div className="flex items-center justify-between w-full gap-4">
                                  <span>2 slots</span>
                                  <span className="font-medium">$1,100 ($600 + $500)</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="3" data-testid="option-quantity-3">
                                <div className="flex items-center justify-between w-full gap-4">
                                  <span>3 slots</span>
                                  <span className="font-medium">$1,600 ($600 + $1,000)</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="4" data-testid="option-quantity-4">
                                <div className="flex items-center justify-between w-full gap-4">
                                  <span>4 slots</span>
                                  <span className="font-medium">$2,100 ($600 + $1,500)</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {selectedQuantity > 1 && (
                      <div className="mt-4 p-4 bg-muted rounded-lg" data-testid="quantity-pricing-details">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>First slot:</span>
                            <span className="font-medium">$600.00</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Additional {selectedQuantity - 1} slot{selectedQuantity > 2 ? 's' : ''} × $500:</span>
                            <span className="font-medium">${((selectedQuantity - 1) * 500).toLocaleString()}.00</span>
                          </div>
                          <div className="border-t border-border pt-2 flex justify-between font-bold">
                            <span>Total Price:</span>
                            <span className="text-lg text-green-600">
                              ${(calculatePrice(selectedQuantity) / 100).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Slot Availability & Pricing */}
              {form.getValues("campaignId") && form.getValues("routeId") && form.getValues("industryId") && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Slot Availability & Pricing
                    </CardTitle>
                    <CardDescription>
                      Check if your selected combination is available
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">
                            {selectedRoute?.name} ({selectedRoute?.zipCode}) - {selectedIndustry?.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Campaign: {selectedCampaign?.name}
                          </p>
                        </div>
                        <div className="text-right">
                          {getAvailabilityStatus()}
                        </div>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Total Price ({selectedQuantity} slot{selectedQuantity > 1 ? 's' : ''})
                          </p>
                          <p className="text-2xl font-bold text-green-600" data-testid="text-slot-price">
                            {formatCurrency(calculatePrice(selectedQuantity))}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Reach</p>
                          <p className="text-lg font-semibold">
                            {selectedRoute?.householdCount?.toLocaleString()} households
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Proceed to Payment */}
              <div className="flex justify-end space-x-4">
                <Link href="/customer/dashboard">
                  <Button variant="outline" data-testid="button-cancel-booking">
                    Cancel
                  </Button>
                </Link>
                <Button 
                  type="submit"
                  disabled={!slotAvailable || checkingAvailability}
                  data-testid="button-proceed-payment"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Proceed to Payment ({formatCurrency(calculatePrice(selectedQuantity))})
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}