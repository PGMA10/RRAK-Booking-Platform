import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Navigation } from "@/components/navigation";
import { DemoBanner } from "@/components/demo-banner";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle
} from "lucide-react";
import { Redirect } from "wouter";
import { useState } from "react";
import type { Booking } from "@shared/schema";

export default function AdminArtworkReviewPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rejectionReason, setRejectionReason] = useState<{ [key: string]: string }>({});

  if (!user || user.role !== "admin") {
    return <Redirect to="/" />;
  }

  const { data: bookings, isLoading } = useQuery<Booking[]>({
    queryKey: ['/api/bookings/artwork/review'],
  });

  const approveMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return await apiRequest("PATCH", `/api/bookings/${bookingId}/artwork/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings/artwork/review'] });
      toast({
        title: "Artwork approved",
        description: "The artwork has been approved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Approval failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ bookingId, reason }: { bookingId: string; reason: string }) => {
      return await apiRequest("PATCH", `/api/bookings/${bookingId}/artwork/reject`, { reason });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings/artwork/review'] });
      setRejectionReason(prev => {
        const updated = { ...prev };
        delete updated[variables.bookingId];
        return updated;
      });
      toast({
        title: "Artwork rejected",
        description: "The customer will be notified to resubmit.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Rejection failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleApprove = (bookingId: string) => {
    approveMutation.mutate(bookingId);
  };

  const handleReject = (bookingId: string) => {
    const reason = rejectionReason[bookingId]?.trim();
    if (!reason) {
      toast({
        title: "Rejection reason required",
        description: "Please provide a reason for rejecting the artwork.",
        variant: "destructive",
      });
      return;
    }
    rejectMutation.mutate({ bookingId, reason });
  };

  return (
    <div className="min-h-screen bg-background">
      <DemoBanner />
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground" data-testid="heading-artwork-review">
            Artwork Review Queue
          </h2>
          <p className="text-muted-foreground mt-2">Review and approve customer artwork submissions</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Pending Artwork Reviews
            </CardTitle>
            <CardDescription>
              Artwork awaiting review ({bookings?.length || 0} {bookings?.length === 1 ? 'submission' : 'submissions'})
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : bookings && bookings.length > 0 ? (
              <div className="space-y-6">
                {bookings.map((booking) => (
                  <div 
                    key={booking.id} 
                    className="border rounded-lg p-6"
                    data-testid={`review-card-${booking.id}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-foreground">
                            Campaign {booking.campaignId}
                          </h3>
                          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            Under Review
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                          <div>
                            <p className="font-medium text-foreground">Customer</p>
                            <p>{booking.businessName}</p>
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
                    </div>

                    {booking.artworkFileName && (
                      <div className="bg-muted rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-primary" />
                          <div className="flex-1">
                            <p className="font-medium text-foreground">{booking.artworkFileName}</p>
                            <p className="text-sm text-muted-foreground">
                              Uploaded {booking.artworkUploadedAt ? new Date(booking.artworkUploadedAt).toLocaleString() : 'Recently'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-foreground block mb-2">
                          Rejection Reason (if rejecting)
                        </label>
                        <Textarea
                          placeholder="Explain why the artwork is being rejected (e.g., low resolution, incorrect dimensions, inappropriate content)..."
                          value={rejectionReason[booking.id] || ''}
                          onChange={(e) => setRejectionReason(prev => ({ ...prev, [booking.id]: e.target.value }))}
                          className="min-h-24"
                          data-testid={`textarea-rejection-${booking.id}`}
                        />
                      </div>

                      <div className="flex items-center gap-3 pt-2">
                        <Button
                          onClick={() => handleApprove(booking.id)}
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          data-testid={`button-approve-${booking.id}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {approveMutation.isPending ? 'Approving...' : 'Approve Artwork'}
                        </Button>
                        <Button
                          onClick={() => handleReject(booking.id)}
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                          variant="destructive"
                          className="flex-1"
                          data-testid={`button-reject-${booking.id}`}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          {rejectMutation.isPending ? 'Rejecting...' : 'Reject Artwork'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">All caught up!</h3>
                <p className="text-muted-foreground">There are no artwork submissions awaiting review</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
