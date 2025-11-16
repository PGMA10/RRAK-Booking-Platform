import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Redirect, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Calendar, DollarSign, Users, Grid, MapPin, Briefcase } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Campaign, Route, Industry, Booking } from "@shared/schema";

// Slot grid data types
type SlotData = {
  routeId: string;
  industryId: string;
  route: Route;
  industry: Industry;
  booking?: Booking;
  status: 'available' | 'booked' | 'pending';
};

type SlotGridResponse = {
  slots: SlotData[];
  summary: {
    totalSlots: number;
    availableSlots: number;
    bookedSlots: number;
    pendingSlots: number;
    totalRevenue: number;
  };
};

// Booking form validation schema
const bookingFormSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  contactEmail: z.string().email("Valid email is required"),
  contactPhone: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingFormSchema>;

export default function SlotGridPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Redirect non-admin users
  if (user && user.role !== "admin") {
    return <Redirect to="/" />;
  }

  // State management
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<SlotData | null>(null);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Form handling
  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      businessName: "",
      contactEmail: "",
      contactPhone: "",
    },
  });

  // Data fetching
  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const { data: slotGrid, isLoading: isLoadingSlots } = useQuery<SlotGridResponse>({
    queryKey: ["/api/slots", selectedCampaignId],
    enabled: !!selectedCampaignId,
  });

  // Mutations
  const createBookingMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/slots", data),
    onSuccess: () => {
      toast({ description: "Slot booked successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/slots", selectedCampaignId] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      setIsBookingDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        description: error.message || "Failed to book slot",
      });
    },
  });

  const deleteBookingMutation = useMutation({
    mutationFn: (bookingId: string) => apiRequest("DELETE", `/api/slots/${bookingId}`),
    onSuccess: () => {
      toast({ description: "Booking cancelled successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/slots", selectedCampaignId] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      setIsViewDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive", 
        description: error.message || "Failed to cancel booking",
      });
    },
  });

  // Event handlers
  const handleSlotClick = (slot: SlotData) => {
    setSelectedSlot(slot);
    
    if (slot.status === 'available') {
      // Open booking dialog for available slots
      form.setValue("businessName", "");
      form.setValue("contactEmail", "");
      form.setValue("contactPhone", "");
      setIsBookingDialogOpen(true);
    } else {
      // Open view/manage dialog for booked slots
      setIsViewDialogOpen(true);
    }
  };

  const handleBookSlot = (data: BookingFormData) => {
    if (!selectedSlot || !selectedCampaignId) return;

    createBookingMutation.mutate({
      campaignId: selectedCampaignId,
      routeId: selectedSlot.routeId,
      industryId: selectedSlot.industryId,
      businessName: data.businessName,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone || "",
      amount: 60000, // $600 in cents
    });
  };

  const handleCancelBooking = () => {
    if (!selectedSlot?.booking) return;
    deleteBookingMutation.mutate(selectedSlot.booking.id);
  };

  // Helper functions
  const getSlotStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 hover:bg-green-200 border-green-300 text-green-800';
      case 'booked':
        return 'bg-red-100 hover:bg-red-200 border-red-300 text-red-800';
      case 'pending':
        return 'bg-yellow-100 hover:bg-yellow-200 border-yellow-300 text-yellow-800';
      default:
        return 'bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-800';
    }
  };

  const formatCurrency = (amountInCents: number) => {
    return `$${(amountInCents / 100).toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/admin">
              <Button variant="outline" size="sm" data-testid="button-back">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Admin
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">
                Slot Management
              </h1>
              <p className="text-muted-foreground" data-testid="text-page-description">
                Manage campaign slot bookings across routes and industries
              </p>
            </div>
          </div>
        </div>

        {/* Campaign Selector */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Campaign Selection
            </CardTitle>
            <CardDescription>
              Choose a campaign to view and manage its slot availability
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
              <SelectTrigger className="w-full md:w-96" data-testid="select-campaign">
                <SelectValue placeholder="Select a campaign to view slots..." />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id} data-testid={`option-campaign-${campaign.id}`}>
                    {campaign.name} - {new Date(campaign.mailDate).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Grid Summary */}
        {slotGrid && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Grid className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Slots</p>
                    <p className="text-2xl font-bold" data-testid="text-total-slots">
                      {slotGrid.summary.totalSlots}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Available</p>
                    <p className="text-2xl font-bold text-green-600" data-testid="text-available-slots">
                      {slotGrid.summary.availableSlots}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Booked</p>
                    <p className="text-2xl font-bold text-red-600" data-testid="text-booked-slots">
                      {slotGrid.summary.bookedSlots}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Revenue</p>
                    <p className="text-2xl font-bold" data-testid="text-total-revenue">
                      {formatCurrency(slotGrid.summary.totalRevenue)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Slot Grid */}
        {selectedCampaignId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Grid className="h-5 w-5" />
                Slot Availability Grid
              </CardTitle>
              <CardDescription>
                64 slots total: 4 routes × 16 industries. Click on slots to book or manage.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingSlots ? (
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading slot grid...</p>
                  </div>
                </div>
              ) : slotGrid ? (
                <div className="overflow-x-auto">
                  <div className="min-w-[800px]">
                    {(() => {
                      const uniqueRoutes = slotGrid.slots.reduce((routes: Route[], slot) => {
                        if (!routes.find(r => r.id === slot.route.id)) {
                          routes.push(slot.route);
                        }
                        return routes;
                      }, []);
                      const gridTemplateColumns = `minmax(150px, auto) repeat(${uniqueRoutes.length}, 1fr)`;
                      
                      return (
                        <>
                          {/* Route headers */}
                          <div className="grid gap-2 mb-4" style={{ gridTemplateColumns }}>
                            <div className="text-sm font-medium text-muted-foreground">Industries</div>
                            {uniqueRoutes.map((route) => (
                              <div key={route.id} className="text-center">
                                <div className="text-sm font-medium text-foreground flex items-center justify-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {route.zipCode}
                                </div>
                                <div className="text-xs text-muted-foreground">{route.name}</div>
                              </div>
                            ))}
                          </div>
                          
                          {/* Grid rows */}
                          {slotGrid.slots
                            .reduce((industries: Industry[], slot) => {
                              if (!industries.find(i => i.id === slot.industry.id)) {
                                industries.push(slot.industry);
                              }
                              return industries;
                            }, [])
                            .map((industry) => (
                              <div key={industry.id} className="grid gap-2 mb-2" style={{ gridTemplateColumns }}>
                          {/* Industry label */}
                          <div className="flex items-center text-sm font-medium text-foreground">
                            <Briefcase className="h-3 w-3 mr-1" />
                            <span className="truncate">{industry.name}</span>
                          </div>
                          
                          {/* Slots for this industry across all routes */}
                          {slotGrid.slots
                            .reduce((routes: Route[], slot) => {
                              if (!routes.find(r => r.id === slot.route.id)) {
                                routes.push(slot.route);
                              }
                              return routes;
                            }, [])
                            .map((route) => {
                              const slot = slotGrid.slots.find(
                                s => s.routeId === route.id && s.industryId === industry.id
                              );
                              
                              if (!slot) return <div key={route.id} className="h-16"></div>;
                              
                              return (
                                <Button
                                  key={`${slot.routeId}-${slot.industryId}`}
                                  variant="outline"
                                  className={`h-16 p-2 text-xs font-medium cursor-pointer transition-colors ${getSlotStatusColor(slot.status)}`}
                                  onClick={() => handleSlotClick(slot)}
                                  data-testid={`slot-${slot.route.zipCode}-${slot.industry.name.replace(/\s+/g, '-').toLowerCase()}`}
                                >
                                  <div className="text-center w-full">
                                    {slot.status === 'available' ? (
                                      <>
                                        <div className="font-bold">$600</div>
                                        <div className="text-xs opacity-75">Available</div>
                                      </>
                                    ) : (
                                      <>
                                        <div className="font-bold truncate">
                                          {slot.booking?.businessName || 'Booked'}
                                        </div>
                                        <div className="text-xs opacity-75 capitalize">
                                          {slot.status}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </Button>
                              );
                            })}
                        </div>
                      ))}
                        </>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <Grid className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">No slot data available</p>
                    <p className="text-sm text-muted-foreground">Select a campaign to view slot availability</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Booking Dialog */}
        <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
          <DialogContent data-testid="dialog-book-slot">
            <DialogHeader>
              <DialogTitle>Book Slot</DialogTitle>
              <DialogDescription>
                Book this slot for {selectedSlot?.route.name} ({selectedSlot?.route.zipCode}) - {selectedSlot?.industry.name}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleBookSlot)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter business name" 
                          {...field} 
                          data-testid="input-business-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="Enter contact email" 
                          {...field} 
                          data-testid="input-contact-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="tel" 
                          placeholder="Enter contact phone" 
                          {...field} 
                          data-testid="input-contact-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsBookingDialogOpen(false)}
                    data-testid="button-cancel-booking"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createBookingMutation.isPending}
                    data-testid="button-confirm-booking"
                  >
                    {createBookingMutation.isPending ? "Booking..." : "Book Slot ($600)"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* View/Manage Booking Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent data-testid="dialog-view-booking">
            <DialogHeader>
              <DialogTitle>Slot Details</DialogTitle>
              <DialogDescription>
                {selectedSlot?.route.name} ({selectedSlot?.route.zipCode}) - {selectedSlot?.industry.name}
              </DialogDescription>
            </DialogHeader>
            {selectedSlot?.booking && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Business Name</p>
                    <p className="font-medium" data-testid="text-booking-business-name">
                      {selectedSlot.booking.businessName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <Badge variant="secondary" data-testid="badge-booking-status">
                      {selectedSlot.booking.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Contact Email</p>
                    <p className="font-medium" data-testid="text-booking-email">
                      {selectedSlot.booking.contactEmail}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Amount</p>
                    <p className="font-medium" data-testid="text-booking-amount">
                      {formatCurrency(selectedSlot.booking.amount)}
                    </p>
                  </div>
                  {selectedSlot.booking.contactPhone && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Contact Phone</p>
                      <p className="font-medium" data-testid="text-booking-phone">
                        {selectedSlot.booking.contactPhone}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Booked Date</p>
                    <p className="font-medium" data-testid="text-booking-date">
                      {selectedSlot.booking.createdAt ? new Date(selectedSlot.booking.createdAt).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsViewDialogOpen(false)}
                data-testid="button-close-details"
              >
                Close
              </Button>
              <Button 
                type="button" 
                variant="destructive" 
                onClick={handleCancelBooking}
                disabled={deleteBookingMutation.isPending}
                data-testid="button-cancel-slot-booking"
              >
                {deleteBookingMutation.isPending ? "Cancelling..." : "Cancel Booking"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}