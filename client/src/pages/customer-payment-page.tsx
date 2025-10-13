import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation, Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CreditCard, Lock, Calendar, MapPin, Briefcase, DollarSign, CheckCircle, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Mock credit card form schema
const paymentFormSchema = z.object({
  cardNumber: z.string().min(16, "Card number must be 16 digits").max(19, "Invalid card number"),
  expiryMonth: z.string().min(2, "Month required").max(2, "Invalid month"),
  expiryYear: z.string().min(4, "Year required").max(4, "Invalid year"),
  cvv: z.string().min(3, "CVV must be 3-4 digits").max(4, "Invalid CVV"),
  cardholderName: z.string().min(1, "Cardholder name is required").max(50, "Name too long"),
  billingAddress: z.string().min(1, "Billing address is required"),
  billingCity: z.string().min(1, "City is required"),
  billingZip: z.string().min(5, "ZIP code must be at least 5 digits"),
});

type PaymentFormData = z.infer<typeof paymentFormSchema>;

interface BookingData {
  campaignId: string;
  routeId: string;
  industryId: string;
  campaign: any;
  route: any;
  industry: any;
  amount: number;
}

export default function CustomerPaymentPage() {
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

  // Get booking data from session storage
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    const storedBookingData = sessionStorage.getItem("bookingData");
    if (!storedBookingData) {
      toast({
        variant: "destructive",
        description: "No booking data found. Please start the booking process again.",
      });
      navigate("/customer/booking");
      return;
    }
    
    try {
      const data = JSON.parse(storedBookingData);
      setBookingData(data);
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Invalid booking data. Please start the booking process again.",
      });
      navigate("/customer/booking");
    }
  }, [navigate, toast]);

  // Form handling
  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      cardNumber: "",
      expiryMonth: "",
      expiryYear: "",
      cvv: "",
      cardholderName: "",
      billingAddress: "",
      billingCity: "",
      billingZip: "",
    },
  });

  // Payment processing mutation
  const paymentMutation = useMutation({
    mutationFn: async (paymentData: PaymentFormData) => {
      setIsProcessingPayment(true);
      
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Create booking with mock payment (backend generates mock paymentId)
      const response = await apiRequest("POST", "/api/bookings", {
        campaignId: bookingData?.campaignId,
        routeId: bookingData?.routeId,
        industryId: bookingData?.industryId,
        businessName: user.businessName || user.username,
        contactEmail: user.email,
        contactPhone: user.phone || "",
        amount: bookingData?.amount || 60000,
        paymentMethod: "mock_card",
        cardLast4: paymentData.cardNumber.replace(/\s/g, '').slice(-4),
      });
      
      return response.json();
    },
    onSuccess: (booking) => {
      // Store booking confirmation data
      sessionStorage.setItem("confirmationData", JSON.stringify({
        booking,
        bookingData,
        paymentSuccess: true,
      }));
      
      // Clear booking data
      sessionStorage.removeItem("bookingData");
      
      // Invalidate bookings cache
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      
      toast({ description: "Payment successful! Your slot has been booked." });
      navigate("/customer/confirmation");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        description: error.message || "Payment failed. Please try again.",
      });
    },
    onSettled: () => {
      setIsProcessingPayment(false);
    },
  });

  // Handle payment submission
  const handlePayment = (data: PaymentFormData) => {
    paymentMutation.mutate(data);
  };

  const formatCurrency = (amountInCents: number) => {
    return `$${(amountInCents / 100).toFixed(2)}`;
  };

  const formatCardNumber = (value: string) => {
    // Remove all non-numeric characters
    const cleaned = value.replace(/\D/g, '');
    // Add spaces every 4 digits
    const formatted = cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
    return formatted;
  };

  if (!bookingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading booking data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/customer/booking">
              <Button variant="outline" size="sm" data-testid="button-back-booking">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Booking
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">
                Complete Your Payment
              </h1>
              <p className="text-muted-foreground" data-testid="text-page-description">
                Secure your campaign slot with payment
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-600 font-medium">Secure Payment</span>
          </div>
        </div>

        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8">
          
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Order Summary
              </CardTitle>
              <CardDescription>
                Review your campaign slot booking details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Campaign Details */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Campaign</span>
                  <span data-testid="text-campaign-name">{bookingData.campaign.name}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-medium">Mail Date</span>
                  <span data-testid="text-mail-date">
                    {new Date(bookingData.campaign.mailDate).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Route:</span>
                  <span data-testid="text-route-info">
                    {bookingData.route.name} ({bookingData.route.zipCode})
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Industry:</span>
                  <span data-testid="text-industry-info">{bookingData.industry.name}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="font-medium">Households Reached:</span>
                  <span data-testid="text-households">
                    {bookingData.route.householdCount?.toLocaleString()}
                  </span>
                </div>
              </div>
              
              <Separator />
              
              {/* Pricing */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Campaign Slot</span>
                  <span data-testid="text-slot-price">{formatCurrency(bookingData.amount)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Processing Fee</span>
                  <span>$0.00</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-green-600" data-testid="text-total-amount">
                    {formatCurrency(bookingData.amount)}
                  </span>
                </div>
              </div>
              
              {/* Benefits */}
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-800 mb-2">What's Included:</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Exclusive industry slot in your chosen area</li>
                  <li>• Professional postcard design and printing</li>
                  <li>• Direct mail delivery to all households</li>
                  <li>• No competition from other businesses in your category</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Information
              </CardTitle>
              <CardDescription>
                Enter your payment details (Demo - cards will not be charged)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handlePayment)} className="space-y-6">
                  
                  {/* Card Number */}
                  <FormField
                    control={form.control}
                    name="cardNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Card Number</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="1234 5678 9012 3456" 
                            {...field}
                            onChange={(e) => {
                              const formatted = formatCardNumber(e.target.value);
                              field.onChange(formatted);
                            }}
                            maxLength={19}
                            data-testid="input-card-number"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Expiry and CVV */}
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="expiryMonth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Month</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="MM" 
                              {...field}
                              maxLength={2}
                              data-testid="input-expiry-month"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="expiryYear"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="YYYY" 
                              {...field}
                              maxLength={4}
                              data-testid="input-expiry-year"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cvv"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CVV</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="123" 
                              {...field}
                              maxLength={4}
                              data-testid="input-cvv"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Cardholder Name */}
                  <FormField
                    control={form.control}
                    name="cardholderName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cardholder Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="John Smith" 
                            {...field}
                            data-testid="input-cardholder-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  {/* Billing Address */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Billing Address</h4>
                    
                    <FormField
                      control={form.control}
                      name="billingAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="123 Main Street" 
                              {...field}
                              data-testid="input-billing-address"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="billingCity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Anchorage" 
                                {...field}
                                data-testid="input-billing-city"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="billingZip"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ZIP Code</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="99502" 
                                {...field}
                                data-testid="input-billing-zip"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Demo Notice */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Demo Mode</span>
                    </div>
                    <p className="text-xs text-blue-700 mt-1">
                      This is a demonstration. No actual charges will be made to your payment method.
                    </p>
                  </div>

                  {/* Submit Button */}
                  <Button 
                    type="submit" 
                    className="w-full" 
                    size="lg"
                    disabled={isProcessingPayment || paymentMutation.isPending}
                    data-testid="button-process-payment"
                  >
                    {isProcessingPayment ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing Payment...
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        Process Payment ({formatCurrency(bookingData.amount)})
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}