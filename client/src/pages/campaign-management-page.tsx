import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Calendar, MoreHorizontal, Plus, ArrowLeft, DollarSign, Users, TrendingUp } from "lucide-react";
import { Link, Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CampaignAvailabilityDialog } from "@/components/campaign-availability-dialog";

import type { Campaign } from "@shared/schema";

// Form validation schema
const campaignFormSchema = z.object({
  name: z.string().min(1, "Campaign name is required").max(100, "Campaign name too long"),
  mailDate: z.string().min(1, "Mail date is required"),
  printDeadline: z.string().min(1, "Print deadline is required"),
  status: z.enum(["planning", "booking_open", "booking_closed", "printed", "mailed", "completed"]).default("planning"),
  baseSlotPrice: z.string().optional(),
  additionalSlotPrice: z.string().optional(),
}).refine((data) => {
  // Validate that print deadline is before mail date
  if (data.printDeadline && data.mailDate) {
    const printDate = new Date(data.printDeadline);
    const mailDate = new Date(data.mailDate);
    return printDate < mailDate;
  }
  return true;
}, {
  message: "Print deadline must be before mail date",
  path: ["printDeadline"],
});

type CampaignFormData = z.infer<typeof campaignFormSchema>;

// Status color mapping
const getStatusColor = (status: string) => {
  switch (status) {
    case "planning": return "secondary";
    case "booking_open": return "default";
    case "booking_closed": return "outline";
    case "printed": return "secondary";
    case "mailed": return "outline";
    case "completed": return "default";
    default: return "secondary";
  }
};

// Status display mapping
const getStatusDisplay = (status: string) => {
  switch (status) {
    case "planning": return "Planning";
    case "booking_open": return "Booking Open";
    case "booking_closed": return "Booking Closed";
    case "printed": return "Printed";
    case "mailed": return "Mailed";
    case "completed": return "Completed";
    default: return status;
  }
};

// Valid status transitions
const getValidNextStatuses = (currentStatus: string): string[] => {
  const transitions: Record<string, string[]> = {
    "planning": ["booking_open"],
    "booking_open": ["booking_closed"],
    "booking_closed": ["printed"],
    "printed": ["mailed"],
    "mailed": ["completed"],
    "completed": []
  };
  return transitions[currentStatus] || [];
};

export default function CampaignManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Redirect non-admin users
  if (user && user.role !== "admin") {
    return <Redirect to="/" />;
  }
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [deleteCampaignId, setDeleteCampaignId] = useState<string | null>(null);
  const [availabilityCampaign, setAvailabilityCampaign] = useState<Campaign | null>(null);
  const [reopenCampaignId, setReopenCampaignId] = useState<string | null>(null);

  // Fetch campaigns
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["/api/campaigns"],
  });

  // Recalculate campaign stats on page load to ensure data is in sync
  useEffect(() => {
    if (user?.role === "admin") {
      apiRequest("POST", "/api/campaigns/recalculate-all")
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
        })
        .catch((error) => {
          console.log("Campaign stats recalculation:", error.message);
        });
    }
  }, [user?.role]);

  // Create form
  const createForm = useForm<CampaignFormData>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      name: "",
      mailDate: "",
      printDeadline: "",
      status: "planning",
      baseSlotPrice: "",
      additionalSlotPrice: "",
    },
  });

  // Edit form
  const editForm = useForm<CampaignFormData>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      name: "",
      mailDate: "",
      printDeadline: "",
      status: "planning",
      baseSlotPrice: "",
      additionalSlotPrice: "",
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CampaignFormData) => 
      apiRequest("POST", "/api/campaigns", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: "Success",
        description: "Campaign created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create campaign",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CampaignFormData> }) =>
      apiRequest("PUT", `/api/campaigns/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      setEditingCampaign(null);
      editForm.reset();
      toast({
        title: "Success",
        description: "Campaign updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update campaign",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/campaigns/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      setDeleteCampaignId(null);
      toast({
        title: "Success",
        description: "Campaign deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete campaign",
        variant: "destructive",
      });
    },
  });

  // Reopen mutation
  const reopenMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/campaigns/${id}/reopen`);
      return await response.json();
    },
    onSuccess: (data: { campaign: Campaign; existingBookingsCount: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      setReopenCampaignId(null);
      toast({
        title: "Success",
        description: `Campaign reopened successfully. ${data.existingBookingsCount} existing ${data.existingBookingsCount === 1 ? 'booking' : 'bookings'}.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reopen campaign",
        variant: "destructive",
      });
    },
  });

  const onCreateSubmit = (data: CampaignFormData) => {
    // Transform prices from dollars string to cents integer
    const transformed = {
      ...data,
      baseSlotPrice: data.baseSlotPrice && data.baseSlotPrice !== "" 
        ? Math.round(parseFloat(data.baseSlotPrice) * 100) 
        : null,
      additionalSlotPrice: data.additionalSlotPrice && data.additionalSlotPrice !== ""
        ? Math.round(parseFloat(data.additionalSlotPrice) * 100)
        : null
    };
    createMutation.mutate(transformed as any);
  };

  const onEditSubmit = (data: CampaignFormData) => {
    if (!editingCampaign) return;
    // Transform prices from dollars string to cents integer
    const transformed = {
      ...data,
      baseSlotPrice: data.baseSlotPrice && data.baseSlotPrice !== "" 
        ? Math.round(parseFloat(data.baseSlotPrice) * 100) 
        : null,
      additionalSlotPrice: data.additionalSlotPrice && data.additionalSlotPrice !== ""
        ? Math.round(parseFloat(data.additionalSlotPrice) * 100)
        : null
    };
    updateMutation.mutate({ id: editingCampaign.id, data: transformed as any });
  };

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    editForm.reset({
      name: campaign.name,
      mailDate: format(new Date(campaign.mailDate), "yyyy-MM-dd"),
      printDeadline: format(new Date(campaign.printDeadline), "yyyy-MM-dd"),
      status: campaign.status as "planning" | "booking_open" | "booking_closed" | "printed" | "mailed" | "completed",
      baseSlotPrice: campaign.baseSlotPrice ? (campaign.baseSlotPrice / 100).toString() : "",
    });
  };

  const handleDelete = (id: string) => {
    setDeleteCampaignId(id);
  };

  const handleStatusUpdate = (campaign: Campaign, newStatus: string) => {
    updateMutation.mutate({ 
      id: campaign.id, 
      data: { status: newStatus as CampaignFormData["status"] }
    });
  };

  const handleReopen = (campaign: Campaign) => {
    setReopenCampaignId(campaign.id);
  };

  // Calculate totals for summary cards
  const totalRevenue = campaigns.reduce((sum: number, campaign: Campaign) => sum + (campaign.revenue || 0), 0);
  const totalSlots = campaigns.reduce((sum: number, campaign: Campaign) => sum + (campaign.bookedSlots || 0), 0);
  const activeCampaigns = campaigns.filter((campaign: Campaign) => 
    ["planning", "booking_open", "booking_closed"].includes(campaign.status)
  ).length;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/admin">
            <Button variant="ghost" size="sm" data-testid="button-back-admin">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold" data-testid="heading-campaign-management">Campaign Management</h1>
            <p className="text-muted-foreground">
              Manage monthly direct mail campaigns and track their progress through the workflow
            </p>
          </div>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-campaign">
              <Plus className="h-4 w-4 mr-2" />
              Add Campaign
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Campaign</DialogTitle>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., December 2024 Holiday Campaign" 
                          data-testid="input-campaign-name"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="mailDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mail Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          data-testid="input-mail-date"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="printDeadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Print Deadline</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          data-testid="input-print-deadline"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="baseSlotPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Slot Price (Optional)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <Input 
                            type="number" 
                            step="0.01"
                            min="0"
                            placeholder="600.00"
                            className="pl-7"
                            data-testid="input-base-slot-price"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <p className="text-sm text-muted-foreground">Price for the first slot (default: $600)</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="additionalSlotPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Slots Price (Optional)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <Input 
                            type="number" 
                            step="0.01"
                            min="0"
                            placeholder="500.00"
                            className="pl-7"
                            data-testid="input-additional-slot-price"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <p className="text-sm text-muted-foreground">Price for slots 2-4 (default: $500)</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-campaign-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="planning">Planning</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                    data-testid="button-cancel-create"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending}
                    data-testid="button-create-campaign"
                  >
                    {createMutation.isPending ? "Creating..." : "Create Campaign"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-revenue">
              ${(totalRevenue / 100).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              From all campaigns
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Slots Booked</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-slots">
              {totalSlots}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all campaigns
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-campaigns">
              {activeCampaigns}
            </div>
            <p className="text-xs text-muted-foreground">
              In progress or planning
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns Table */}
      <Card>
        <CardHeader>
          <CardTitle>Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign Name</TableHead>
                <TableHead>Mail Date</TableHead>
                <TableHead>Print Deadline</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Slots Booked</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign: Campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium" data-testid={`text-campaign-name-${campaign.id}`}>
                    {campaign.name}
                  </TableCell>
                  <TableCell data-testid={`text-mail-date-${campaign.id}`}>
                    <div className="flex items-center">
                      <Calendar className="mr-2 h-4 w-4" />
                      {format(new Date(campaign.mailDate), "MMM dd, yyyy")}
                    </div>
                  </TableCell>
                  <TableCell data-testid={`text-print-deadline-${campaign.id}`}>
                    <div className="flex items-center">
                      <Calendar className="mr-2 h-4 w-4" />
                      {format(new Date(campaign.printDeadline), "MMM dd, yyyy")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(campaign.status)} data-testid={`badge-status-${campaign.id}`}>
                      {getStatusDisplay(campaign.status)}
                    </Badge>
                  </TableCell>
                  <TableCell data-testid={`text-slots-${campaign.id}`}>
                    {campaign.bookedSlots || 0}/{campaign.totalSlots || 0}
                  </TableCell>
                  <TableCell data-testid={`text-revenue-${campaign.id}`}>
                    ${((campaign.revenue || 0) / 100).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0" data-testid={`button-actions-${campaign.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(campaign)} data-testid={`button-edit-${campaign.id}`}>
                          Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setAvailabilityCampaign(campaign)} data-testid={`button-availability-${campaign.id}`}>
                          Manage Availability
                        </DropdownMenuItem>
                        {getValidNextStatuses(campaign.status).length > 0 && (
                          <>
                            {getValidNextStatuses(campaign.status).map((status) => (
                              <DropdownMenuItem 
                                key={status}
                                onClick={() => handleStatusUpdate(campaign, status)}
                                data-testid={`button-status-${status}-${campaign.id}`}
                              >
                                Move to {getStatusDisplay(status)}
                              </DropdownMenuItem>
                            ))}
                          </>
                        )}
                        {["booking_closed", "printed", "mailed", "completed"].includes(campaign.status) && (
                          <DropdownMenuItem 
                            onClick={() => handleReopen(campaign)}
                            className="text-blue-600"
                            data-testid={`button-reopen-${campaign.id}`}
                          >
                            Reopen Campaign
                          </DropdownMenuItem>
                        )}
                        {["planning", "booking_open"].includes(campaign.status) && (
                          <DropdownMenuItem 
                            onClick={() => handleDelete(campaign.id)}
                            className="text-destructive"
                            data-testid={`button-delete-${campaign.id}`}
                          >
                            Delete Campaign
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingCampaign} onOpenChange={(open) => !open && setEditingCampaign(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Campaign</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaign Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Campaign name" 
                        data-testid="input-edit-campaign-name"
                        disabled={editingCampaign && ["booking_closed", "printed", "mailed", "completed"].includes(editingCampaign.status)}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="mailDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mail Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        data-testid="input-edit-mail-date"
                        disabled={editingCampaign && ["booking_closed", "printed", "mailed", "completed"].includes(editingCampaign.status)}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="printDeadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Print Deadline</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        data-testid="input-edit-print-deadline"
                        disabled={editingCampaign && ["booking_closed", "printed", "mailed", "completed"].includes(editingCampaign.status)}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="baseSlotPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Slot Price (Optional)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input 
                          type="number" 
                          step="0.01"
                          min="0"
                          placeholder="600.00"
                          className="pl-7"
                          data-testid="input-edit-base-slot-price"
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <p className="text-sm text-muted-foreground">Price for the first slot (default: $600)</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="additionalSlotPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Slots Price (Optional)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input 
                          type="number" 
                          step="0.01"
                          min="0"
                          placeholder="500.00"
                          className="pl-7"
                          data-testid="input-edit-additional-slot-price"
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <p className="text-sm text-muted-foreground">Price for slots 2-4 (default: $500)</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditingCampaign(null)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateMutation.isPending}
                  data-testid="button-update-campaign"
                >
                  {updateMutation.isPending ? "Updating..." : "Update Campaign"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteCampaignId} onOpenChange={(open) => !open && setDeleteCampaignId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this campaign? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCampaignId && deleteMutation.mutate(deleteCampaignId)}
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reopen Confirmation Dialog */}
      <AlertDialog open={!!reopenCampaignId} onOpenChange={(open) => !open && setReopenCampaignId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reopen Campaign for Booking</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  This will change the campaign status back to "Booking Open" so customers can book additional slots.
                </p>
                {(() => {
                  const campaign = campaigns.find((c: Campaign) => c.id === reopenCampaignId);
                  const isAdvancedStatus = campaign && ["printed", "mailed", "completed"].includes(campaign.status);
                  
                  return isAdvancedStatus ? (
                    <div className="bg-amber-50 border border-amber-300 rounded-md p-3">
                      <p className="text-sm text-amber-900">
                        <strong>⚠️ Warning:</strong> This campaign is marked as "{getStatusDisplay(campaign.status)}". Reopening it will reset the status to "Booking Open". Make sure you want to do this.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                      <p className="text-sm text-blue-900">
                        <strong>Note:</strong> Any existing bookings will remain. New bookings will be added alongside them.
                      </p>
                    </div>
                  );
                })()}
                <p className="text-sm text-muted-foreground">
                  The system will verify that the print deadline hasn't passed before reopening.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-reopen">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => reopenCampaignId && reopenMutation.mutate(reopenCampaignId)}
              data-testid="button-confirm-reopen"
            >
              Reopen Campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Campaign Availability Dialog */}
      {availabilityCampaign && (
        <CampaignAvailabilityDialog
          campaignId={availabilityCampaign.id}
          campaignName={availabilityCampaign.name}
          open={!!availabilityCampaign}
          onOpenChange={(open) => !open && setAvailabilityCampaign(null)}
        />
      )}
    </div>
  );
}