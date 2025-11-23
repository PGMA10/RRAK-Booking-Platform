import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/navigation";
import { DemoBanner } from "@/components/demo-banner";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Bell, Users, Filter } from "lucide-react";
import { Redirect } from "wouter";
import { format } from "date-fns";
import type { WaitlistEntryWithDetails, Campaign, Route } from "@shared/schema";

export default function AdminWaitlistPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [isNotifyDialogOpen, setIsNotifyDialogOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [sendInApp, setSendInApp] = useState(true);
  
  const [filterCampaignId, setFilterCampaignId] = useState<string>("all");
  const [filterRouteId, setFilterRouteId] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  if (!user || user.role !== "admin") {
    return <Redirect to="/" />;
  }

  // Build query params for server-side filtering
  const queryParams = new URLSearchParams();
  if (filterCampaignId !== "all") queryParams.append("campaignId", filterCampaignId);
  if (filterRouteId !== "all") queryParams.append("routeId", filterRouteId);
  if (filterStatus !== "all") queryParams.append("status", filterStatus);
  const queryString = queryParams.toString();

  const { data: waitlistEntries, isLoading } = useQuery<WaitlistEntryWithDetails[]>({
    queryKey: ['/api/admin/waitlist', { filterCampaignId, filterRouteId, filterStatus }],
    queryFn: async () => {
      const url = queryString ? `/api/admin/waitlist?${queryString}` : '/api/admin/waitlist';
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch waitlist entries");
      return response.json();
    },
    refetchInterval: 30000,
  });

  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ['/api/campaigns'],
  });

  const { data: routes = [] } = useQuery<Route[]>({
    queryKey: ['/api/routes'],
  });

  const notifyMutation = useMutation({
    mutationFn: async ({ entryIds, message, sendEmail, sendInApp }: { 
      entryIds: string[]; 
      message: string; 
      sendEmail: boolean; 
      sendInApp: boolean;
    }) => {
      const data = await apiRequest('POST', '/api/admin/waitlist/notify', {
        entryIds,
        message,
        sendEmail,
        sendInApp,
      });
      return data;
    },
    onSuccess: (data: any) => {
      const notifiedCount = data.notifiedCount || 0;
      queryClient.invalidateQueries({ queryKey: ['/api/admin/waitlist'] });
      toast({
        title: "Notifications sent",
        description: data.message || `Successfully notified ${notifiedCount} customer${notifiedCount !== 1 ? 's' : ''}`,
      });
      setIsNotifyDialogOpen(false);
      setSelectedEntries(new Set());
      setNotificationMessage("");
      setSendEmail(true);
      setSendInApp(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send notifications",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Server-side filtering is now handled by query params, no need for client-side filtering
  const displayedEntries = waitlistEntries || [];

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEntries(new Set(displayedEntries.map((e: WaitlistEntryWithDetails) => e.id)));
    } else {
      setSelectedEntries(new Set());
    }
  };

  const handleSelectEntry = (entryId: string, checked: boolean) => {
    const newSelected = new Set(selectedEntries);
    if (checked) {
      newSelected.add(entryId);
    } else {
      newSelected.delete(entryId);
    }
    setSelectedEntries(newSelected);
  };

  const handleNotifySelected = () => {
    if (selectedEntries.size === 0) return;
    setIsNotifyDialogOpen(true);
  };

  const handleSubmitNotification = () => {
    if (!notificationMessage.trim()) {
      toast({
        title: "Message required",
        description: "Please enter a notification message",
        variant: "destructive",
      });
      return;
    }

    if (!sendEmail && !sendInApp) {
      toast({
        title: "Channel required",
        description: "Please select at least one notification channel",
        variant: "destructive",
      });
      return;
    }

    notifyMutation.mutate({
      entryIds: Array.from(selectedEntries),
      message: notificationMessage,
      sendEmail,
      sendInApp,
    });
  };

  const getStatusBadge = (status: string, entryId: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20" data-testid={`badge-status-${entryId}`}>Active</Badge>;
      case "notified":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20" data-testid={`badge-status-${entryId}`}>Notified</Badge>;
      case "converted":
        return <Badge variant="secondary" data-testid={`badge-status-${entryId}`}>Converted</Badge>;
      default:
        return <Badge variant="outline" data-testid={`badge-status-${entryId}`}>{status}</Badge>;
    }
  };

  const allSelected = displayedEntries.length > 0 && selectedEntries.size === displayedEntries.length;
  const someSelected = selectedEntries.size > 0 && selectedEntries.size < displayedEntries.length;

  return (
    <div className="min-h-screen bg-background">
      <DemoBanner />
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Users className="h-8 w-8 text-primary" />
            <h2 className="text-3xl font-bold text-foreground" data-testid="text-page-title">
              Waitlist Management
            </h2>
            {waitlistEntries && waitlistEntries.length > 0 && (
              <Badge variant="outline" className="text-lg" data-testid="badge-total-entries">
                {waitlistEntries.length}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground" data-testid="text-page-description">
            Manage customer waitlist entries and send availability notifications
          </p>
        </div>

        {/* Filters Section */}
        <Card className="mb-6" data-testid="card-filters">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
            <CardDescription>
              Filter waitlist entries by campaign, route, or status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="filter-campaign">Campaign</Label>
                <Select value={filterCampaignId} onValueChange={setFilterCampaignId}>
                  <SelectTrigger id="filter-campaign" data-testid="select-filter-campaign">
                    <SelectValue placeholder="All Campaigns" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Campaigns</SelectItem>
                    {campaigns.map(campaign => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="filter-route">Route</Label>
                <Select value={filterRouteId} onValueChange={setFilterRouteId}>
                  <SelectTrigger id="filter-route" data-testid="select-filter-route">
                    <SelectValue placeholder="All Routes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Routes</SelectItem>
                    {routes.map(route => (
                      <SelectItem key={route.id} value={route.id}>
                        {route.zipCode} - {route.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="filter-status">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger id="filter-status" data-testid="select-filter-status">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="notified">Notified</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Waitlist Table */}
        <Card data-testid="card-waitlist-table">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Waitlist Entries</CardTitle>
                <CardDescription>
                  {displayedEntries.length} {displayedEntries.length === 1 ? 'entry' : 'entries'} 
                  {selectedEntries.size > 0 && ` (${selectedEntries.size} selected)`}
                </CardDescription>
              </div>
              <Button
                onClick={handleNotifySelected}
                disabled={selectedEntries.size === 0}
                data-testid="button-notify-selected"
              >
                <Bell className="h-4 w-4 mr-2" />
                Notify Selected ({selectedEntries.size})
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : displayedEntries.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all"
                        data-testid="checkbox-select-all"
                      />
                    </TableHead>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Industry → Subcategory</TableHead>
                    <TableHead>Created Date</TableHead>
                    <TableHead>Notified Count</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedEntries.map((entry) => (
                    <TableRow key={entry.id} data-testid={`row-entry-${entry.id}`}>
                      <TableCell>
                        <Checkbox
                          checked={selectedEntries.has(entry.id)}
                          onCheckedChange={(checked) => handleSelectEntry(entry.id, checked as boolean)}
                          aria-label={`Select ${entry.user?.businessName || entry.user?.name || 'entry'}`}
                          data-testid={`checkbox-entry-${entry.id}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium" data-testid={`text-customer-name-${entry.id}`}>
                        {entry.user?.businessName || entry.user?.name || 'Unknown'}
                      </TableCell>
                      <TableCell data-testid={`text-campaign-name-${entry.id}`}>
                        {entry.campaign?.name || 'N/A'}
                      </TableCell>
                      <TableCell data-testid={`text-route-name-${entry.id}`}>
                        {entry.route?.zipCode} - {entry.route?.name || 'N/A'}
                      </TableCell>
                      <TableCell data-testid={`badge-industry-${entry.id}`}>
                        {entry.industrySubcategory?.name || 'N/A'}
                      </TableCell>
                      <TableCell data-testid={`text-created-date-${entry.id}`}>
                        {entry.createdAt ? format(new Date(entry.createdAt), 'MMM d, yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell data-testid={`text-notified-count-${entry.id}`}>
                        {entry.notifiedCount || 0}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(entry.status, entry.id)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12" data-testid="text-no-entries">
                <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No waitlist entries
                </h3>
                <p className="text-muted-foreground">
                  {filterCampaignId !== "all" || filterRouteId !== "all" || filterStatus !== "all"
                    ? "No entries match the selected filters"
                    : "No customers on the waitlist yet"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bulk Notification Dialog */}
      <Dialog open={isNotifyDialogOpen} onOpenChange={setIsNotifyDialogOpen}>
        <DialogContent data-testid="dialog-notify-customers">
          <DialogHeader>
            <DialogTitle>Notify Waitlist Customers</DialogTitle>
            <DialogDescription>
              Send availability notification to {selectedEntries.size} selected customer{selectedEntries.size !== 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notification-message">Message</Label>
              <Textarea
                id="notification-message"
                placeholder="Enter notification message (e.g., 'Great news! A slot has become available for your requested campaign and route...')"
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                rows={4}
                data-testid="textarea-notification-message"
              />
            </div>

            <div className="space-y-3">
              <Label>Notification Channels</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="send-email"
                  checked={sendEmail}
                  onCheckedChange={(checked) => setSendEmail(checked as boolean)}
                  data-testid="checkbox-send-email"
                />
                <Label htmlFor="send-email" className="font-normal cursor-pointer">
                  Send Email
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="send-in-app"
                  checked={sendInApp}
                  onCheckedChange={(checked) => setSendInApp(checked as boolean)}
                  data-testid="checkbox-send-in-app"
                />
                <Label htmlFor="send-in-app" className="font-normal cursor-pointer">
                  Send In-App Notification
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsNotifyDialogOpen(false)}
              data-testid="button-cancel-notification"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitNotification}
              disabled={notifyMutation.isPending}
              data-testid="button-submit-notification"
            >
              {notifyMutation.isPending ? "Sending..." : "Send Notifications"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
