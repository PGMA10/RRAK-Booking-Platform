import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Settings, DollarSign, Tag, Save } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { DemoBanner } from "@/components/demo-banner";

interface AdminSetting {
  id: string;
  key: string;
  value: string;
  description?: string;
  updatedAt?: Date;
  updatedBy?: string;
}

export default function AdminSettingsPage() {
  const { toast } = useToast();
  
  const { data: settings = [], isLoading } = useQuery<AdminSetting[]>({
    queryKey: ["/api/admin/settings"],
  });

  const [loyaltyThreshold, setLoyaltyThreshold] = useState<string>("");
  const [loyaltyDiscount, setLoyaltyDiscount] = useState<string>("");

  // Initialize form values when settings load
  useEffect(() => {
    const threshold = settings.find(s => s.key === 'loyalty_slots_threshold');
    const discount = settings.find(s => s.key === 'loyalty_discount_amount');
    
    if (threshold) setLoyaltyThreshold(threshold.value);
    if (discount) setLoyaltyDiscount(discount.value);
  }, [settings]);

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value, description }: { key: string; value: string; description?: string }) => {
      const response = await apiRequest('PUT', `/api/admin/settings/${key}`, {
        value,
        description
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({
        title: "Settings updated",
        description: "Changes have been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveLoyaltySettings = () => {
    const threshold = parseInt(loyaltyThreshold);
    const discount = parseInt(loyaltyDiscount);

    if (isNaN(threshold) || threshold < 1) {
      toast({
        title: "Invalid threshold",
        description: "Loyalty slots threshold must be at least 1",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(discount) || discount < 0) {
      toast({
        title: "Invalid discount",
        description: "Loyalty discount amount must be 0 or greater",
        variant: "destructive",
      });
      return;
    }

    // Update both settings
    updateSettingMutation.mutate({
      key: 'loyalty_slots_threshold',
      value: threshold.toString(),
      description: 'Number of slots needed to earn one loyalty discount',
    });

    updateSettingMutation.mutate({
      key: 'loyalty_discount_amount',
      value: discount.toString(),
      description: 'Discount amount in cents (e.g., 15000 for $150)',
    });
  };

  // Get current values from settings or use defaults
  const currentThreshold = settings.find(s => s.key === 'loyalty_slots_threshold')?.value || '3';
  const currentDiscount = settings.find(s => s.key === 'loyalty_discount_amount')?.value || '15000';

  return (
    <div className="min-h-screen bg-background">
      <Navigation role="admin" />
      <DemoBanner />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2" data-testid="text-page-title">
            <Settings className="h-8 w-8" />
            System Settings
          </h1>
          <p className="text-muted-foreground" data-testid="text-page-description">
            Configure platform-wide settings and discount programs
          </p>
        </div>

        <div className="max-w-4xl space-y-6">
          {/* Loyalty Rewards Program Settings */}
          <Card data-testid="card-loyalty-settings">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Loyalty Rewards Program
              </CardTitle>
              <CardDescription>
                Configure how customers earn loyalty discounts through repeat bookings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="loyalty-threshold">Slots to Earn Discount</Label>
                  <Input
                    id="loyalty-threshold"
                    type="number"
                    min="1"
                    value={loyaltyThreshold || currentThreshold}
                    onChange={(e) => setLoyaltyThreshold(e.target.value)}
                    placeholder="3"
                    data-testid="input-loyalty-threshold"
                  />
                  <p className="text-sm text-muted-foreground">
                    Number of regular-price slots a customer must book to earn one discount
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="loyalty-discount">Discount Amount (cents)</Label>
                  <Input
                    id="loyalty-discount"
                    type="number"
                    min="0"
                    value={loyaltyDiscount || currentDiscount}
                    onChange={(e) => setLoyaltyDiscount(e.target.value)}
                    placeholder="15000"
                    data-testid="input-loyalty-discount"
                  />
                  <p className="text-sm text-muted-foreground">
                    Amount in cents (15000 = $150.00)
                  </p>
                </div>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">Current Configuration:</h4>
                <p className="text-sm text-muted-foreground">
                  Customers earn <strong>${(parseInt(currentDiscount) / 100).toFixed(2)}</strong> off 
                  after every <strong>{currentThreshold}</strong> regular-price slot{parseInt(currentThreshold) !== 1 ? 's' : ''} booked.
                  Discounts reset annually on January 1st.
                </p>
              </div>

              <Button 
                onClick={handleSaveLoyaltySettings}
                disabled={updateSettingMutation.isPending}
                className="w-full md:w-auto"
                data-testid="button-save-loyalty-settings"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateSettingMutation.isPending ? "Saving..." : "Save Loyalty Settings"}
              </Button>
            </CardContent>
          </Card>

          {/* Bulk Booking Discount Settings */}
          <Card data-testid="card-bulk-discount-info">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Bulk Booking Discount
              </CardTitle>
              <CardDescription>
                Multi-campaign bulk booking discount information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  The bulk booking discount is currently <strong>hardcoded</strong> to <strong>$300 off</strong> when customers 
                  book <strong>3 campaigns together</strong> in a single transaction.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Pricing structure: First campaign at $600, additional campaigns at $450 each = $1,500 total (vs. $1,800 regular price)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>About Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                • Changes to loyalty settings apply immediately to all future bookings
              </p>
              <p className="text-sm text-muted-foreground">
                • Existing earned discounts are not affected by threshold changes
              </p>
              <p className="text-sm text-muted-foreground">
                • All loyalty counters automatically reset on January 1st each year
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
