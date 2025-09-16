import { useState } from "react";
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

import type { Campaign } from "@shared/schema";

// Form validation schema
const campaignFormSchema = z.object({
  name: z.string().min(1, "Campaign name is required").max(100, "Campaign name too long"),
  mailDate: z.string().min(1, "Mail date is required"),
  status: z.enum(["planning", "booking_open", "booking_closed", "printed", "mailed", "completed"]).default("planning"),
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

  // Fetch campaigns
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["/api/campaigns"],
  });

  // Create form
  const createForm = useForm<CampaignFormData>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      name: "",
      mailDate: "",
      status: "planning",
    },
  });

  // Edit form
  const editForm = useForm<CampaignFormData>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      name: "",
      mailDate: "",
      status: "planning",
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

  const onCreateSubmit = (data: CampaignFormData) => {
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: CampaignFormData) => {
    if (!editingCampaign) return;
    updateMutation.mutate({ id: editingCampaign.id, data });
  };

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    editForm.reset({
      name: campaign.name,
      mailDate: format(new Date(campaign.mailDate), "yyyy-MM-dd"),
      status: campaign.status as "planning" | "booking_open" | "booking_closed" | "printed" | "mailed" | "completed",
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
                  <TableCell>
                    <Badge variant={getStatusColor(campaign.status)} data-testid={`badge-status-${campaign.id}`}>
                      {getStatusDisplay(campaign.status)}
                    </Badge>
                  </TableCell>
                  <TableCell data-testid={`text-slots-${campaign.id}`}>
                    {campaign.bookedSlots || 0}/{campaign.totalSlots || 64}
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
    </div>
  );
}