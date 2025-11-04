import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Navigation } from "@/components/navigation";
import { DemoBanner } from "@/components/demo-banner";
import { Sparkles, Search, Filter, Eye } from "lucide-react";
import { useState } from "react";
import type { BookingWithDetails } from "@shared/schema";
import { DesignBriefReviewModal } from "@/components/design-brief-review-modal";

export default function AdminDesignBriefsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const { data: bookings, isLoading } = useQuery<BookingWithDetails[]>({
    queryKey: ['/api/bookings'],
  });

  const filteredList = (bookings ?? []).filter(booking => {
    // Filter by design status
    if (filterStatus !== "all" && booking.designStatus !== filterStatus) {
      return false;
    }

    // Filter by search term (business name or booking ID)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        booking.businessName.toLowerCase().includes(term) ||
        booking.id.toLowerCase().includes(term)
      );
    }

    // Only show bookings that have design workflow data
    return booking.designStatus && booking.designStatus !== 'pending_design';
  });

  const filteredBookings = filteredList.sort((a, b) => {
    // Apply sorting
    switch (sortBy) {
      case 'newest':
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      case 'oldest':
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      case 'business-name':
        return a.businessName.localeCompare(b.businessName);
      case 'revisions':
        return (b.revisionCount || 0) - (a.revisionCount || 0);
      default:
        return 0;
    }
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      brief_submitted: { label: "Pending Review", className: "bg-blue-100 text-blue-800" },
      pending_approval: { label: "Sent for Approval", className: "bg-purple-100 text-purple-800" },
      revision_requested: { label: "Revision Requested", className: "bg-orange-100 text-orange-800" },
      approved: { label: "Approved", className: "bg-green-100 text-green-800" },
    };

    const config = statusConfig[status] || { label: status, className: "bg-gray-100 text-gray-800" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const selectedBooking = selectedBookingId ? bookings?.find(b => b.id === selectedBookingId) : null;

  return (
    <>
      <Navigation />
      <DemoBanner />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-6 w-6" />
            <h1 className="text-3xl font-bold">Ad Design Briefs</h1>
          </div>
          <p className="text-muted-foreground">
            Review customer design briefs, upload completed designs, and manage the design approval workflow
          </p>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by business name or booking ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-briefs"
                  />
                </div>
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[200px]" data-testid="select-filter-status">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="brief_submitted">Pending Review</SelectItem>
                  <SelectItem value="pending_approval">Sent for Approval</SelectItem>
                  <SelectItem value="revision_requested">Revision Requested</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[200px]" data-testid="select-sort">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="business-name">Business Name</SelectItem>
                  <SelectItem value="revisions">Most Revisions</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Design Briefs List */}
        <Card>
          <CardHeader>
            <CardTitle>Design Briefs ({filteredBookings.length})</CardTitle>
            <CardDescription>
              Click on a brief to review details and upload designs
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredBookings.length > 0 ? (
              <div className="space-y-3">
                {filteredBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedBookingId(booking.id)}
                    data-testid={`brief-card-${booking.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-foreground" data-testid={`text-business-name-${booking.id}`}>
                            {booking.businessName}
                          </h3>
                          {getStatusBadge(booking.designStatus || '')}
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>
                            Campaign: {booking.campaign?.name || 'N/A'}
                          </p>
                          <p>
                            Route: {booking.route?.zipCode} {booking.route?.name} - {booking.industry?.name}
                          </p>
                          <p>
                            Slots: {booking.quantity || 1} | Revisions: {booking.revisionCount || 0}/2
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBookingId(booking.id);
                        }}
                        data-testid={`button-review-${booking.id}`}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Review
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Sparkles className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No design briefs found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {filterStatus !== "all" ? "Try adjusting your filters" : "Briefs will appear here once customers submit them"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Design Brief Review Modal */}
      {selectedBooking && (
        <DesignBriefReviewModal
          booking={selectedBooking}
          open={!!selectedBookingId}
          onClose={() => setSelectedBookingId(null)}
        />
      )}
    </>
  );
}
