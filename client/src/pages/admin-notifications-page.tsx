import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/navigation";
import { DemoBanner } from "@/components/demo-banner";
import {
  Bell,
  UserPlus,
  FileText,
  Clock,
  ChevronRight,
  AlertCircle
} from "lucide-react";
import { Redirect, Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import type { BookingWithDetails } from "@shared/schema";

interface Notification {
  id: string;
  type: string;
  bookingId: string;
  booking: BookingWithDetails;
  createdAt: Date;
  isHandled: boolean;
}

export default function AdminNotificationsPage() {
  const { user } = useAuth();

  if (!user || user.role !== "admin") {
    return <Redirect to="/" />;
  }

  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const newBookings = notifications?.filter(n => n.type === 'new_booking') || [];
  const artworkReviews = notifications?.filter(n => n.type === 'artwork_review') || [];

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
            {notifications && notifications.length > 0 && (
              <Badge variant="destructive" className="text-lg" data-testid="badge-total-notifications">
                {notifications.length}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Action items requiring your attention
          </p>
        </div>

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
                            </p>
                            <div className="flex items-center mt-2">
                              <Clock className="h-3 w-3 mr-1" />
                              <span className="text-xs">
                                Booked {getTimeAgo(notification.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Link href={`/admin/slots`}>
                          <Button variant="outline" size="sm" data-testid={`button-view-booking-${notification.bookingId}`}>
                            View Details
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </Link>
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
                        <Link href="/admin/artwork">
                          <Button variant="outline" size="sm" data-testid={`button-review-artwork-${notification.bookingId}`}>
                            Review Artwork
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </Link>
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
      </div>
    </div>
  );
}
