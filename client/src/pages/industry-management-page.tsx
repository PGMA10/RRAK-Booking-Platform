import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertIndustrySchema } from "@shared/schema";
import type { Industry, InsertIndustry } from "@shared/schema";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, Link } from "wouter";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Briefcase, ArrowLeft } from "lucide-react";

const industryFormSchema = insertIndustrySchema.extend({
  name: z.string().min(1, "Industry name is required").max(100, "Name must be less than 100 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});

type IndustryFormData = z.infer<typeof industryFormSchema>;

export default function IndustryManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Redirect non-admin users
  if (user && user.role !== "admin") {
    return <Redirect to="/" />;
  }

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingIndustry, setEditingIndustry] = useState<Industry | null>(null);

  const { data: industries = [], isLoading } = useQuery<Industry[]>({
    queryKey: ["/api/industries"],
  });

  const createForm = useForm<IndustryFormData>({
    resolver: zodResolver(industryFormSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "active",
      icon: "fas fa-briefcase", // Default icon
    },
  });

  const editForm = useForm<IndustryFormData>({
    resolver: zodResolver(industryFormSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "active",
      icon: "fas fa-briefcase",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: IndustryFormData) => apiRequest("POST", "/api/industries", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/industries"] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: "Success",
        description: "Industry created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create industry",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<IndustryFormData> }) =>
      apiRequest("PUT", `/api/industries/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/industries"] });
      setEditingIndustry(null);
      editForm.reset();
      toast({
        title: "Success",
        description: "Industry updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update industry",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/industries/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/industries"] });
      toast({
        title: "Success",
        description: "Industry deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete industry",
        variant: "destructive",
      });
    },
  });

  const onCreateSubmit = (data: IndustryFormData) => {
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: IndustryFormData) => {
    if (!editingIndustry) return;
    updateMutation.mutate({ id: editingIndustry.id, data });
  };

  const handleEdit = (industry: Industry) => {
    setEditingIndustry(industry);
    editForm.reset({
      name: industry.name,
      description: industry.description || "",
      status: industry.status as "active" | "inactive",
      icon: industry.icon,
    });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

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
      <Link href="/admin">
        <Button variant="outline" size="sm" data-testid="button-back-to-dashboard">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </Link>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-industry-management">Industry Management</h1>
          <p className="text-muted-foreground">
            Manage industry categories for slot bookings
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-industry">
              <Plus className="w-4 h-4 mr-2" />
              Add Industry
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Industry</DialogTitle>
              <DialogDescription>
                Add a new industry category to the system
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Financial Advisors" {...field} data-testid="input-create-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Description of businesses in this category..."
                          {...field}
                          value={field.value || ""}
                          data-testid="input-create-description"
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
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-create-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
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
                    data-testid="button-create-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    data-testid="button-create-submit"
                  >
                    {createMutation.isPending ? "Creating..." : "Create Industry"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Briefcase className="w-5 h-5 mr-2" />
            Industries
          </CardTitle>
          <CardDescription>
            {industries.length} industry categor{industries.length !== 1 ? "ies" : "y"} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {industries.map((industry: Industry) => (
                <TableRow key={industry.id} data-testid={`row-industry-${industry.id}`}>
                  <TableCell className="font-medium" data-testid={`text-name-${industry.id}`}>
                    <div className="flex items-center space-x-2">
                      <i className={`${industry.icon} text-muted-foreground`} />
                      <span>{industry.name}</span>
                    </div>
                  </TableCell>
                  <TableCell data-testid={`text-description-${industry.id}`}>
                    {industry.description || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={industry.status === "active" ? "default" : "secondary"}
                      data-testid={`badge-status-${industry.id}`}
                    >
                      {industry.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Dialog
                        open={editingIndustry?.id === industry.id}
                        onOpenChange={(open) => !open && setEditingIndustry(null)}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(industry)}
                            data-testid={`button-edit-${industry.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Industry</DialogTitle>
                            <DialogDescription>
                              Update industry information
                            </DialogDescription>
                          </DialogHeader>
                          <Form {...editForm}>
                            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                              <FormField
                                control={editForm.control}
                                name="name"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Industry Name</FormLabel>
                                    <FormControl>
                                      <Input {...field} data-testid="input-edit-name" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={editForm.control}
                                name="description"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                      <Textarea {...field} value={field.value || ""} data-testid="input-edit-description" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={editForm.control}
                                name="status"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Status</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                        <SelectTrigger data-testid="select-edit-status">
                                          <SelectValue />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
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
                                  onClick={() => setEditingIndustry(null)}
                                  data-testid="button-edit-cancel"
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="submit"
                                  disabled={updateMutation.isPending}
                                  data-testid="button-edit-submit"
                                >
                                  {updateMutation.isPending ? "Updating..." : "Update Industry"}
                                </Button>
                              </div>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            data-testid={`button-delete-${industry.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Industry</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete the industry "{industry.name}"?
                              This action cannot be undone and may affect existing bookings.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel data-testid={`button-delete-cancel-${industry.id}`}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(industry.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              data-testid={`button-delete-confirm-${industry.id}`}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}