import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Link, Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Calendar, MapPin, Briefcase, Trash2, Plus, CreditCard, Tag, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import type { Campaign, Route, Industry } from "@shared/schema";
import { DemoBanner } from "@/components/demo-banner";
import { Navigation } from "@/components/navigation";

interface CampaignSelection {
  campaignId: string;
  routeId: string;
}

export default function MultiCampaignBookingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  if (!user || user.role !== "customer") {
    return <Redirect to="/auth" />;
  }

  const [sharedIndustryId, setSharedIndustryId] = useState<string>("");
  const [sharedIndustryDescription, setSharedIndustryDescription] = useState<string>("");
  const [selections, setSelections] = useState<CampaignSelection[]>([
    { campaignId: "", routeId: "" }
  ]);
  const [contractAccepted, setContractAccepted] = useState(false);

  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const { data: routes = [] } = useQuery<Route[]>({
    queryKey: ["/api/routes"],
  });

  const { data: industries = [] } = useQuery<Industry[]>({
    queryKey: ["/api/industries"],
  });

  const availableCampaigns = campaigns.filter(c => 
    c.status === "booking_open" || c.status === "planning"
  );

  // Helper function to get available routes for a specific campaign
  const getAvailableRoutesForCampaign = (campaignId: string) => {
    if (!campaignId) return [];
    
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return [];
    
    const availableRouteIds = (campaign as any).availableRouteIds || [];
    return routes.filter(route => 
      route.status === "active" && availableRouteIds.includes(route.id)
    );
  };

  // Helper function to get available industries for multi-campaign booking (shared across all selections)
  const getAvailableIndustries = () => {
    // For multi-campaign booking, we need industries that are available in ALL selected campaigns (intersection)
    // since the shared industry is applied to every campaign in the booking
    const selectedCampaignIds = selections.map(s => s.campaignId).filter(Boolean);
    if (selectedCampaignIds.length === 0) return [];
    
    // Get industry IDs for each selected campaign
    const campaignIndustrySets = selectedCampaignIds.map(campaignId => {
      const campaign = campaigns.find(c => c.id === campaignId);
      const industryIds = (campaign as any).availableIndustryIds || [];
      return new Set<string>(industryIds);
    });
    
    // Find intersection: industries available in ALL campaigns
    const firstSet = campaignIndustrySets[0];
    if (!firstSet) return [];
    
    const intersection = new Set<string>();
    firstSet.forEach(industryId => {
      // Check if this industry exists in ALL campaign sets
      const existsInAll = campaignIndustrySets.every(set => set.has(industryId));
      if (existsInAll) {
        intersection.add(industryId);
      }
    });
    
    return industries.filter(industry => intersection.has(industry.id));
  };

  const activeIndustries = getAvailableIndustries();

  // Clear shared industry if it's no longer valid for the selected campaigns
  useEffect(() => {
    if (sharedIndustryId && !activeIndustries.some(i => i.id === sharedIndustryId)) {
      setSharedIndustryId("");
      setSharedIndustryDescription("");
    }
  }, [activeIndustries, sharedIndustryId]);

  const addCampaignSelection = () => {
    if (selections.length < 3) {
      setSelections([...selections, { campaignId: "", routeId: "" }]);
    }
  };

  const removeCampaignSelection = (index: number) => {
    if (selections.length > 1) {
      setSelections(selections.filter((_, i) => i !== index));
    }
  };

  const updateSelection = (index: number, field: keyof CampaignSelection, value: string) => {
    const newSelections = [...selections];
    
    // If changing campaign, clear the route selection to prevent stale selections
    if (field === 'campaignId') {
      newSelections[index] = { campaignId: value, routeId: "" };
    } else {
      newSelections[index] = { ...newSelections[index], [field]: value };
    }
    
    setSelections(newSelections);
  };

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/multi-campaign-checkout", {
        selections: selections.map(s => ({
          ...s,
          industryId: sharedIndustryId,
          industryDescription: sharedIndustryDescription,
          businessName: user?.businessName || user?.username || "Unknown Business",
          contactEmail: user?.email || "",
          contactPhone: user?.phone || "",
        })),
      });
      return await response.json();
    },
    onSuccess: (data: { sessionUrl: string }) => {
      window.location.href = data.sessionUrl;
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Booking Failed",
        description: error.message || "Failed to create checkout session.",
      });
    },
  });

  const handleProceedToPayment = () => {
    // Validation for contract acceptance
    if (!contractAccepted) {
      toast({
        variant: "destructive",
        title: "Contract Required",
        description: "You must agree to the Marketing Contract to continue.",
      });
      return;
    }

    // Validation for shared industry
    if (!sharedIndustryId) {
      toast({
        variant: "destructive",
        description: "Please select your industry",
      });
      return;
    }
    
    // Ensure selected industry is available for the selected campaigns
    const selectedIndustry = activeIndustries.find(ind => ind.id === sharedIndustryId);
    if (!selectedIndustry) {
      toast({
        variant: "destructive",
        description: "Selected industry is not available for the chosen campaigns",
      });
      return;
    }
    
    if (selectedIndustry.name.toLowerCase() === "other" && !sharedIndustryDescription?.trim()) {
      toast({
        variant: "destructive",
        description: "Please describe your business type",
      });
      return;
    }
    
    // Validation for campaigns
    for (let i = 0; i < selections.length; i++) {
      const sel = selections[i];
      if (!sel.campaignId || !sel.routeId) {
        toast({
          variant: "destructive",
          description: `Please complete all selections for Campaign ${i + 1}`,
        });
        return;
      }
    }

    checkoutMutation.mutate();
  };

  const formatDate = (date: Date | number) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Calculate pricing correctly: $600 first slot + $450 each additional if 3 campaigns
  const calculateTotal = () => {
    if (selections.length === 1) return 600;
    if (selections.length === 2) return 1200;
    if (selections.length === 3) return 1500; // $600 + $450 + $450 - $300 discount = $1500
    return 600;
  };
  
  const subtotal = selections.length === 3 ? 1800 : selections.length * 600; // Show what it would cost without discount
  const bulkDiscount = selections.length === 3 ? 300 : 0;
  const finalTotal = calculateTotal();

  const selectedIndustry = industries.find(i => i.id === sharedIndustryId);
  const isOtherIndustry = selectedIndustry?.name.toLowerCase() === "other";
  
  const isFormValid = 
    sharedIndustryId &&
    (!isOtherIndustry || sharedIndustryDescription?.trim()) &&
    selections.every(s => s.campaignId && s.routeId);

  return (
    <div className="min-h-screen bg-background">
      <DemoBanner />
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <Link href="/customer/dashboard">
            <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2" data-testid="heading-multi-campaign-booking">
                Book Multiple Campaigns
              </h1>
              <p className="text-muted-foreground text-lg">
                Book 3 campaigns and save $300 with our bulk discount!
              </p>
            </div>
            {selections.length === 3 && (
              <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white text-lg py-2 px-4">
                <Tag className="h-4 w-4 mr-2" />
                $300 Bulk Discount Applied!
              </Badge>
            )}
          </div>
        </div>

        {/* Shared Industry Selection */}
        <Card className="mb-6 border-2 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Your Industry
            </CardTitle>
            <CardDescription>
              This industry will apply to all campaigns in this booking
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Your Industry</label>
              <Select
                value={sharedIndustryId}
                onValueChange={setSharedIndustryId}
              >
                <SelectTrigger data-testid="select-shared-industry">
                  <SelectValue placeholder="Choose your industry..." />
                </SelectTrigger>
                <SelectContent>
                  {activeIndustries.map(industry => (
                    <SelectItem key={industry.id} value={industry.id}>
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        {industry.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isOtherIndustry && (
              <div>
                <label className="text-sm font-medium mb-2 block">Describe Your Business</label>
                <Textarea
                  placeholder="Please describe your business type..."
                  value={sharedIndustryDescription}
                  onChange={(e) => setSharedIndustryDescription(e.target.value)}
                  className="min-h-[80px]"
                  data-testid="textarea-shared-industry-description"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {selections.map((selection, index) => {
            const selectedCampaign = availableCampaigns.find(c => c.id === selection.campaignId);
            const campaignRoutes = getAvailableRoutesForCampaign(selection.campaignId);
            const selectedRoute = campaignRoutes.find(r => r.id === selection.routeId);

            return (
              <Card key={index} className="border-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Campaign {index + 1}
                      {selections.length === 3 && index === 0 && (
                        <Badge variant="secondary" className="ml-2">First Slot: $600</Badge>
                      )}
                      {selections.length === 3 && index > 0 && (
                        <Badge variant="secondary" className="ml-2">Additional: $450</Badge>
                      )}
                    </CardTitle>
                    {selections.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCampaignSelection(index)}
                        data-testid={`button-remove-campaign-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {selectedCampaign && (
                    <CardDescription>
                      Mail Date: {formatDate(selectedCampaign.mailDate)} | 
                      Print Deadline: {formatDate(selectedCampaign.printDeadline)}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Select Campaign</label>
                    <Select
                      value={selection.campaignId}
                      onValueChange={(value) => updateSelection(index, 'campaignId', value)}
                    >
                      <SelectTrigger data-testid={`select-campaign-${index}`}>
                        <SelectValue placeholder="Choose a campaign..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCampaigns
                          .filter(c => !selections.some((s, i) => i !== index && s.campaignId === c.id))
                          .map(campaign => (
                            <SelectItem key={campaign.id} value={campaign.id}>
                              {campaign.name} - {formatDate(campaign.mailDate)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Delivery Route</label>
                    <Select
                      value={selection.routeId}
                      onValueChange={(value) => updateSelection(index, 'routeId', value)}
                    >
                      <SelectTrigger data-testid={`select-route-${index}`}>
                        <SelectValue placeholder="Choose a route..." />
                      </SelectTrigger>
                      <SelectContent>
                        {campaignRoutes.map(route => (
                          <SelectItem key={route.id} value={route.id}>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              {route.name} ({route.zipCode})
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {selections.length < 3 && (
            <Button
              variant="outline"
              onClick={addCampaignSelection}
              className="w-full"
              data-testid="button-add-campaign"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another Campaign {selections.length === 2 && "(Get $300 Bulk Discount!)"}
            </Button>
          )}

          <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-lg">
                <span>Campaigns Selected:</span>
                <span className="font-semibold">{selections.length}</span>
              </div>
              <div className="flex justify-between text-lg">
                <span>Subtotal:</span>
                <span className="font-semibold">${subtotal.toFixed(2)}</span>
              </div>
              {bulkDiscount > 0 && (
                <div className="flex justify-between text-lg text-green-600">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Bulk Discount (3 campaigns):
                  </span>
                  <span className="font-semibold">-${bulkDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between text-2xl font-bold">
                <span>Total:</span>
                <span className="text-primary">${finalTotal.toFixed(2)}</span>
              </div>
              {selections.length === 2 && (
                <div className="mt-4 p-3 bg-purple-100 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-purple-800">
                    <strong>Tip:</strong> Add one more campaign to unlock the $300 bulk discount and pay only $1,500 total (save $300!)
                  </p>
                </div>
              )}

              {/* Terms & Conditions Acceptance */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="contractAcceptanceMulti"
                    checked={contractAccepted}
                    onCheckedChange={(checked) => setContractAccepted(checked as boolean)}
                    data-testid="checkbox-contract-acceptance"
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor="contractAcceptanceMulti"
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      I have read and agree to the Marketing Contract
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      <a
                        href="/contract"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
                        data-testid="link-view-contract"
                      >
                        View Contract
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleProceedToPayment}
                disabled={!contractAccepted || !isFormValid || checkoutMutation.isPending}
                className="w-full mt-4"
                size="lg"
                data-testid="button-proceed-payment"
              >
                {checkoutMutation.isPending ? "Processing..." : `Proceed to Payment - $${finalTotal.toFixed(2)}`}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
