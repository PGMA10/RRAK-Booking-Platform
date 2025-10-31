import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  Mail,
  Phone,
  Building,
  MapPin,
  Briefcase,
  Calendar,
  DollarSign,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Image as ImageIcon,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import type { BookingWithDetails } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface BookingDetailsModalProps {
  booking: BookingWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
}

export function BookingDetailsModal({ booking, isOpen, onClose }: BookingDetailsModalProps) {
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionNote, setRejectionNote] = useState("");
  const { toast } = useToast();

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!booking) throw new Error('No booking selected');
      return fetch(`/api/bookings/${booking.id}/approve`, {
        method: "POST",
        credentials: 'include',
      }).then(res => {
        if (!res.ok) throw new Error('Failed to approve booking');
        return res.json();
      });
    },
    onSuccess: () => {
      toast({
        title: "Booking Approved",
        description: "The booking has been approved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/count'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve booking",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (note: string) => {
      if (!booking) throw new Error('No booking selected');
      return fetch(`/api/bookings/${booking.id}/reject`, {
        method: "POST",
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rejectionNote: note }),
      }).then(res => {
        if (!res.ok) throw new Error('Failed to reject booking');
        return res.json();
      });
    },
    onSuccess: () => {
      toast({
        title: "Booking Rejected",
        description: "The booking has been rejected and customer has been notified.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/count'] });
      setIsRejectDialogOpen(false);
      setRejectionNote("");
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Rejection Failed",
        description: error.message || "Failed to reject booking",
        variant: "destructive",
      });
    },
  });

  const handleApprove = () => {
    approveMutation.mutate();
  };

  const handleRejectClick = () => {
    setIsRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (rejectionNote.trim() === '') {
      toast({
        title: "Note Required",
        description: "Please provide a reason for rejecting this booking.",
        variant: "destructive",
      });
      return;
    }
    rejectMutation.mutate(rejectionNote);
  };

  const formatCurrency = (amountInCents: number) => {
    return `$${(amountInCents / 100).toFixed(2)}`;
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return 'N/A';
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : 
                      typeof date === 'number' ? new Date(date) : date;
      if (!dateObj || isNaN(dateObj.getTime())) return 'N/A';
      return dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  const getTimeAgo = (date: Date | string | number | null) => {
    if (!date) return 'N/A';
    try {
      const dateObj = typeof date === 'number' ? new Date(date) : 
                      typeof date === 'string' ? new Date(date) : date;
      return formatDistanceToNow(dateObj, { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  const getPaymentStatusBadge = () => {
    if (booking.paymentStatus === 'paid') {
      return <Badge className="bg-green-100 text-green-800 border-green-300"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>;
    } else if (booking.paymentStatus === 'pending') {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    } else {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
    }
  };

  const getArtworkStatusBadge = () => {
    if (booking.artworkStatus === 'approved') {
      return <Badge className="bg-green-100 text-green-800 border-green-300"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
    } else if (booking.artworkStatus === 'under_review') {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-300"><Clock className="h-3 w-3 mr-1" />Under Review</Badge>;
    } else if (booking.artworkStatus === 'rejected') {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
    } else {
      return <Badge variant="outline"><ImageIcon className="h-3 w-3 mr-1" />Pending Upload</Badge>;
    }
  };

  const getBookingStatusBadge = () => {
    if (booking.status === 'confirmed') {
      return <Badge className="bg-green-100 text-green-800 border-green-300">Confirmed</Badge>;
    } else if (booking.status === 'cancelled') {
      return <Badge variant="destructive">Cancelled</Badge>;
    } else {
      return <Badge variant="outline">{booking.status}</Badge>;
    }
  };

  const getApprovalStatusBadge = () => {
    const status = booking.approvalStatus || 'pending';
    if (status === 'approved') {
      return <Badge className="bg-green-100 text-green-800 border-green-300"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
    } else if (status === 'rejected') {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
    } else {
      return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending Review</Badge>;
    }
  };

  if (!booking) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="modal-booking-details">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Booking Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Business & Status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold" data-testid="text-business-name">{booking.businessName}</h3>
              {getBookingStatusBadge()}
            </div>
            <p className="text-sm text-muted-foreground">
              Booking ID: {booking.id.substring(0, 8).toUpperCase()}
            </p>
          </div>

          <Separator />

          {/* Campaign Information */}
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Campaign Information
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Campaign</p>
                <p className="font-medium" data-testid="text-campaign-name">{booking.campaign?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Mail Date</p>
                <p className="font-medium">{formatDate(booking.campaign?.mailDate || null)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Route</p>
                <p className="font-medium flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {booking.route?.name || 'N/A'} ({booking.route?.zipCode || 'N/A'})
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Industry</p>
                <p className="font-medium flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  {booking.industry?.name || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Customer Contact Details */}
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              Customer Contact Details
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium flex items-center gap-1" data-testid="text-contact-email">
                  <Mail className="h-3 w-3" />
                  {booking.contactEmail}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Phone</p>
                <p className="font-medium flex items-center gap-1" data-testid="text-contact-phone">
                  <Phone className="h-3 w-3" />
                  {booking.contactPhone || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment Information */}
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Payment Information
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Payment Status</p>
                <div className="mt-1">
                  {getPaymentStatusBadge()}
                </div>
              </div>
              <div>
                <p className="text-muted-foreground">Amount</p>
                <p className="font-medium text-lg text-green-600" data-testid="text-amount">
                  {formatCurrency(booking.amountPaid || booking.amount)}
                </p>
              </div>
              {booking.paidAt && (
                <div>
                  <p className="text-muted-foreground">Paid At</p>
                  <p className="font-medium">{formatDate(booking.paidAt)}</p>
                </div>
              )}
              {booking.stripePaymentIntentId && (
                <div>
                  <p className="text-muted-foreground">Transaction ID</p>
                  <p className="font-medium text-xs">{booking.stripePaymentIntentId.substring(0, 20)}...</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Approval Status */}
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <ThumbsUp className="h-4 w-4" />
              Approval Status
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Status</p>
                <div className="mt-1">
                  {getApprovalStatusBadge()}
                </div>
              </div>
              {booking.approvedAt && (
                <div>
                  <p className="text-muted-foreground">Approved At</p>
                  <p className="font-medium">{formatDate(booking.approvedAt)}</p>
                </div>
              )}
              {booking.rejectedAt && (
                <div>
                  <p className="text-muted-foreground">Rejected At</p>
                  <p className="font-medium">{formatDate(booking.rejectedAt)}</p>
                </div>
              )}
              {booking.rejectionNote && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">Rejection Note</p>
                  <p className="font-medium text-red-600">{booking.rejectionNote}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Artwork Information */}
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Artwork Information
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Artwork Status</p>
                <div className="mt-1">
                  {getArtworkStatusBadge()}
                </div>
              </div>
              {booking.artworkFileName && (
                <div>
                  <p className="text-muted-foreground">File Name</p>
                  <p className="font-medium">{booking.artworkFileName}</p>
                </div>
              )}
              {booking.artworkUploadedAt && (
                <div>
                  <p className="text-muted-foreground">Uploaded</p>
                  <p className="font-medium">{getTimeAgo(booking.artworkUploadedAt)}</p>
                </div>
              )}
              {booking.artworkRejectionReason && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">Rejection Reason</p>
                  <p className="font-medium text-red-600">{booking.artworkRejectionReason}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Booking Timeline */}
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Timeline
            </h4>
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Booking Created</span>
                <span className="font-medium">{getTimeAgo(booking.createdAt)}</span>
              </div>
              {booking.status === 'cancelled' && booking.cancellationDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cancelled</span>
                  <span className="font-medium text-red-600">{getTimeAgo(booking.cancellationDate)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1" data-testid="button-close-modal">
              Close
            </Button>
            
            {/* Approve/Reject Buttons - Only show if booking is pending approval */}
            {(booking.approvalStatus || 'pending') === 'pending' && booking.status !== 'cancelled' && (
              <>
                <Button 
                  variant="default"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={handleApprove}
                  disabled={approveMutation.isPending}
                  data-testid="button-approve-booking"
                >
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  {approveMutation.isPending ? "Approving..." : "Approve Booking"}
                </Button>
                <Button 
                  variant="destructive"
                  className="flex-1"
                  onClick={handleRejectClick}
                  disabled={rejectMutation.isPending}
                  data-testid="button-reject-booking"
                >
                  <ThumbsDown className="h-4 w-4 mr-2" />
                  {rejectMutation.isPending ? "Rejecting..." : "Reject Booking"}
                </Button>
              </>
            )}
            
            {/* Review Artwork Button - Only show if artwork is under review */}
            {booking.artworkStatus === 'under_review' && (
              <Button 
                variant="default" 
                onClick={() => {
                  window.location.href = '/admin/artwork';
                }}
                className="flex-1"
                data-testid="button-review-artwork"
              >
                <FileText className="h-4 w-4 mr-2" />
                Review Artwork
              </Button>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Rejection Note Dialog */}
      <AlertDialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <AlertDialogContent data-testid="dialog-reject-booking">
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Booking</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this booking. The customer will see this note.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="my-4">
            <Label htmlFor="rejection-note" className="text-sm font-medium">
              Rejection Reason
            </Label>
            <Textarea
              id="rejection-note"
              placeholder="e.g., Business does not meet our advertising guidelines, incomplete information, etc."
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              className="mt-2 min-h-[100px]"
              data-testid="textarea-rejection-note"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setRejectionNote("");
                setIsRejectDialogOpen(false);
              }}
              data-testid="button-cancel-rejection"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectConfirm}
              className="bg-red-600 hover:bg-red-700"
              disabled={rejectMutation.isPending}
              data-testid="button-confirm-rejection"
            >
              {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
