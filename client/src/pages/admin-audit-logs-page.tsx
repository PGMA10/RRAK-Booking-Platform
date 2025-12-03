import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Navigation } from "@/components/navigation";
import { DemoBanner } from "@/components/demo-banner";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  Search,
  Filter,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Activity,
  Calendar,
  User,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { Redirect } from "wouter";
import { formatDistanceToNow, format } from "date-fns";

interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  actionType: string;
  resourceType: string;
  resourceId: string | null;
  details: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string | Date;
}

interface AuditLogResponse {
  logs: AuditLog[];
  totalCount: number;
  limit: number;
  offset: number;
}

interface AuditLogStats {
  last24Hours: number;
  last7Days: number;
  last30Days: number;
  total: number;
}

const ACTION_TYPES = [
  { value: "all", label: "All Actions" },
  { value: "create", label: "Create" },
  { value: "update", label: "Update" },
  { value: "delete", label: "Delete" },
  { value: "approve", label: "Approve" },
  { value: "reject", label: "Reject" },
  { value: "login", label: "Login" },
  { value: "logout", label: "Logout" },
  { value: "cleanup", label: "Cleanup" },
];

const RESOURCE_TYPES = [
  { value: "all", label: "All Resources" },
  { value: "campaign", label: "Campaign" },
  { value: "booking", label: "Booking" },
  { value: "user", label: "User" },
  { value: "route", label: "Route" },
  { value: "industry", label: "Industry" },
  { value: "settings", label: "Settings" },
  { value: "audit_log", label: "Audit Log" },
];

function getActionBadgeColor(actionType: string): string {
  switch (actionType) {
    case "create":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "update":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "delete":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    case "approve":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "reject":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
    case "login":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
    case "logout":
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    case "cleanup":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
  }
}

export default function AdminAuditLogsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [page, setPage] = useState(0);
  const [actionTypeFilter, setActionTypeFilter] = useState("all");
  const [resourceTypeFilter, setResourceTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const ITEMS_PER_PAGE = 25;

  if (!user || user.role !== "admin") {
    return <Redirect to="/" />;
  }

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    params.set("limit", ITEMS_PER_PAGE.toString());
    params.set("offset", (page * ITEMS_PER_PAGE).toString());
    if (actionTypeFilter !== "all") params.set("actionType", actionTypeFilter);
    if (resourceTypeFilter !== "all") params.set("resourceType", resourceTypeFilter);
    return params.toString();
  };

  const { data: logsData, isLoading, refetch } = useQuery<AuditLogResponse>({
    queryKey: ["/api/admin/audit-logs", page, actionTypeFilter, resourceTypeFilter],
    queryFn: async () => {
      const res = await fetch(`/api/admin/audit-logs?${buildQueryParams()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return res.json();
    },
  });

  const { data: stats } = useQuery<AuditLogStats>({
    queryKey: ["/api/admin/audit-logs/stats"],
  });

  const cleanupMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/audit-logs/cleanup");
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs/stats"] });
      toast({
        title: "Cleanup Complete",
        description: data.message || `Deleted ${data.deletedCount} old logs`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Cleanup Failed",
        description: error.message || "Failed to cleanup old logs",
        variant: "destructive",
      });
    },
  });

  const totalPages = logsData ? Math.ceil(logsData.totalCount / ITEMS_PER_PAGE) : 0;

  const formatDate = (date: string | Date) => {
    try {
      const d = typeof date === "string" ? new Date(date) : date;
      return format(d, "MMM d, yyyy 'at' h:mm a");
    } catch {
      return "Unknown";
    }
  };

  const formatTimeAgo = (date: string | Date) => {
    try {
      const d = typeof date === "string" ? new Date(date) : date;
      return formatDistanceToNow(d, { addSuffix: true });
    } catch {
      return "";
    }
  };

  const filteredLogs = logsData?.logs.filter(log => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.userName?.toLowerCase().includes(query) ||
      log.resourceId?.toLowerCase().includes(query) ||
      log.actionType?.toLowerCase().includes(query) ||
      log.resourceType?.toLowerCase().includes(query)
    );
  }) || [];

  return (
    <div className="min-h-screen bg-background">
      <DemoBanner />
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <h2 className="text-3xl font-bold text-foreground">Audit Logs</h2>
                <p className="text-muted-foreground">
                  Track admin actions and detect unauthorized access
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                data-testid="button-refresh"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => cleanupMutation.mutate()}
                disabled={cleanupMutation.isPending}
                data-testid="button-cleanup"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {cleanupMutation.isPending ? "Cleaning..." : "Cleanup Old Logs"}
              </Button>
            </div>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card data-testid="card-stats-24h">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Last 24 Hours</p>
                    <p className="text-2xl font-bold">{stats.last24Hours}</p>
                  </div>
                  <Activity className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-stats-7d">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Last 7 Days</p>
                    <p className="text-2xl font-bold">{stats.last7Days}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-stats-30d">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Last 30 Days</p>
                    <p className="text-2xl font-bold">{stats.last30Days}</p>
                  </div>
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-stats-total">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Logs</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <Shield className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="mb-6" data-testid="card-filters">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by user, resource ID..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-search"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select
                  value={actionTypeFilter}
                  onValueChange={(value) => {
                    setActionTypeFilter(value);
                    setPage(0);
                  }}
                >
                  <SelectTrigger className="w-[150px]" data-testid="select-action-type">
                    <SelectValue placeholder="Action Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={resourceTypeFilter}
                  onValueChange={(value) => {
                    setResourceTypeFilter(value);
                    setPage(0);
                  }}
                >
                  <SelectTrigger className="w-[150px]" data-testid="select-resource-type">
                    <SelectValue placeholder="Resource Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOURCE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-logs">
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
            <CardDescription>
              Showing {filteredLogs.length} of {logsData?.totalCount || 0} entries
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No audit logs found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Admin actions will be logged here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    data-testid={`log-entry-${log.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          <User className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{log.userName}</span>
                            <Badge className={getActionBadgeColor(log.actionType)}>
                              {log.actionType}
                            </Badge>
                            <Badge variant="outline">{log.resourceType}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {log.resourceId && (
                              <span>Resource ID: {log.resourceId.substring(0, 12)}...</span>
                            )}
                          </p>
                          {log.details && Object.keys(log.details).length > 0 && (
                            <div className="mt-2 text-sm bg-muted/50 rounded p-2">
                              <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.ipAddress && (
                            <p className="text-xs text-muted-foreground mt-1">
                              IP: {log.ipAddress}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <p className="text-muted-foreground">{formatTimeAgo(log.createdAt)}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(log.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Page {page + 1} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    data-testid="button-next-page"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6" data-testid="card-retention-info">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <h3 className="font-medium">Log Retention Policy</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Audit logs are retained for 90 days. Use the "Cleanup Old Logs" button to manually
                  remove logs older than 90 days. This helps maintain system performance and storage.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
