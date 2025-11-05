import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Check, X, FileText, MessageSquare } from "lucide-react";
import type { BookingWithDetails, DesignRevision } from "@shared/schema";

interface CustomerDesignApprovalModalProps {
  booking: BookingWithDetails;
  open: boolean;
  onClose: () => void;
}

export function CustomerDesignApprovalModal({ booking, open, onClose }: CustomerDesignApprovalModalProps) {
  const [feedback, setFeedback] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: designs } = useQuery<DesignRevision[]>({
    queryKey: ['/api/bookings', booking.id, 'designs'],
    enabled: open && !!booking.id,
  });

  const latestDesign = designs && designs.length > 0 ? designs[designs.length - 1] : null;

  const approveDesignMutation = useMutation({
    mutationFn: async () => {
      if (!latestDesign) throw new Error("No design available");

      const response = await fetch(`/api/designs/${latestDesign.id}/approve`, {
        method: 'PATCH',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to approve design');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      toast({
        title: "Design approved",
        description: "Your design has been approved and is ready for printing!",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Approval failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const requestRevisionMutation = useMutation({
    mutationFn: async () => {
      if (!latestDesign) throw new Error("No design available");
      if (!feedback.trim()) throw new Error("Feedback is required");

      const response = await fetch(`/api/designs/${latestDesign.id}/request-revision`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to request revision');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      toast({
        title: "Revision requested",
        description: "Your feedback has been sent. We'll update the design and send it back for review.",
      });
      setFeedback("");
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Request failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const canRequestRevision = (booking.revisionCount || 0) < 2;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Review Your Design
          </DialogTitle>
          <DialogDescription>
            Review the completed design for {booking.businessName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Design Preview */}
          {latestDesign ? (
            <>
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Label>Revision #{latestDesign.revisionNumber}</Label>
                    <Badge className={
                      latestDesign.status === 'pending_review' ? 'bg-blue-100 text-blue-800' :
                      latestDesign.status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-orange-100 text-orange-800'
                    }>
                      {latestDesign.status}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Uploaded: {new Date(latestDesign.uploadedAt || '').toLocaleDateString()}
                  </span>
                </div>

                <div className="bg-muted rounded-lg p-8 flex items-center justify-center min-h-[200px]">
                  <div className="text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Design file available for download</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => window.open(`/api/designs/${latestDesign.id}/file`, '_blank')}
                      data-testid="button-view-design"
                    >
                      View Design
                    </Button>
                  </div>
                </div>
              </div>

              {/* Admin Notes */}
              {latestDesign.adminNotes && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-green-900 mb-1">Message from Designer:</p>
                      <p className="text-sm text-green-800 whitespace-pre-wrap" data-testid="text-admin-notes">
                        {latestDesign.adminNotes}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Revision Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  📊 <strong>Revisions Used:</strong> {booking.revisionCount || 0}/2
                  {canRequestRevision && (
                    <> - You have {2 - (booking.revisionCount || 0)} revision{2 - (booking.revisionCount || 0) !== 1 ? 's' : ''} remaining</>
                  )}
                  {!canRequestRevision && (
                    <> - Maximum revisions reached. This is your final design.</>
                  )}
                </p>
              </div>

              {/* Approval Actions */}
              {latestDesign.status === 'pending_review' && (
                <>
                  <div className="border-t pt-4">
                    <div className="flex gap-3">
                      <Button
                        className="flex-1"
                        onClick={() => approveDesignMutation.mutate()}
                        disabled={approveDesignMutation.isPending}
                        data-testid="button-approve-design"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        {approveDesignMutation.isPending ? 'Approving...' : 'Approve Design'}
                      </Button>
                      
                      {canRequestRevision && (
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => document.getElementById('feedback-section')?.scrollIntoView({ behavior: 'smooth' })}
                          data-testid="button-request-changes"
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Request Changes
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Request Changes Section */}
                  {canRequestRevision && (
                    <div id="feedback-section" className="border-t pt-4">
                      <Label htmlFor="feedback" className="flex items-center gap-2 mb-2">
                        <MessageSquare className="h-4 w-4" />
                        Request Changes
                      </Label>
                      <Textarea
                        id="feedback"
                        placeholder="Please describe the changes you'd like to see..."
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        className="mb-3"
                        rows={4}
                        data-testid="textarea-feedback"
                      />
                      <Button
                        variant="secondary"
                        onClick={() => requestRevisionMutation.mutate()}
                        disabled={!feedback.trim() || requestRevisionMutation.isPending}
                        data-testid="button-submit-revision-request"
                      >
                        <X className="h-4 w-4 mr-2" />
                        {requestRevisionMutation.isPending ? 'Submitting...' : 'Submit Revision Request'}
                      </Button>
                    </div>
                  )}
                </>
              )}

              {latestDesign.status === 'approved' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    ✅ <strong>Design Approved!</strong> Your design has been approved and is ready for printing.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No design available for review yet</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4 border-t pt-4">
          <Button variant="outline" onClick={onClose} data-testid="button-close-modal">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
