import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation, Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Calendar, MapPin, Briefcase, DollarSign, CheckCircle, XCircle, Clock, CreditCard, Tag } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import type { Campaign, Route, Industry } from "@shared/schema";

// Customer booking form schema - dynamic validation will be applied in form submission
const customerBookingSchema = z.object({
  campaignId: z.string().min(1, "Please select a campaign"),
  routeId: z.string().min(1, "Please select a route"),
  industryId: z.string().min(1, "Please confirm your industry"),
  industryDescription: z.string().optional(),
  quantity: z.string().min(1, "Please select quantity"),
});

type CustomerBookingData = z.infer<typeof customerBookingSchema>;

interface PricingQuote {
  totalPrice: number;
  breakdown: {
    basePrice: number;
    discountAmount: number;
    finalPrice: number;
  };
  appliedRules: Array<{
    ruleId: string;
    description: string;
    displayName?: string;
    ruleType: string;
    value: number;
  }>;
  priceSource: string;
}

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
      industryDescription: "",
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

  // Fetch pricing quote when campaign and quantity are selected
  const campaignId = form.watch("campaignId");
  const quantity = form.watch("quantity");
  const { data: pricingQuote, isLoading: isLoadingPrice } = useQuery<PricingQuote>({
    queryKey: [`/api/pricing/quote?campaignId=${campaignId}&quantity=${quantity}`],
    enabled: !!campaignId && !!quantity,
  });

  // Filter campaigns that are open for booking
  const availableCampaigns = campaigns.filter(campaign => 
    campaign.status === "booking_open" || campaign.status === "planning"
  );

  // Filter routes that are active
  const activeRoutes = routes.filter(route => route.status === "active");

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

  // Create booking and checkout session (2-step process to allow admin price override)
  const checkoutMutation = useMutation({
    mutationFn: async (bookingData: CustomerBookingData) => {
      // Step 1: Create booking
      const bookingResponse = await apiRequest("POST", "/api/create-checkout-session", {
        ...bookingData,
        quantity: parseInt(bookingData.quantity as any) || 1,
        businessName: user?.businessName || user?.username || "Unknown Business",
        contactEmail: user?.email || "",
        contactPhone: user?.phone || "",
        amount: 60000, // $600 in cents (may be overridden by admin)
      });
      const bookingResult = await bookingResponse.json();
      
      // Step 2: Create Stripe checkout session for the booking
      const checkoutResponse = await fetch(`/api/bookings/${bookingResult.bookingId}/checkout-session`, {
        credentials: "include",
      });
      const checkoutResult = await checkoutResponse.json();
      
      return {
        sessionUrl: checkoutResult.sessionUrl,
        bookingId: bookingResult.bookingId,
      };
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

    // Validate industry description when "Other" is selected
    if (selectedIndustry && selectedIndustry.name.toLowerCase() === "other") {
      if (!data.industryDescription || data.industryDescription.trim() === "") {
        form.setError("industryDescription", {
          type: "manual",
          message: "Please describe your business when selecting 'Other' industry",
        });
        toast({
          variant: "destructive",
          description: "Please describe your business to continue.",
        });
        return;
      }
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

        {/* Promotional Card for Bulk Discount */}
        <div className="max-w-4xl mx-auto mb-6">
          <Link href="/customer/booking/multi">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200" data-testid="card-bulk-discount-promo">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-700">💰 Special Offer</p>
                    <p className="text-2xl font-bold text-purple-900 mt-1">Save $300 When You Book 3 Campaigns!</p>
                    <p className="text-sm text-purple-700 mt-2">
                      Book three different mail dates together for just $1,500 instead of $1,800
                    </p>
                  </div>
                  <div className="p-4 bg-purple-600/10 rounded-lg">
                    <Tag className="h-8 w-8 text-purple-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <Button variant="default" size="lg" className="w-full bg-purple-600 hover:bg-purple-700 text-white" data-testid="button-view-bulk-discount">
                    View Bulk Booking Option <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Link>
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
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Mail Date</p>
                          <p className="font-medium">
                            {new Date(selectedCampaign.mailDate).toLocaleDateString()}
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
                            {activeRoutes.map((route) => (
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

                  {/* Conditional Industry Description for "Other" */}
                  {selectedIndustry && selectedIndustry.name.toLowerCase() === "other" && (
                    <FormField
                      control={form.control}
                      name="industryDescription"
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel>Describe Your Business *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Please describe your business and industry so we can ensure there's no competition with existing bookings..."
                              className="min-h-[100px]"
                              data-testid="input-industry-description"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            This helps us verify that your business doesn't compete with other bookings on this route.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
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
                      How many slots would you like to book? Pricing is shown below based on the campaign.
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
                                1 slot
                              </SelectItem>
                              <SelectItem value="2" data-testid="option-quantity-2">
                                2 slots
                              </SelectItem>
                              <SelectItem value="3" data-testid="option-quantity-3">
                                3 slots
                              </SelectItem>
                              <SelectItem value="4" data-testid="option-quantity-4">
                                4 slots
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                          <p className="text-sm text-muted-foreground mt-2">
                            💡 Each additional slot gives you more ad space for the SAME design. All slots in this booking will display the same artwork.
                          </p>
                        </FormItem>
                      )}
                    />
                    
                    {pricingQuote && (
                      <div className="mt-4 p-4 bg-muted rounded-lg" data-testid="quantity-pricing-details">
                        <div className="space-y-2 text-sm">
                          {/* Show pricing with strikethrough if discount applied */}
                          {pricingQuote.breakdown.discountAmount > 0 ? (
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span>Regular Price ({selectedQuantity} slot{selectedQuantity > 1 ? 's' : ''}):</span>
                                <span className="font-medium line-through text-muted-foreground">
                                  ${(pricingQuote.breakdown.basePrice / 100).toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="flex items-center gap-1 text-green-600 font-semibold">
                                  <Tag className="h-3 w-3" />
                                  {pricingQuote.appliedRules[0]?.displayName || 'Special Pricing'}:
                                </span>
                                <span className="font-bold text-green-600 text-lg">
                                  ${(pricingQuote.totalPrice / 100).toFixed(2)}
                                </span>
                              </div>
                              <div className="text-xs text-green-600 italic">
                                You save ${(pricingQuote.breakdown.discountAmount / 100).toFixed(2)}!
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-between">
                              <span>Price ({selectedQuantity} slot{selectedQuantity > 1 ? 's' : ''}):</span>
                              <span className="font-medium">${(pricingQuote.breakdown.basePrice / 100).toFixed(2)}</span>
                            </div>
                          )}
                          
                          {/* Show pricing rules details */}
                          {pricingQuote.appliedRules.length > 0 && (
                            <div className="pt-2 border-t border-border">
                              {pricingQuote.appliedRules.map((rule) => (
                                <div key={rule.ruleId} className="text-xs text-muted-foreground italic">
                                  • {rule.description}
                                </div>
                              ))}
                            </div>
                          )}
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
                          {isLoadingPrice ? (
                            <p className="text-2xl font-bold text-muted-foreground" data-testid="text-slot-price">
                              Loading...
                            </p>
                          ) : pricingQuote ? (
                            <div className="space-y-1">
                              {pricingQuote.breakdown.discountAmount > 0 && (
                                <p className="text-sm text-muted-foreground line-through">
                                  {formatCurrency(pricingQuote.breakdown.basePrice)}
                                </p>
                              )}
                              <p className="text-2xl font-bold text-green-600" data-testid="text-slot-price">
                                {formatCurrency(pricingQuote.totalPrice)}
                              </p>
                              {pricingQuote.breakdown.discountAmount > 0 && pricingQuote.appliedRules[0]?.displayName && (
                                <p className="text-xs font-semibold text-green-600 flex items-center gap-1">
                                  <Tag className="h-3 w-3" />
                                  {pricingQuote.appliedRules[0].displayName}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-2xl font-bold text-muted-foreground" data-testid="text-slot-price">
                              Select campaign
                            </p>
                          )}
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
                  disabled={!slotAvailable || checkingAvailability || isLoadingPrice}
                  data-testid="button-proceed-payment"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  {isLoadingPrice ? (
                    "Calculating Price..."
                  ) : pricingQuote ? (
                    `Proceed to Payment (${formatCurrency(pricingQuote.totalPrice)})`
                  ) : (
                    "Select Campaign to See Price"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}