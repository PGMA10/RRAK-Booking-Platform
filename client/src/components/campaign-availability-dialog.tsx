import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import type { Route, Industry } from "@shared/schema";

interface CampaignAvailabilityDialogProps {
  campaignId: string;
  campaignName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CampaignAvailabilityDialog({
  campaignId,
  campaignName,
  open,
  onOpenChange,
}: CampaignAvailabilityDialogProps) {
  const { toast } = useToast();
  const [selectedRouteIds, setSelectedRouteIds] = useState<Set<string>>(new Set());
  const [selectedIndustryIds, setSelectedIndustryIds] = useState<Set<string>>(new Set());

  const { data: allRoutes = [], isLoading: routesLoading } = useQuery<Route[]>({
    queryKey: ["/api/routes"],
  });

  const { data: allIndustries = [], isLoading: industriesLoading } = useQuery<Industry[]>({
    queryKey: ["/api/industries"],
  });

  const { data: campaignRoutes = [], isLoading: campaignRoutesLoading } = useQuery<Route[]>({
    queryKey: ["/api/campaigns", campaignId, "routes"],
    enabled: open && !!campaignId,
  });

  const { data: campaignIndustries = [], isLoading: campaignIndustriesLoading } = useQuery<Industry[]>({
    queryKey: ["/api/campaigns", campaignId, "industries"],
    enabled: open && !!campaignId,
  });

  useEffect(() => {
    if (campaignRoutes) {
      setSelectedRouteIds(new Set(campaignRoutes.map(r => r.id)));
    }
  }, [campaignRoutes]);

  useEffect(() => {
    if (campaignIndustries && campaignIndustries.length > 0) {
      setSelectedIndustryIds(new Set(campaignIndustries.map(i => i.id)));
    } else if (campaignIndustries && campaignIndustries.length === 0 && allIndustries.length > 0) {
      // Default to all industries selected when none are configured yet
      setSelectedIndustryIds(new Set(allIndustries.map(i => i.id)));
    }
  }, [campaignIndustries, allIndustries]);

  const updateRoutesMutation = useMutation({
    mutationFn: async (routeIds: string[]) => {
      return await apiRequest("PUT", `/api/campaigns/${campaignId}/routes`, { routeIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", campaignId, "routes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Routes updated",
        description: "Campaign routes have been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update campaign routes",
        variant: "destructive",
      });
    },
  });

  const updateIndustriesMutation = useMutation({
    mutationFn: async (industryIds: string[]) => {
      return await apiRequest("PUT", `/api/campaigns/${campaignId}/industries`, { industryIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", campaignId, "industries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Industries updated",
        description: "Campaign industries have been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update campaign industries",
        variant: "destructive",
      });
    },
  });

  const handleRouteToggle = (routeId: string) => {
    const newSet = new Set(selectedRouteIds);
    if (newSet.has(routeId)) {
      newSet.delete(routeId);
    } else {
      newSet.add(routeId);
    }
    setSelectedRouteIds(newSet);
  };

  const handleIndustryToggle = (industryId: string) => {
    const newSet = new Set(selectedIndustryIds);
    if (newSet.has(industryId)) {
      newSet.delete(industryId);
    } else {
      newSet.add(industryId);
    }
    setSelectedIndustryIds(newSet);
  };

  const handleSave = async () => {
    await Promise.all([
      updateRoutesMutation.mutateAsync(Array.from(selectedRouteIds)),
      updateIndustriesMutation.mutateAsync(Array.from(selectedIndustryIds)),
    ]);
    onOpenChange(false);
  };

  const isLoading = routesLoading || industriesLoading || campaignRoutesLoading || campaignIndustriesLoading;
  const isSaving = updateRoutesMutation.isPending || updateIndustriesMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Availability - {campaignName}</DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Select which routes and industries are available for this campaign
          </p>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="routes" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="routes">Routes ({selectedRouteIds.size})</TabsTrigger>
              <TabsTrigger value="industries">Industries ({selectedIndustryIds.size})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="routes" className="space-y-4">
              <div className="space-y-2">
                {allRoutes.map((route) => (
                  <div
                    key={route.id}
                    className="flex items-center space-x-2 border rounded p-3 hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      id={`route-${route.id}`}
                      checked={selectedRouteIds.has(route.id)}
                      onCheckedChange={() => handleRouteToggle(route.id)}
                      data-testid={`checkbox-route-${route.id}`}
                    />
                    <Label
                      htmlFor={`route-${route.id}`}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="font-medium">{route.name}</div>
                      <div className="text-sm text-muted-foreground">ZIP: {route.zipCode}</div>
                    </Label>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="industries" className="space-y-4">
              <div className="space-y-2">
                {allIndustries.map((industry) => (
                  <div
                    key={industry.id}
                    className="flex items-center space-x-2 border rounded p-3 hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      id={`industry-${industry.id}`}
                      checked={selectedIndustryIds.has(industry.id)}
                      onCheckedChange={() => handleIndustryToggle(industry.id)}
                      data-testid={`checkbox-industry-${industry.id}`}
                    />
                    <Label
                      htmlFor={`industry-${industry.id}`}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="font-medium">{industry.name}</div>
                    </Label>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            data-testid="button-cancel-availability"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            data-testid="button-save-availability"
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Availability
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
