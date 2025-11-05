import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  Eye, 
  Upload, 
  ImagePlus, 
  QrCode, 
  Palette, 
  Type,
  Check,
  X,
  FileText
} from "lucide-react";
import type { BookingWithDetails, DesignRevision } from "@shared/schema";

interface DesignBriefReviewModalProps {
  booking: BookingWithDetails;
  open: boolean;
  onClose: () => void;
}

export function DesignBriefReviewModal({ booking, open, onClose }: DesignBriefReviewModalProps) {
  const [designFile, setDesignFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: designs } = useQuery<DesignRevision[]>({
    queryKey: ['/api/bookings', booking.id, 'designs'],
    enabled: open && !!booking.id,
  });

  const uploadDesignMutation = useMutation({
    mutationFn: async () => {
      if (!designFile) throw new Error("No file selected");

      const formData = new FormData();
      formData.append('design', designFile);
      formData.append('revisionNumber', String(booking.revisionCount || 0));

      const response = await fetch(`/api/bookings/${booking.id}/design`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload design');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings', booking.id, 'designs'] });
      toast({
        title: "Design uploaded successfully",
        description: "The customer will be notified to review the design.",
      });
      setDesignFile(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUploadDesign = () => {
    if (!designFile) {
      toast({
        title: "No file selected",
        description: "Please select a design file to upload",
        variant: "destructive",
      });
      return;
    }

    uploadDesignMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Design Brief Review: {booking.businessName}
          </DialogTitle>
          <DialogDescription>
            Review customer's design brief and upload completed designs
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="brief" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="brief" data-testid="tab-brief">Design Brief</TabsTrigger>
            <TabsTrigger value="designs" data-testid="tab-designs">
              Designs & Revisions
              {designs && designs.length > 0 && (
                <Badge variant="secondary" className="ml-2">{designs.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="brief" className="space-y-4 mt-4">
            {/* Booking Details */}
            <Card>
              <CardHeader>
                <CardTitle>Booking Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Campaign</Label>
                    <p className="font-medium">{booking.campaign?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Route</Label>
                    <p className="font-medium">{booking.route?.zipCode} {booking.route?.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Industry</Label>
                    <p className="font-medium">{booking.industry?.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Slots Booked</Label>
                    <p className="font-medium">{booking.quantity || 1}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Main Message */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  Main Message
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-medium" data-testid="text-main-message">
                  {booking.mainMessage || 'Not provided'}
                </p>
              </CardContent>
            </Card>

            {/* Brand Colors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Brand Colors & Style
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4">
                  <Label>Primary Color:</Label>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded border"
                      style={{ backgroundColor: booking.brandColor || '#000000' }}
                    />
                    <span className="font-mono" data-testid="text-brand-color">{booking.brandColor || 'Not set'}</span>
                  </div>
                </div>
                {booking.secondaryColor && (
                  <div className="flex items-center gap-4">
                    <Label>Secondary Color:</Label>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded border"
                        style={{ backgroundColor: booking.secondaryColor }}
                      />
                      <span className="font-mono" data-testid="text-secondary-color">{booking.secondaryColor}</span>
                    </div>
                  </div>
                )}
                {booking.additionalColor1 && (
                  <div className="flex items-center gap-4">
                    <Label>Additional Color 1:</Label>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded border"
                        style={{ backgroundColor: booking.additionalColor1 }}
                      />
                      <span className="font-mono" data-testid="text-additional-color-1">{booking.additionalColor1}</span>
                    </div>
                  </div>
                )}
                {booking.additionalColor2 && (
                  <div className="flex items-center gap-4">
                    <Label>Additional Color 2:</Label>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded border"
                        style={{ backgroundColor: booking.additionalColor2 }}
                      />
                      <span className="font-mono" data-testid="text-additional-color-2">{booking.additionalColor2}</span>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <Label>Ad Style:</Label>
                  <Badge variant="outline" data-testid="text-ad-style">{booking.adStyle || 'Not specified'}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* QR Code */}
            {booking.qrCodeDestination && booking.qrCodeDestination !== 'none' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-4 w-4" />
                    QR Code
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <Label>Destination:</Label>
                    <p className="font-medium capitalize" data-testid="text-qr-destination">
                      {booking.qrCodeDestination}
                    </p>
                  </div>
                  {booking.qrCodeUrl && (
                    <div>
                      <Label>URL:</Label>
                      <p className="font-mono text-sm break-all" data-testid="text-qr-url">{booking.qrCodeUrl}</p>
                    </div>
                  )}
                  {booking.qrCodeLabel && (
                    <div>
                      <Label>Label:</Label>
                      <p className="font-medium" data-testid="text-qr-label">{booking.qrCodeLabel}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Uploaded Assets */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImagePlus className="h-4 w-4" />
                  Customer Assets
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Logo</Label>
                    {booking.logoFilePath ? (
                      <div className="mt-1">
                        <a 
                          href={`/api/bookings/${booking.id}/logo`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                          data-testid="link-download-logo"
                        >
                          <FileText className="h-4 w-4" />
                          <span>View Logo</span>
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">No logo uploaded</p>
                    )}
                  </div>
                  <div>
                    <Label>Optional Image</Label>
                    {booking.optionalImagePath ? (
                      <div className="mt-1">
                        <a 
                          href={`/api/bookings/${booking.id}/optional-image`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                          data-testid="link-download-image"
                        >
                          <FileText className="h-4 w-4" />
                          <span>View Image</span>
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">No additional image</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Additional Notes */}
            {booking.designNotes && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Customer Notes & Questions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap" data-testid="text-design-notes">
                    {booking.designNotes}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="designs" className="space-y-4 mt-4">
            {/* Upload New Design */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Completed Design
                </CardTitle>
                <CardDescription>
                  Current revision: {booking.revisionCount || 0}/2 (Uploading creates revision #{booking.revisionCount || 0})
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {booking.revisionCount >= 3 ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      Maximum revisions (3) reached. No further uploads allowed.
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <input
                        id="design-upload"
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,application/pdf"
                        onChange={(e) => setDesignFile(e.target.files?.[0] || null)}
                        className="hidden"
                        data-testid="input-design-file"
                      />
                      <label htmlFor="design-upload">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => document.getElementById('design-upload')?.click()}
                          data-testid="button-select-design"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {designFile ? designFile.name : 'Select Design File (PNG, JPG, PDF)'}
                        </Button>
                      </label>
                    </div>

                    <Button
                      className="w-full"
                      onClick={handleUploadDesign}
                      disabled={!designFile || uploadDesignMutation.isPending}
                      data-testid="button-upload-design"
                    >
                      {uploadDesignMutation.isPending ? 'Uploading...' : 'Upload & Send for Customer Approval'}
                    </Button>

                    <p className="text-xs text-muted-foreground">
                      Max file size: 10MB. Accepted formats: PNG, JPG, PDF
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Existing Designs */}
            {designs && designs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Revision History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {designs.map((design) => (
                      <div key={design.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">Revision {design.revisionNumber}</Badge>
                            <Badge className={
                              design.status === 'approved' ? 'bg-green-100 text-green-800' :
                              design.status === 'revision_requested' ? 'bg-orange-100 text-orange-800' :
                              'bg-blue-100 text-blue-800'
                            }>
                              {design.status}
                            </Badge>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {new Date(design.uploadedAt || '').toLocaleDateString()}
                          </span>
                        </div>
                        {design.customerFeedback && (
                          <div className="mt-2 bg-muted p-2 rounded text-sm">
                            <Label className="text-xs text-muted-foreground">Customer Feedback:</Label>
                            <p className="mt-1">{design.customerFeedback}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose} data-testid="button-close-modal">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
