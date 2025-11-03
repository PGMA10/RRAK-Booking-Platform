import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  DollarSign, 
  Calendar, 
  Package, 
  Tag,
  Plus,
  X,
  StickyNote
} from "lucide-react";

interface CustomerDetails {
  customer: {
    id: string;
    email: string;
    username: string;
    businessName?: string;
    phone?: string;
    createdAt: string;
  };
  lifetimeValue: number;
  bookingCount: number;
  lastBookingDate?: string;
  tags: string[];
  notes: Array<{
    id: string;
    note: string;
    createdBy: string;
    createdByName: string;
    createdAt: string;
  }>;
  bookings: Array<{
    id: string;
    campaignId: string;
    amount: number;
    amountPaid?: number;
    status: string;
    paymentStatus: string;
    createdAt: string;
    paidAt?: string;
    route?: { name: string };
    industry?: { name: string };
    campaign?: { name: string };
  }>;
}

export default function CRMCustomerDetailPage() {
  const params = useParams();
  const customerId = params.id;
  const { toast } = useToast();
  const [newNote, setNewNote] = useState("");
  const [newTag, setNewTag] = useState("");

  const { data: details, isLoading, error } = useQuery<CustomerDetails>({
    queryKey: ['/api/admin/crm/customer', customerId],
    enabled: !!customerId,
  });

  const addNoteMutation = useMutation({
    mutationFn: async (note: string) => {
      return apiRequest('POST', `/api/admin/crm/notes`, { customerId, note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/crm/customer', customerId] });
      setNewNote("");
      toast({ title: "Note added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add note", variant: "destructive" });
    },
  });

  const addTagMutation = useMutation({
    mutationFn: async (tag: string) => {
      return apiRequest('POST', `/api/admin/crm/tags`, { customerId, tag });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/crm/customer', customerId] });
      setNewTag("");
      toast({ title: "Tag added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add tag", variant: "destructive" });
    },
  });

  const removeTagMutation = useMutation({
    mutationFn: async (tag: string) => {
      return apiRequest('DELETE', `/api/admin/crm/tags`, { customerId, tag });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/crm/customer', customerId] });
      toast({ title: "Tag removed successfully" });
    },
    onError: () => {
      toast({ title: "Failed to remove tag", variant: "destructive" });
    },
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6 space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Customer Not Found</CardTitle>
            <CardDescription>The requested customer could not be found.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/crm">
              <Button className="w-full">Back to CRM</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { customer } = details;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/crm">
              <Button variant="outline" size="icon" data-testid="button-back-to-crm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground" data-testid="heading-customer-name">
                {customer.businessName || customer.username}
              </h1>
              <p className="text-muted-foreground mt-1">Customer since {formatDate(customer.createdAt)}</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-chart-1/10 rounded-lg">
                  <DollarSign className="h-6 w-6 text-chart-1" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Lifetime Value</p>
                  <p className="text-2xl font-bold" data-testid="text-lifetime-value">
                    ${details.lifetimeValue.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-chart-2/10 rounded-lg">
                  <Package className="h-6 w-6 text-chart-2" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Bookings</p>
                  <p className="text-2xl font-bold" data-testid="text-booking-count">
                    {details.bookingCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-chart-3/10 rounded-lg">
                  <Calendar className="h-6 w-6 text-chart-3" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Booking</p>
                  <p className="text-2xl font-bold">
                    {formatDate(details.lastBookingDate)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Contact Info & Tags */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm" data-testid="text-customer-email">{customer.email}</span>
                </div>
                {customer.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm" data-testid="text-customer-phone">{customer.phone}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Tags
                </CardTitle>
                <CardDescription>Organize and categorize this customer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {details.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        onClick={() => removeTagMutation.mutate(tag)}
                        className="ml-1 hover:text-destructive"
                        data-testid={`button-remove-tag-${tag}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {details.tags.length === 0 && (
                    <p className="text-sm text-muted-foreground">No tags yet</p>
                  )}
                </div>
                <Separator />
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newTag.trim()) {
                        addTagMutation.mutate(newTag.trim());
                      }
                    }}
                    data-testid="input-new-tag"
                  />
                  <Button
                    size="icon"
                    onClick={() => newTag.trim() && addTagMutation.mutate(newTag.trim())}
                    disabled={!newTag.trim() || addTagMutation.isPending}
                    data-testid="button-add-tag"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <StickyNote className="h-5 w-5" />
                  Notes
                </CardTitle>
                <CardDescription>Internal notes about this customer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {details.notes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No notes yet</p>
                  ) : (
                    details.notes.map((note) => (
                      <div key={note.id} className="p-3 bg-muted rounded-lg space-y-1">
                        <p className="text-sm">{note.note}</p>
                        <p className="text-xs text-muted-foreground">
                          By {note.createdByName} • {formatDateTime(note.createdAt)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                <Separator />
                <div className="space-y-2">
                  <Textarea
                    placeholder="Add a note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={3}
                    data-testid="textarea-new-note"
                  />
                  <Button
                    onClick={() => newNote.trim() && addNoteMutation.mutate(newNote.trim())}
                    disabled={!newNote.trim() || addNoteMutation.isPending}
                    className="w-full"
                    data-testid="button-add-note"
                  >
                    Add Note
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Booking History */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Booking History</CardTitle>
                <CardDescription>
                  All bookings made by this customer
                </CardDescription>
              </CardHeader>
              <CardContent>
                {details.bookings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No bookings yet
                  </div>
                ) : (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Campaign</TableHead>
                          <TableHead>Route & Industry</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {details.bookings.map((booking) => (
                          <TableRow key={booking.id}>
                            <TableCell className="font-medium">
                              {booking.campaign?.name || 'N/A'}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>{booking.route?.name || 'N/A'}</div>
                                <div className="text-muted-foreground">{booking.industry?.name || 'N/A'}</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              ${(booking.amountPaid || booking.amount).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <Badge 
                                  variant={booking.status === 'confirmed' ? 'default' : 'secondary'}
                                >
                                  {booking.status}
                                </Badge>
                                <Badge 
                                  variant={booking.paymentStatus === 'paid' ? 'default' : 'outline'}
                                  className="ml-1"
                                >
                                  {booking.paymentStatus}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              {formatDate(booking.paidAt || booking.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
