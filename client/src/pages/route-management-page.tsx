import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertRouteSchema } from "@shared/schema";
import type { Route, InsertRoute } from "@shared/schema";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";

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
import { Plus, Pencil, Trash2, MapPin } from "lucide-react";

const routeFormSchema = insertRouteSchema.extend({
  householdCount: z.coerce.number().int().min(1, "Household count must be at least 1"),
});

type RouteFormData = z.infer<typeof routeFormSchema>;

export default function RouteManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Redirect non-admin users
  if (user && user.role !== "admin") {
    return <Redirect to="/" />;
  }
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);

  const { data: routes = [], isLoading } = useQuery<Route[]>({
    queryKey: ["/api/routes"],
  });

  const createForm = useForm<RouteFormData>({
    resolver: zodResolver(routeFormSchema),
    defaultValues: {
      zipCode: "",
      name: "",
      description: "",
      householdCount: 0,
      status: "active",
    },
  });

  const editForm = useForm<RouteFormData>({
    resolver: zodResolver(routeFormSchema),
    defaultValues: {
      zipCode: "",
      name: "",
      description: "",
      householdCount: 0,
      status: "active",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: RouteFormData) => apiRequest("/api/routes", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routes"] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: "Success",
        description: "Route created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create route",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RouteFormData> }) =>
      apiRequest(`/api/routes/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routes"] });
      setEditingRoute(null);
      editForm.reset();
      toast({
        title: "Success",
        description: "Route updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update route",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/routes/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routes"] });
      toast({
        title: "Success",
        description: "Route deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete route",
        variant: "destructive",
      });
    },
  });

  const onCreateSubmit = (data: RouteFormData) => {
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: RouteFormData) => {
    if (!editingRoute) return;
    updateMutation.mutate({ id: editingRoute.id, data });
  };

  const handleEdit = (route: Route) => {
    setEditingRoute(route);
    editForm.reset({
      zipCode: route.zipCode,
      name: route.name,
      description: route.description || "",
      householdCount: route.householdCount,
      status: route.status,
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-route-management">Route Management</h1>
          <p className="text-muted-foreground">
            Manage delivery routes and their coverage areas
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-route">
              <Plus className="w-4 h-4 mr-2" />
              Add Route
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Route</DialogTitle>
              <DialogDescription>
                Add a new delivery route to the system
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zip Code</FormLabel>
                      <FormControl>
                        <Input placeholder="99502" {...field} data-testid="input-create-zipcode" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Downtown/Midtown" {...field} data-testid="input-create-name" />
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
                          placeholder="Area description..."
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
                  name="householdCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Household Count</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-create-household-count"
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
                    {createMutation.isPending ? "Creating..." : "Create Route"}
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
            <MapPin className="w-5 h-5 mr-2" />
            Routes
          </CardTitle>
          <CardDescription>
            {routes.length} route{routes.length !== 1 ? "s" : ""} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zip Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Households</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routes.map((route: Route) => (
                <TableRow key={route.id} data-testid={`row-route-${route.id}`}>
                  <TableCell className="font-mono" data-testid={`text-zipcode-${route.id}`}>
                    {route.zipCode}
                  </TableCell>
                  <TableCell data-testid={`text-name-${route.id}`}>{route.name}</TableCell>
                  <TableCell data-testid={`text-description-${route.id}`}>
                    {route.description || "-"}
                  </TableCell>
                  <TableCell data-testid={`text-household-count-${route.id}`}>
                    {route.householdCount.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={route.status === "active" ? "default" : "secondary"}
                      data-testid={`badge-status-${route.id}`}
                    >
                      {route.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Dialog
                        open={editingRoute?.id === route.id}
                        onOpenChange={(open) => !open && setEditingRoute(null)}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(route)}
                            data-testid={`button-edit-${route.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Route</DialogTitle>
                            <DialogDescription>
                              Update route information
                            </DialogDescription>
                          </DialogHeader>
                          <Form {...editForm}>
                            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                              <FormField
                                control={editForm.control}
                                name="zipCode"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Zip Code</FormLabel>
                                    <FormControl>
                                      <Input {...field} data-testid="input-edit-zipcode" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={editForm.control}
                                name="name"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Name</FormLabel>
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
                                name="householdCount"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Household Count</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        {...field}
                                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                        data-testid="input-edit-household-count"
                                      />
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
                                  onClick={() => setEditingRoute(null)}
                                  data-testid="button-edit-cancel"
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="submit"
                                  disabled={updateMutation.isPending}
                                  data-testid="button-edit-submit"
                                >
                                  {updateMutation.isPending ? "Updating..." : "Update Route"}
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
                            data-testid={`button-delete-${route.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Route</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete the route "{route.name}" ({route.zipCode})?
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel data-testid={`button-delete-cancel-${route.id}`}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(route.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              data-testid={`button-delete-confirm-${route.id}`}
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