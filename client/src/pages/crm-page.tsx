import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ArrowUpDown, Mail, Phone, DollarSign, Calendar, Tag } from "lucide-react";

interface Customer {
  id: string;
  email: string;
  username: string;
  businessName?: string;
  phone?: string;
  totalSpent: number;
  bookingCount: number;
  lastBookingDate?: string;
  tags: string[];
  createdAt: string;
}

export default function CRMPage() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<'name' | 'totalSpent' | 'lastBooking' | 'signupDate'>('totalSpent');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [highValueOnly, setHighValueOnly] = useState(false);

  const { data: customers, isLoading, error } = useQuery<Customer[]>({
    queryKey: ['/api/admin/crm/customers', { search, sortBy, sortOrder, highValue: highValueOnly }],
  });

  const handleSortChange = (newSortBy: typeof sortBy) => {
    if (newSortBy === sortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="heading-crm">Customer Relationship Management</h1>
            <p className="text-muted-foreground mt-1">Manage your customers and track their activity</p>
          </div>
          <Link href="/admin">
            <Button variant="outline" data-testid="button-back-to-admin">
              Back to Admin
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Customer Directory</CardTitle>
            <CardDescription>
              View and manage all customers with their lifetime value and booking history
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Search and Filters */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or business..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-customers"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={sortBy} onValueChange={(value: typeof sortBy) => setSortBy(value)}>
                    <SelectTrigger className="w-[180px]" data-testid="select-sort-by">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="totalSpent">Total Spent</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="lastBooking">Last Booking</SelectItem>
                      <SelectItem value="signupDate">Signup Date</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    data-testid="button-toggle-sort-order"
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={highValueOnly ? "default" : "outline"}
                    onClick={() => setHighValueOnly(!highValueOnly)}
                    data-testid="button-high-value-filter"
                  >
                    High Value ($1000+)
                  </Button>
                </div>
              </div>

              {/* Customer Table */}
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : error ? (
                <div className="text-center py-8 text-destructive">
                  Failed to load customers. Please try again.
                </div>
              ) : !customers || customers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No customers found matching your criteria.
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead className="text-right">Lifetime Value</TableHead>
                        <TableHead className="text-center">Bookings</TableHead>
                        <TableHead>Last Booking</TableHead>
                        <TableHead>Tags</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customers.map((customer) => (
                        <TableRow key={customer.id} data-testid={`row-customer-${customer.id}`}>
                          <TableCell>
                            <div className="font-medium" data-testid={`text-customer-name-${customer.id}`}>
                              {customer.businessName || customer.username}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Joined {formatDate(customer.createdAt)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 text-sm">
                              <div className="flex items-center gap-2">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                <span className="text-muted-foreground">{customer.email}</span>
                              </div>
                              {customer.phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-muted-foreground">{customer.phone}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold" data-testid={`text-ltv-${customer.id}`}>
                            <div className="flex items-center justify-end gap-1">
                              <DollarSign className="h-4 w-4" />
                              {customer.totalSpent.toLocaleString()}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{customer.bookingCount}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {formatDate(customer.lastBookingDate)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {customer.tags.slice(0, 2).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  <Tag className="h-2 w-2 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                              {customer.tags.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{customer.tags.length - 2}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/admin/crm/customer/${customer.id}`}>
                              <Button variant="outline" size="sm" data-testid={`button-view-customer-${customer.id}`}>
                                View Details
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
