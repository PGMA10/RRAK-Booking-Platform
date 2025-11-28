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

// Slot grid data types - 16 numbered slots per route
type SlotData = {
  slotIndex: number;
  routeId: string;
  route: Route;
  booking?: Booking;
  industry?: Industry;
  subcategoryLabel?: string;
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

// Subcategory type
type IndustrySubcategory = {
  id: string;
  industryId: string;
  name: string;
  label: string;
};

// Booking form validation schema - now includes industry/subcategory selection
const bookingFormSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  contactEmail: z.string().email("Valid email is required"),
  contactPhone: z.string().optional(),
  industryId: z.string().min(1, "Industry is required"),
  industrySubcategoryId: z.string().optional(),
  otherDescription: z.string().optional(),
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
      industryId: "",
      industrySubcategoryId: "",
      otherDescription: "",
    },
  });

  // Watch industryId for subcategory loading
  const selectedIndustryId = form.watch("industryId");

  // Data fetching
  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const { data: slotGrid, isLoading: isLoadingSlots } = useQuery<SlotGridResponse>({
    queryKey: ["/api/slots", selectedCampaignId],
    enabled: !!selectedCampaignId,
  });

  // Fetch industries for the booking form
  const { data: industries = [] } = useQuery<Industry[]>({
    queryKey: ["/api/industries"],
  });

  // Fetch subcategories for the selected industry
  const { data: subcategories = [] } = useQuery<IndustrySubcategory[]>({
    queryKey: ["/api/industries", selectedIndustryId, "subcategories"],
    enabled: !!selectedIndustryId,
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
      form.reset({
        businessName: "",
        contactEmail: "",
        contactPhone: "",
        industryId: "",
        industrySubcategoryId: "",
        otherDescription: "",
      });
      setIsBookingDialogOpen(true);
    } else {
      // Open view/manage dialog for booked/pending slots
      setIsViewDialogOpen(true);
    }
  };

  const handleBookSlot = (data: BookingFormData) => {
    if (!selectedSlot || !selectedCampaignId) return;

    // Get subcategory label if selected
    const selectedSubcategory = subcategories.find(s => s.id === data.industrySubcategoryId);
    
    createBookingMutation.mutate({
      campaignId: selectedCampaignId,
      routeId: selectedSlot.routeId,
      industryId: data.industryId,
      industrySubcategoryId: data.industrySubcategoryId || null,
      industrySubcategoryLabel: selectedSubcategory?.label || null,
      businessName: data.businessName,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone || "",
      otherDescription: data.otherDescription || null,
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
                16 slots per route. Click on booked slots to view details. Available slots are open for customer bookings.
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
              ) : slotGrid && slotGrid.slots.length > 0 ? (
                <div className="overflow-x-auto">
                  <div className="min-w-[800px]">
                    {(() => {
                      // Get unique routes from slots
                      const uniqueRoutes = slotGrid.slots.reduce((routes: Route[], slot) => {
                        if (!routes.find(r => r.id === slot.route.id)) {
                          routes.push(slot.route);
                        }
                        return routes;
                      }, []);
                      const gridTemplateColumns = `minmax(80px, auto) repeat(${uniqueRoutes.length}, 1fr)`;
                      
                      // Get slots for a specific route and slot index
                      const getSlot = (routeId: string, slotIndex: number) => {
                        return slotGrid.slots.find(s => s.routeId === routeId && s.slotIndex === slotIndex);
                      };
                      
                      // Get unique slot indices (should be 1-16)
                      const slotIndices = [...new Set(slotGrid.slots.map(s => s.slotIndex))].sort((a, b) => a - b);
                      
                      return (
                        <>
                          {/* Route headers */}
                          <div className="grid gap-2 mb-4" style={{ gridTemplateColumns }}>
                            <div className="text-sm font-medium text-muted-foreground">Slot #</div>
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
                          
                          {/* Numbered slot rows from API */}
                          {slotIndices.map((slotIndex) => (
                            <div key={slotIndex} className="grid gap-2 mb-2" style={{ gridTemplateColumns }}>
                              {/* Slot number label */}
                              <div className="flex items-center justify-center text-sm font-medium text-muted-foreground">
                                #{slotIndex}
                              </div>
                              
                              {/* Slots for this row across all routes */}
                              {uniqueRoutes.map((route) => {
                                const slot = getSlot(route.id, slotIndex);
                                
                                if (!slot) {
                                  return (
                                    <div
                                      key={`${route.id}-slot-${slotIndex}`}
                                      className="h-auto min-h-16 p-2 text-xs font-medium border rounded-md bg-gray-100 border-gray-300 text-gray-500 flex items-center justify-center"
                                      data-testid={`slot-${route.zipCode}-${slotIndex}`}
                                    >
                                      <div className="text-center w-full">
                                        <div className="text-xs">N/A</div>
                                      </div>
                                    </div>
                                  );
                                }
                                
                                if (slot.booking) {
                                  return (
                                    <Button
                                      key={`${route.id}-slot-${slotIndex}`}
                                      variant="outline"
                                      className={`h-auto min-h-16 p-2 text-xs font-medium cursor-pointer transition-colors ${getSlotStatusColor(slot.status)}`}
                                      onClick={() => handleSlotClick(slot)}
                                      data-testid={`slot-${route.zipCode}-${slotIndex}`}
                                    >
                                      <div className="text-center w-full">
                                        <div className="font-bold truncate mb-1">
                                          {slot.booking.businessName || 'Booked'}
                                        </div>
                                        <div className="text-[10px] mb-1 px-1 py-0.5 bg-background/50 rounded border border-current/20">
                                          {slot.industry?.name || 'Industry'}{slot.subcategoryLabel ? ` → ${slot.subcategoryLabel}` : ''}
                                        </div>
                                        <div className="text-xs opacity-75 capitalize">
                                          {slot.status}
                                        </div>
                                      </div>
                                    </Button>
                                  );
                                }
                                
                                return (
                                  <Button
                                    key={`${route.id}-slot-${slotIndex}`}
                                    variant="outline"
                                    className="h-auto min-h-16 p-2 text-xs font-medium cursor-pointer transition-colors bg-green-100 hover:bg-green-200 border-green-300 text-green-800"
                                    onClick={() => handleSlotClick(slot)}
                                    data-testid={`slot-${route.zipCode}-${slotIndex}`}
                                  >
                                    <div className="text-center w-full">
                                      <div className="font-bold">$600</div>
                                      <div className="text-xs opacity-75">Available</div>
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
                    <p className="text-lg font-medium text-muted-foreground">No slots configured</p>
                    <p className="text-sm text-muted-foreground mt-2">Configure routes and industries for this campaign</p>
                    <p className="text-sm text-muted-foreground">Go to Campaign Management → click ⋮ menu → "Manage Availability"</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Booking Dialog */}
        <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
          <DialogContent data-testid="dialog-book-slot" className="max-w-md">
            <DialogHeader>
              <DialogTitle>Book Slot #{selectedSlot?.slotIndex}</DialogTitle>
              <DialogDescription>
                Book this slot for {selectedSlot?.route.name} ({selectedSlot?.route.zipCode})
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
                
                {/* Industry Selection */}
                <FormField
                  control={form.control}
                  name="industryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Reset subcategory when industry changes
                          form.setValue("industrySubcategoryId", "");
                          form.setValue("otherDescription", "");
                        }} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-industry">
                            <SelectValue placeholder="Select an industry" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {industries.map((industry) => (
                            <SelectItem key={industry.id} value={industry.id}>
                              {industry.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Subcategory Selection - only show if industry has subcategories */}
                {selectedIndustryId && subcategories.length > 0 && (
                  <FormField
                    control={form.control}
                    name="industrySubcategoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Specialization</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-subcategory">
                              <SelectValue placeholder="Select a specialization" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {subcategories.map((subcategory) => (
                              <SelectItem key={subcategory.id} value={subcategory.id}>
                                {subcategory.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Other Description - only show for "Other" industry */}
                {selectedIndustryId && industries.find(i => i.id === selectedIndustryId)?.name === "Other" && (
                  <FormField
                    control={form.control}
                    name="otherDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Type Description</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Describe your business type" 
                            {...field} 
                            data-testid="input-other-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsBookingDialogOpen(false)}
                    data-testid="button-cancel-dialog"
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
              <DialogTitle>Slot #{selectedSlot?.slotIndex} Details</DialogTitle>
              <DialogDescription>
                {selectedSlot?.route.name} ({selectedSlot?.route.zipCode})
                {selectedSlot?.industry && ` - ${selectedSlot.industry.name}`}
                {selectedSlot?.subcategoryLabel && (
                  <span className="ml-1">→ {selectedSlot.subcategoryLabel}</span>
                )}
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
                  {selectedSlot.subcategoryLabel && (
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-muted-foreground">Industry Category</p>
                      <p className="font-medium" data-testid="text-booking-subcategory">
                        {selectedSlot.industry?.name || 'Industry'} → {selectedSlot.subcategoryLabel}
                      </p>
                    </div>
                  )}
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