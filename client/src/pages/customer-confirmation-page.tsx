import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation, Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Calendar, MapPin, Briefcase, DollarSign, Mail, Phone, FileText, Download, Home, Loader2 } from "lucide-react";

interface ConfirmationData {
  booking: any;
  bookingData: any;
  paymentSuccess: boolean;
}

export default function CustomerConfirmationPage() {
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

  // Get confirmation data from session storage
  const [confirmationData, setConfirmationData] = useState<ConfirmationData | null>(null);

  useEffect(() => {
    const storedConfirmationData = sessionStorage.getItem("confirmationData");
    if (!storedConfirmationData) {
      toast({
        variant: "destructive",
        description: "No booking confirmation found. Please complete the booking process.",
      });
      navigate("/customer/booking");
      return;
    }
    
    try {
      const data = JSON.parse(storedConfirmationData);
      setConfirmationData(data);
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Invalid confirmation data. Please start the booking process again.",
      });
      navigate("/customer/booking");
    }
  }, [navigate, toast]);

  const formatCurrency = (amountInCents: number) => {
    return `$${(amountInCents / 100).toFixed(2)}`;
  };

  const generateBookingReference = (bookingId: string) => {
    return `RRA-${bookingId.substr(0, 8).toUpperCase()}`;
  };

  if (!confirmationData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading confirmation details...</p>
        </div>
      </div>
    );
  }

  const { booking, bookingData } = confirmationData;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-page-title">
            Booking Confirmed!
          </h1>
          <p className="text-muted-foreground text-lg" data-testid="text-page-description">
            Your campaign slot has been successfully reserved
          </p>
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-300 mt-4">
            Booking Reference: {generateBookingReference(booking.id)}
          </Badge>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          
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
                      {bookingData.campaign.name}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Mail Date</p>
                    <p className="font-medium" data-testid="text-mail-date">
                      {new Date(bookingData.campaign.mailDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Delivery Route</p>
                      <p className="font-medium" data-testid="text-route-info">
                        {bookingData.route.name} ({bookingData.route.zipCode})
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Reaching {bookingData.route.householdCount?.toLocaleString()} households
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Industry Category</p>
                      <p className="font-medium" data-testid="text-industry-info">
                        {bookingData.industry.name}
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
                    <p className="text-sm font-medium text-muted-foreground">Amount Paid</p>
                    <p className="font-medium text-lg text-green-600" data-testid="text-amount-paid">
                      {formatCurrency(booking.amount)}
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
                    <h4 className="font-medium">Design Phase</h4>
                    <p className="text-sm text-muted-foreground">
                      Our design team will create your professional postcard using your business information.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full flex-shrink-0">
                    <span className="text-sm font-bold text-blue-600">2</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Approval Process</h4>
                    <p className="text-sm text-muted-foreground">
                      We'll send you a proof for review and approval before printing.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full flex-shrink-0">
                    <span className="text-sm font-bold text-blue-600">3</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Printing & Mailing</h4>
                    <p className="text-sm text-muted-foreground">
                      Professional printing and delivery to all households in your selected route on {new Date(bookingData.campaign.mailDate).toLocaleDateString()}.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Information */}
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
                  <span>Total Paid</span>
                  <span className="text-green-600" data-testid="text-total-paid">
                    {formatCurrency(booking.amount)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>Payment ID: {booking.paymentId}</span>
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
            
            <Button variant="outline" size="lg" asChild data-testid="button-download-receipt">
              <a href="#" onClick={(e) => {
                e.preventDefault();
                toast({ description: "Receipt download functionality would be implemented here." });
              }}>
                <Download className="h-4 w-4 mr-2" />
                Download Receipt
              </a>
            </Button>
            
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
                    <li>• Design proofs will be sent within 3-5 business days</li>
                    <li>• Your slot is exclusive - no other {bookingData.industry.name} business will be included</li>
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