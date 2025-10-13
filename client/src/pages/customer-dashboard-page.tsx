import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/navigation";
import { DemoBanner } from "@/components/demo-banner";
import { 
  Calendar, 
  Package,
  CreditCard,
  Upload,
  ArrowRight,
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react";
import { Redirect, Link } from "wouter";
import type { Booking } from "@shared/schema";

export default function CustomerDashboardPage() {
  const { user } = useAuth();

  // Redirect admin users to admin dashboard
  if (user && user.role === "admin") {
    return <Redirect to="/admin" />;
  }

  // Fetch customer's bookings
  const { data: bookings, isLoading } = useQuery<Booking[]>({
    queryKey: ['/api/bookings'],
    enabled: !!user,
  });

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
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 text-sm text-muted-foreground">
                          <div>
                            <p className="font-medium text-foreground">Campaign</p>
                            <p>{booking.campaignId}</p>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">Route</p>
                            <p>{booking.routeId}</p>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">Industry</p>
                            <p>{booking.industryId}</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-muted-foreground">Booking Amount</p>
                        <p className="text-xl font-bold text-foreground">${booking.amount?.toLocaleString() || '600'}</p>
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
                        <p className="font-medium text-foreground">Campaign Payment</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(booking.createdAt).toLocaleDateString('en-US', { 
                            month: 'long', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground">${booking.amount?.toLocaleString() || '600'}</p>
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
              Artwork Upload Status
            </CardTitle>
            <CardDescription>Upload and track your campaign artwork files</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">Artwork upload feature coming soon</p>
              <p className="text-sm text-muted-foreground">
                You'll be able to upload your campaign artwork and track approval status here
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
