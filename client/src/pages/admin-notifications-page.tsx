import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Navigation } from "@/components/navigation";
import { DemoBanner } from "@/components/demo-banner";
import { BookingDetailsModal } from "@/components/booking-details-modal";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Bell,
  UserPlus,
  FileText,
  Clock,
  ChevronRight,
  AlertCircle,
  DollarSign,
  CheckCircle,
  XCircle,
  X,
  History
} from "lucide-react";
import { Redirect, Link } from "wouter";
import { formatDistanceToNow, format } from "date-fns";
import type { BookingWithDetails, Booking } from "@shared/schema";

interface Notification {
  id: string;
  type: string;
  bookingId: string;
  booking: BookingWithDetails;
  createdAt: Date;
  isHandled: boolean;
}

interface DismissedNotification {
  id: string;
  bookingId: string;
  notificationType: string;
  dismissedAt: Date | number | null;
  booking?: Booking;
}

export default function AdminNotificationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");

  const dismissMutation = useMutation({
    mutationFn: async ({bookingId, notificationType}: {bookingId: string, notificationType: string}) => {
      return apiRequest('POST', `/api/notifications/${bookingId}/dismiss`, { notificationType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/count'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/history'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to dismiss notification",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  // Query for notification history
  const { data: notificationHistory, isLoading: isLoadingHistory } = useQuery<DismissedNotification[]>({
    queryKey: ['/api/notifications/history'],
    enabled: activeTab === 'history',
  });

  const handleDismiss = (bookingId: string, notificationType: string) => {
    dismissMutation.mutate({ bookingId, notificationType });
  };

  const handleViewDetails = (booking: BookingWithDetails, notificationType: string) => {
    // Auto-dismiss when viewing details
    dismissMutation.mutate({ bookingId: booking.id, notificationType });
    setSelectedBooking(booking);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedBooking(null);
  };

  if (!user || user.role !== "admin") {
    return <Redirect to="/" />;
  }

  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const newBookings = notifications?.filter(n => n.type === 'new_booking') || [];
  const artworkReviews = notifications?.filter(n => n.type === 'artwork_review') || [];
  const canceledBookings = notifications?.filter(n => n.type === 'canceled_booking') || [];

  const getTimeAgo = (date: Date | string | number) => {
    try {
      const dateObj = typeof date === 'number' ? new Date(date) : 
                      typeof date === 'string' ? new Date(date) : date;
      return formatDistanceToNow(dateObj, { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DemoBanner />
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Bell className="h-8 w-8 text-primary" />
            <h2 className="text-3xl font-bold text-foreground">Notifications</h2>
            {notifications && notifications.length > 0 && activeTab === "active" && (
              <Badge variant="destructive" className="text-lg" data-testid="badge-total-notifications">
                {notifications.length}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Action items requiring your attention
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "active" | "history")} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="active" className="flex items-center gap-2" data-testid="tab-active">
              <Bell className="h-4 w-4" />
              Active
              {notifications && notifications.length > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">{notifications.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2" data-testid="tab-history">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : notifications && notifications.length > 0 ? (
          <div className="space-y-8">
            {/* New Bookings Section */}
            {newBookings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <UserPlus className="h-5 w-5 text-green-600" />
                    <span>New Bookings</span>
                    <Badge variant="outline" data-testid="badge-new-bookings-section">
                      {newBookings.length}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Recently confirmed bookings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {newBookings.map((notification) => (
                      <div
                        key={notification.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                        data-testid={`notification-${notification.id}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-semibold text-foreground">
                              {notification.booking.businessName}
                            </h4>
                            <Badge variant="secondary">New</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>
                              Campaign: {notification.booking.campaign?.name || 'N/A'}
                            </p>
                            <p>
                              Route: {notification.booking.route?.zipCode} - {notification.booking.route?.name}
                            </p>
                            <p>
                              Industry: {notification.booking.industry?.name}
                              {notification.booking.industrySubcategoryLabel && (
                                <> → {notification.booking.industrySubcategoryLabel}</>
                              )}
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                              <div className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                <span className="text-xs">
                                  Booked {getTimeAgo(notification.createdAt)}
                                </span>
                              </div>
                              {notification.booking.paymentStatus && (
                                <div className="flex items-center">
                                  {notification.booking.paymentStatus === 'paid' ? (
                                    <>
                                      <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                                      <span className="text-xs text-green-600">Payment Confirmed</span>
                                    </>
                                  ) : notification.booking.paymentStatus === 'pending' ? (
                                    <>
                                      <Clock className="h-3 w-3 mr-1 text-yellow-600" />
                                      <span className="text-xs text-yellow-600">Payment Pending</span>
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="h-3 w-3 mr-1 text-red-600" />
                                      <span className="text-xs text-red-600">Payment Failed</span>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDismiss(notification.bookingId, notification.type)}
                            data-testid={`button-dismiss-${notification.bookingId}`}
                            disabled={dismissMutation.isPending}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleViewDetails(notification.booking, notification.type)}
                            data-testid={`button-view-booking-${notification.bookingId}`}
                          >
                            View Details
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Artwork Reviews Section */}
            {artworkReviews.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span>Artwork Pending Review</span>
                    <Badge variant="outline" data-testid="badge-artwork-reviews-section">
                      {artworkReviews.length}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Customer artwork submissions awaiting approval
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {artworkReviews.map((notification) => (
                      <div
                        key={notification.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                        data-testid={`notification-${notification.id}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-semibold text-foreground">
                              {notification.booking.businessName}
                            </h4>
                            <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                              Under Review
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>
                              Campaign: {notification.booking.campaign?.name || 'N/A'}
                            </p>
                            <p>
                              Route: {notification.booking.route?.zipCode} - {notification.booking.route?.name}
                            </p>
                            <p>
                              File: {notification.booking.artworkFileName || 'N/A'}
                            </p>
                            <div className="flex items-center mt-2">
                              <Clock className="h-3 w-3 mr-1" />
                              <span className="text-xs">
                                Uploaded {getTimeAgo(notification.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDismiss(notification.bookingId, notification.type)}
                            data-testid={`button-dismiss-${notification.bookingId}`}
                            disabled={dismissMutation.isPending}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Link href="/admin/artwork">
                            <Button variant="outline" size="sm" data-testid={`button-review-artwork-${notification.bookingId}`}>
                              Review Artwork
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Canceled Bookings Section */}
            {canceledBookings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span>Canceled Bookings</span>
                    <Badge variant="outline" data-testid="badge-canceled-bookings-section">
                      {canceledBookings.length}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Recent booking cancellations (last 7 days)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {canceledBookings.map((notification) => (
                      <div
                        key={notification.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                        data-testid={`notification-${notification.id}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-semibold text-foreground">
                              {notification.booking.businessName}
                            </h4>
                            <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
                              Canceled
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>
                              Campaign: {notification.booking.campaign?.name || 'N/A'}
                            </p>
                            <p>
                              Route: {notification.booking.route?.zipCode} - {notification.booking.route?.name}
                            </p>
                            <p>
                              Industry: {notification.booking.industry?.name}
                              {notification.booking.industrySubcategoryLabel && (
                                <> → {notification.booking.industrySubcategoryLabel}</>
                              )}
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                              <div className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                <span className="text-xs">
                                  Canceled {getTimeAgo(notification.createdAt)}
                                </span>
                              </div>
                              {notification.booking.refundStatus && (
                                <div className="flex items-center">
                                  {notification.booking.refundStatus === 'processed' ? (
                                    <>
                                      <DollarSign className="h-3 w-3 mr-1 text-green-600" />
                                      <span className="text-xs text-green-600">
                                        Refund Processed: ${((notification.booking.refundAmount || 0) / 100).toFixed(2)}
                                      </span>
                                    </>
                                  ) : notification.booking.refundStatus === 'pending' ? (
                                    <>
                                      <Clock className="h-3 w-3 mr-1 text-yellow-600" />
                                      <span className="text-xs text-yellow-600">Refund Pending</span>
                                    </>
                                  ) : notification.booking.refundStatus === 'no_refund' ? (
                                    <>
                                      <AlertCircle className="h-3 w-3 mr-1 text-orange-600" />
                                      <span className="text-xs text-orange-600">No Refund (Within 7 days)</span>
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="h-3 w-3 mr-1 text-red-600" />
                                      <span className="text-xs text-red-600">Refund Failed</span>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDismiss(notification.bookingId, notification.type)}
                            data-testid={`button-dismiss-${notification.bookingId}`}
                            disabled={dismissMutation.isPending}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleViewDetails(notification.booking, notification.type)}
                            data-testid={`button-view-canceled-${notification.bookingId}`}
                          >
                            View Details
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                All caught up!
              </h3>
              <p className="text-muted-foreground">
                No pending notifications at this time.
              </p>
            </CardContent>
          </Card>
        )}
          </TabsContent>

          <TabsContent value="history">
            {isLoadingHistory ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : notificationHistory && notificationHistory.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <History className="h-5 w-5 text-muted-foreground" />
                    <span>Dismissed Notifications</span>
                    <Badge variant="outline">{notificationHistory.length}</Badge>
                  </CardTitle>
                  <CardDescription>
                    Previously dismissed notifications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {notificationHistory.map((notification) => (
                      <div
                        key={notification.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/30"
                        data-testid={`history-notification-${notification.id}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium text-foreground">
                              {notification.booking?.businessName || 'Unknown Business'}
                            </h4>
                            <Badge variant="outline" className="text-xs">
                              {notification.notificationType.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            {notification.booking && (
                              <>
                                <p>
                                  Campaign: {(notification.booking as any).campaign?.name || 'N/A'}
                                </p>
                                <p>
                                  Route: {(notification.booking as any).route?.zipCode || 'N/A'} - {(notification.booking as any).route?.name || 'N/A'}
                                </p>
                                <p>
                                  Industry: {(notification.booking as any).industry?.name || 'N/A'}
                                  {notification.booking.industrySubcategoryLabel && (
                                    <> → {notification.booking.industrySubcategoryLabel}</>
                                  )}
                                </p>
                              </>
                            )}
                            <div className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              <span className="text-xs">
                                Dismissed {notification.dismissedAt ? format(
                                  new Date(typeof notification.dismissedAt === 'number' ? notification.dismissedAt : notification.dismissedAt),
                                  'MMM d, yyyy h:mm a'
                                ) : 'Unknown'}
                              </span>
                            </div>
                          </div>
                        </div>
                        {notification.booking && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              setSelectedBooking(notification.booking as BookingWithDetails);
                              setIsModalOpen(true);
                            }}
                            data-testid={`button-view-history-${notification.id}`}
                          >
                            View Details
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <History className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No history yet
                  </h3>
                  <p className="text-muted-foreground">
                    Dismissed notifications will appear here.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <BookingDetailsModal
        booking={selectedBooking}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}
