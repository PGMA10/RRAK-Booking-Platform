import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation, Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Calendar, MapPin, Briefcase, DollarSign, Mail, Phone, FileText, Upload, Home, Loader2, AlertCircle, Sparkles } from "lucide-react";
import type { BookingWithDetails } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function CustomerConfirmationPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  
  // Redirect non-authenticated users or admins
  if (!user) {
    return <Redirect to="/auth" />;
  }
  
  if (user.role === "admin") {
    return <Redirect to="/admin" />;
  }

  // Get session ID from URL query params
  // Note: Wouter's useLocation() only returns the path, not query params
  // We need to use window.location.search to get the query string
  const searchParams = new URLSearchParams(window.location.search);
  const sessionId = searchParams.get('session_id');

  console.log("🔍 [Confirmation] Current location:", location);
  console.log("🔍 [Confirmation] Full URL:", window.location.href);
  console.log("🔍 [Confirmation] Query string:", window.location.search);
  console.log("🔍 [Confirmation] Extracted session ID:", sessionId);

  // Mutation to verify Stripe payment status
  const verifyPaymentMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiRequest(
        "POST",
        "/api/stripe-verify-session",
        { sessionId }
      );
      const data = await response.json();
      return data as { paymentStatus: string; bookingId: string; updated: boolean };
    },
    onSuccess: (data: { paymentStatus: string; bookingId: string; updated: boolean }) => {
      console.log("✅ [Confirmation] Payment verification result:", data);
      if (data.updated) {
        // Refetch the booking to get updated payment status
        queryClient.invalidateQueries({ queryKey: [`/api/bookings/session/${sessionId}`] });
        toast({
          description: "Payment confirmed successfully!",
        });
      }
    },
    onError: (error) => {
      console.error("❌ [Confirmation] Payment verification failed:", error);
    },
  });

  // Fetch booking by session ID
  const { data: booking, isLoading, error} = useQuery<BookingWithDetails>({
    queryKey: [`/api/bookings/session/${sessionId}`],
    enabled: !!sessionId,
  });

  console.log("🔍 [Confirmation] Query state - isLoading:", isLoading, "error:", error, "booking:", booking?.id);

  useEffect(() => {
    if (!sessionId) {
      console.log("❌ [Confirmation] No session ID found in URL");
      toast({
        variant: "destructive",
        description: "No payment session found. Please complete the booking process.",
      });
      return;
    }
    
    console.log("✅ [Confirmation] Session ID found:", sessionId);
    // Verify payment status with Stripe when page loads
    verifyPaymentMutation.mutate(sessionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const formatCurrency = (amountInCents: number) => {
    return `$${(amountInCents / 100).toFixed(2)}`;
  };

  const generateBookingReference = (bookingId: string) => {
    return `RRA-${bookingId.substring(0, 8).toUpperCase()}`;
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" data-testid="loader-confirmation" />
          <p className="text-muted-foreground">Loading confirmation details...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>Booking Not Found</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              We couldn't find your booking confirmation. This may be because:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>The payment session has expired</li>
              <li>The booking was not completed</li>
              <li>You accessed this page directly without a valid session</li>
            </ul>
            <div className="flex flex-col gap-2 pt-4">
              <Link href="/customer/booking">
                <Button className="w-full">Start New Booking</Button>
              </Link>
              <Link href="/customer/dashboard">
                <Button variant="outline" className="w-full">View My Bookings</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check payment status
  const isPaid = booking.paymentStatus === 'paid';
  const isPending = booking.paymentStatus === 'pending';

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${isPaid ? 'bg-green-100' : 'bg-yellow-100'}`}>
            {isPaid ? (
              <CheckCircle className="h-8 w-8 text-green-600" data-testid="icon-success" />
            ) : (
              <AlertCircle className="h-8 w-8 text-yellow-600" data-testid="icon-pending" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-page-title">
            {isPaid ? 'Payment Successful!' : 'Payment Pending'}
          </h1>
          <p className="text-muted-foreground text-lg" data-testid="text-page-description">
            {isPaid ? `Your campaign ${(booking.quantity || 1) > 1 ? `${booking.quantity} slots have` : 'slot has'} been successfully reserved` : 'Your booking is being processed'}
          </p>
          <Badge variant={isPaid ? "default" : "secondary"} className={`mt-4 ${isPaid ? 'bg-green-100 text-green-800 border-green-300' : 'bg-yellow-100 text-yellow-800 border-yellow-300'}`} data-testid="badge-booking-reference">
            Booking Reference: {generateBookingReference(booking.id)}
          </Badge>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Payment Status */}
          {isPaid && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-800">Payment Confirmed</h4>
                    <p className="text-sm text-green-700 mt-1">
                      Your payment of {formatCurrency(booking.amountPaid || booking.amount)} has been successfully processed.
                      {booking.stripePaymentIntentId && (
                        <span className="block mt-1 text-xs">Transaction ID: {booking.stripePaymentIntentId}</span>
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Booking Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Campaign Details
              </CardTitle>
              <CardDescription>
                Your reserved slot in the direct mail campaign
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Campaign</p>
                    <p className="font-medium text-lg" data-testid="text-campaign-name">
                      {booking.campaign?.name || 'N/A'}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Mail Date</p>
                    <p className="font-medium" data-testid="text-mail-date">
                      {formatDate(booking.campaign?.mailDate || null)}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Delivery Route</p>
                      <p className="font-medium" data-testid="text-route-info">
                        {booking.route?.name || 'N/A'} ({booking.route?.zipCode || 'N/A'})
                      </p>
                      {booking.route?.householdCount && (
                        <p className="text-sm text-muted-foreground">
                          Reaching {booking.route.householdCount.toLocaleString()} households
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Industry Category</p>
                      <p className="font-medium" data-testid="text-industry-info">
                        {booking.industry?.name || 'N/A'}
                      </p>
                      <Badge variant="outline" className="mt-1">Exclusive Slot</Badge>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Business</p>
                    <p className="font-medium" data-testid="text-business-name">
                      {booking.businessName}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Quantity</p>
                    <p className="font-medium" data-testid="text-booking-quantity">
                      {booking.quantity || 1} slot{(booking.quantity || 1) > 1 ? 's' : ''}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                    <p className="font-medium text-lg text-green-600" data-testid="text-amount-paid">
                      {formatCurrency(booking.amountPaid || booking.amount)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Contact Information
              </CardTitle>
              <CardDescription>
                How we'll reach you about this campaign
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="font-medium" data-testid="text-contact-email">
                      {booking.contactEmail}
                    </p>
                  </div>
                </div>
                
                {booking.contactPhone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Phone</p>
                      <p className="font-medium" data-testid="text-contact-phone">
                        {booking.contactPhone}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Next Steps - Design Brief */}
          {isPaid && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <Sparkles className="h-5 w-5" />
                  Next Step: Submit Design Brief
                </CardTitle>
                <CardDescription className="text-blue-700">
                  Complete your booking by telling us about your ad design preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-blue-700">
                  To finalize your campaign booking, please submit your design brief with your brand materials, colors, messaging, and design preferences. Our team will create a professional custom design for you!
                </p>
                <Link href="/customer/dashboard">
                  <Button size="lg" className="w-full" data-testid="button-submit-brief">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Submit Design Brief
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* What Happens Next */}
          <Card>
            <CardHeader>
              <CardTitle>What Happens Next?</CardTitle>
              <CardDescription>
                Timeline and next steps for your campaign
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full flex-shrink-0">
                    <span className="text-sm font-bold text-blue-600">1</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Submit Design Brief</h4>
                    <p className="text-sm text-muted-foreground">
                      Tell us about your brand, colors, messaging, and design preferences through your customer dashboard.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full flex-shrink-0">
                    <span className="text-sm font-bold text-blue-600">2</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Custom Design Creation</h4>
                    <p className="text-sm text-muted-foreground">
                      Our team will create a professional custom design based on your brief. You'll review and approve the design (up to 2 revisions included).
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full flex-shrink-0">
                    <span className="text-sm font-bold text-blue-600">3</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Professional Printing & Delivery</h4>
                    <p className="text-sm text-muted-foreground">
                      Premium printing and EDDM delivery to all 5,000+ households in your selected route on {formatDate(booking.campaign?.mailDate || null)}.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Campaign Slot</span>
                  <span>{formatCurrency(booking.amount)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Processing Fee</span>
                  <span>$0.00</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>Total {isPaid ? 'Paid' : 'Due'}</span>
                  <span className={isPaid ? "text-green-600" : "text-foreground"} data-testid="text-total-paid">
                    {formatCurrency(booking.amountPaid || booking.amount)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                  <CheckCircle className={`h-3 w-3 ${isPaid ? 'text-green-600' : 'text-yellow-600'}`} />
                  <span>
                    Status: {isPaid ? 'Paid' : 'Pending'}
                    {booking.paidAt && ` on ${formatDate(booking.paidAt)}`}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/customer/dashboard">
              <Button size="lg" data-testid="button-view-bookings">
                <FileText className="h-4 w-4 mr-2" />
                View My Bookings
              </Button>
            </Link>
            
            <Link href="/">
              <Button variant="outline" size="lg" data-testid="button-return-home">
                <Home className="h-4 w-4 mr-2" />
                Return to Home
              </Button>
            </Link>
          </div>

          {/* Important Information */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-800">Important Information</h4>
                  <ul className="text-sm text-blue-700 mt-2 space-y-1">
                    <li>• You will receive email updates about your campaign progress</li>
                    <li>• Upload your artwork as soon as possible to avoid delays</li>
                    <li>• Your slot is exclusive - no other {booking.industry?.name || 'business'} will be included</li>
                    <li>• Contact us at support@routereach.ak for any questions</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
