import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Navigation } from "@/components/navigation";
import { DemoBanner } from "@/components/demo-banner";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Calendar, 
  Package,
  CreditCard,
  Upload,
  ArrowRight,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  X,
  Trash2
} from "lucide-react";
import { Redirect, Link } from "wouter";
import { useState } from "react";
import type { BookingWithDetails, Route, Industry, Campaign } from "@shared/schema";

export default function CustomerDashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<{ bookingId: string; file: File } | null>(null);
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);

  // Redirect admin users to admin dashboard
  if (user && user.role === "admin") {
    return <Redirect to="/admin" />;
  }

  // Fetch customer's bookings
  const { data: bookings, isLoading } = useQuery<BookingWithDetails[]>({
    queryKey: ['/api/bookings'],
    enabled: !!user,
  });

  // Fetch routes, industries, and campaigns for display
  const { data: routes } = useQuery<Route[]>({
    queryKey: ['/api/routes'],
    enabled: !!user,
  });

  const { data: industries } = useQuery<Industry[]>({
    queryKey: ['/api/industries'],
    enabled: !!user,
  });

  const { data: campaigns } = useQuery<Campaign[]>({
    queryKey: ['/api/campaigns'],
    enabled: !!user,
  });

  // Create lookup maps
  const routeMap = new Map(routes?.map(r => [r.id, r]) || []);
  const industryMap = new Map(industries?.map(i => [i.id, i]) || []);
  const campaignMap = new Map(campaigns?.map(c => [c.id, c]) || []);

  const uploadArtworkMutation = useMutation({
    mutationFn: async ({ bookingId, file }: { bookingId: string; file: File }) => {
      const formData = new FormData();
      formData.append('artwork', file);
      
      const response = await fetch(`/api/bookings/${bookingId}/artwork`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload artwork');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      toast({
        title: "Artwork uploaded successfully",
        description: "Your artwork has been submitted for review.",
      });
      setSelectedFile(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (bookingId: string, file: File) => {
    const validTypes = ['image/png', 'image/jpeg', 'application/pdf'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload PNG, JPG, or PDF files only.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please upload files smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile({ bookingId, file });
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadArtworkMutation.mutate(selectedFile);
    }
  };

  // Cancel booking mutation
  const cancelBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const response = await apiRequest('POST', `/api/bookings/${bookingId}/cancel`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      toast({
        title: "Booking cancelled successfully",
        description: data.refund.message,
      });
      setCancelBookingId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Cancellation failed",
        description: error.message,
        variant: "destructive",
      });
      setCancelBookingId(null);
    },
  });

  const handleCancelBooking = () => {
    if (cancelBookingId) {
      cancelBookingMutation.mutate(cancelBookingId);
    }
  };

  // Create checkout session mutation (for pending payments)
  const checkoutMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const response = await apiRequest('GET', `/api/bookings/${bookingId}/checkout-session`);
      return response.json();
    },
    onSuccess: (data: { sessionUrl: string }) => {
      // Redirect to Stripe Checkout
      window.location.href = data.sessionUrl;
    },
    onError: (error: Error) => {
      toast({
        title: "Payment failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Check if booking can be canceled (allowed anytime, but refund depends on 7-day threshold)
  const canCancelBooking = (booking: BookingWithDetails): boolean => {
    if (booking.status === 'cancelled') return false;
    if (booking.paymentStatus !== 'paid' && booking.paymentStatus !== 'pending') return false;
    
    // Can cancel anytime, refund eligibility is determined server-side
    return true;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'pending': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'cancelled': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getArtworkStatusColor = (status: string | null) => {
    switch (status) {
      case 'approved': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'under_review': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'rejected': return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'pending_upload': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  const getArtworkStatusIcon = (status: string | null) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'under_review': return <Clock className="h-4 w-4" />;
      case 'rejected': return <AlertCircle className="h-4 w-4" />;
      case 'pending_upload': return <Upload className="h-4 w-4" />;
      default: return <Upload className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DemoBanner />
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground" data-testid="heading-customer-dashboard">
            Welcome back, {user?.businessName || user?.username}!
          </h2>
          <p className="text-muted-foreground mt-2">Manage your direct mail campaign bookings and track your advertising reach</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link href="/customer/booking">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Book New Campaign</p>
                    <p className="text-lg font-semibold text-foreground mt-1">Reserve Your Slot</p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div className="mt-4">
                  <Button variant="ghost" size="sm" className="w-full" data-testid="button-book-campaign">
                    Book Now <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Bookings</p>
                  <p className="text-lg font-semibold text-foreground mt-1" data-testid="text-total-bookings">
                    {bookings?.length || 0}
                  </p>
                </div>
                <div className="p-3 bg-accent/10 rounded-lg">
                  <Package className="h-6 w-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Campaigns</p>
                  <p className="text-lg font-semibold text-foreground mt-1" data-testid="text-active-bookings">
                    {bookings?.filter(b => b.status === 'confirmed').length || 0}
                  </p>
                </div>
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* My Bookings Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              My Campaign Bookings
            </CardTitle>
            <CardDescription>View and manage your direct mail campaign reservations</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : bookings && bookings.length > 0 ? (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <div 
                    key={booking.id} 
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    data-testid={`booking-card-${booking.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-foreground">Campaign Booking</h3>
                          <Badge className={`${getStatusColor(booking.status)} flex items-center gap-1`}>
                            {getStatusIcon(booking.status)}
                            {booking.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-3 text-sm text-muted-foreground">
                          <div>
                            <p className="font-medium text-foreground">Campaign</p>
                            <p>{booking.campaign?.name || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">Route</p>
                            <p>{booking.route?.zipCode} - {booking.route?.name || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">Industry</p>
                            <p>{booking.industry?.name || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">Quantity</p>
                            <p>{booking.quantity || 1} slot{(booking.quantity || 1) > 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        {(booking.paymentStatus === 'pending' || canCancelBooking(booking)) && (
                          <div className="mt-4 flex gap-2">
                            {booking.paymentStatus === 'pending' && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => checkoutMutation.mutate(booking.id)}
                                disabled={checkoutMutation.isPending}
                                data-testid={`button-pay-now-${booking.id}`}
                              >
                                <CreditCard className="h-4 w-4 mr-2" />
                                {checkoutMutation.isPending ? 'Processing...' : 'Pay Now'}
                              </Button>
                            )}
                            {canCancelBooking(booking) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCancelBookingId(booking.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                data-testid={`button-cancel-booking-${booking.id}`}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Cancel Booking
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-muted-foreground">Total Price</p>
                        <p className="text-xl font-bold text-foreground">${((booking.amount || 60000) / 100).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {booking.quantity || 1} slot{(booking.quantity || 1) > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No bookings yet</h3>
                <p className="text-muted-foreground mb-4">Start by booking your first campaign slot</p>
                <Link href="/customer/booking">
                  <Button data-testid="button-first-booking">
                    <Calendar className="h-4 w-4 mr-2" />
                    Book Your First Campaign
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment History Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment History
            </CardTitle>
            <CardDescription>Track your campaign payments and transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {bookings && bookings.length > 0 ? (
              <div className="space-y-3">
                {bookings.filter(b => b.status === 'confirmed').map((booking) => (
                  <div 
                    key={booking.id} 
                    className="flex items-center justify-between p-3 border rounded-lg"
                    data-testid={`payment-${booking.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/10 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Campaign Payment - {booking.quantity || 1} slot{(booking.quantity || 1) > 1 ? 's' : ''}</p>
                        <p className="text-sm text-muted-foreground">
                          {booking.createdAt ? new Date(booking.createdAt).toLocaleDateString('en-US', { 
                            month: 'long', 
                            day: 'numeric', 
                            year: 'numeric' 
                          }) : 'Date unavailable'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground">${((booking.amount || 60000) / 100).toLocaleString()}</p>
                      <Badge variant="outline" className="text-xs">Paid</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CreditCard className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No payment history available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Artwork Upload Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Artwork Upload & Status
            </CardTitle>
            <CardDescription>Upload and track your campaign artwork files for review</CardDescription>
          </CardHeader>
          <CardContent>
            {bookings && bookings.length > 0 ? (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-800">
                    💡 <strong>Note:</strong> If you booked multiple slots, upload one design. This artwork will be printed across all slots in your booking for maximum impact.
                  </p>
                </div>
                {bookings.map((booking) => (
                  <div 
                    key={booking.id} 
                    className="border rounded-lg p-4"
                    data-testid={`artwork-card-${booking.id}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-foreground">{booking.campaign?.name || 'Campaign'}</h4>
                        <p className="text-sm text-muted-foreground">{booking.route?.zipCode} {booking.route?.name} - {booking.industry?.name} - {booking.quantity || 1} slot{(booking.quantity || 1) > 1 ? 's' : ''}</p>
                      </div>
                      <Badge className={`${getArtworkStatusColor(booking.artworkStatus)} flex items-center gap-1`}>
                        {getArtworkStatusIcon(booking.artworkStatus)}
                        {booking.artworkStatus || 'pending_upload'}
                      </Badge>
                    </div>

                    {booking.artworkFileName && (
                      <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        <span>{booking.artworkFileName}</span>
                      </div>
                    )}

                    {booking.artworkStatus === 'rejected' && booking.artworkRejectionReason && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-3">
                        <p className="text-sm font-medium text-red-600 mb-1">Rejection Reason:</p>
                        <p className="text-sm text-red-600/80">{booking.artworkRejectionReason}</p>
                      </div>
                    )}

                    {(booking.artworkStatus === 'approved' || booking.artworkStatus === 'under_review') ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {booking.artworkStatus === 'approved' && (
                          <p className="text-green-600 font-medium">
                            ✓ Artwork approved and ready for printing
                          </p>
                        )}
                        {booking.artworkStatus === 'under_review' && (
                          <p className="text-blue-600 font-medium">
                            ⏱ Artwork is being reviewed by our team
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <input
                          type="file"
                          id={`file-${booking.id}`}
                          accept="image/png,image/jpeg,application/pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileSelect(booking.id, file);
                          }}
                          className="hidden"
                          data-testid={`input-artwork-${booking.id}`}
                        />
                        <label htmlFor={`file-${booking.id}`} className="flex-1">
                          <Button 
                            variant="outline" 
                            className="w-full"
                            type="button"
                            onClick={() => document.getElementById(`file-${booking.id}`)?.click()}
                            data-testid={`button-select-file-${booking.id}`}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            {booking.artworkFileName ? 'Replace Artwork' : 'Select Artwork File'}
                          </Button>
                        </label>
                        {selectedFile?.bookingId === booking.id && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground truncate max-w-xs">
                              {selectedFile.file.name}
                            </span>
                            <Button
                              size="sm"
                              onClick={handleUpload}
                              disabled={uploadArtworkMutation.isPending}
                              data-testid={`button-upload-${booking.id}`}
                            >
                              {uploadArtworkMutation.isPending ? 'Uploading...' : 'Upload'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedFile(null)}
                              data-testid={`button-cancel-${booking.id}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="mt-2 text-xs text-muted-foreground">
                      Accepted formats: PNG, JPG, PDF (max 10MB)
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-2">No bookings available</p>
                <p className="text-sm text-muted-foreground">
                  Book a campaign to upload your artwork
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cancel Booking Confirmation Dialog */}
        <AlertDialog open={!!cancelBookingId} onOpenChange={() => setCancelBookingId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
              <AlertDialogDescription>
                {cancelBookingId && bookings && (
                  <>
                    {(() => {
                      const booking = bookings.find(b => b.id === cancelBookingId);
                      if (!booking) return null;
                      
                      // Check if campaign has a print deadline
                      if (!booking.campaign?.printDeadline) {
                        return (
                          <div className="space-y-3">
                            <p>
                              Cancel booking for <strong>{booking.campaign?.name}</strong> - {booking.route?.zipCode}?
                            </p>
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                              ⚠ Cannot process cancellation: Campaign print deadline not set. Please contact support.
                            </div>
                          </div>
                        );
                      }
                      
                      const now = new Date();
                      const printDeadline = new Date(booking.campaign.printDeadline);
                      const daysUntilDeadline = Math.ceil((printDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                      const isEligibleForRefund = daysUntilDeadline >= 7 && booking.paymentStatus === 'paid';
                      
                      return (
                        <div className="space-y-3">
                          <p>
                            Cancel booking for <strong>{booking.campaign?.name}</strong> - {booking.route?.zipCode}?
                          </p>
                          <p className="text-sm">
                            This action cannot be undone. The slot will be released and made available to other businesses.
                          </p>
                          {isEligibleForRefund ? (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                              ✓ Full refund of ${((booking.amountPaid || booking.amount) / 100).toFixed(2)} will be processed automatically
                            </div>
                          ) : (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                              ⚠ No refund - within 7 days of print deadline
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="dialog-cancel-no">Keep Booking</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancelBooking}
                className="bg-red-600 hover:bg-red-700"
                data-testid="dialog-cancel-yes"
                disabled={!bookings?.find(b => b.id === cancelBookingId)?.campaign?.printDeadline || cancelBookingMutation.isPending}
              >
                {cancelBookingMutation.isPending ? 'Cancelling...' : 'Cancel Booking'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
