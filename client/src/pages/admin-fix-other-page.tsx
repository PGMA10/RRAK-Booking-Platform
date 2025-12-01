import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Wrench, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { DemoBanner } from "@/components/demo-banner";

interface FixResult {
  success: boolean;
  industryCreated: boolean;
  industryId: string;
  campaignsUpdated: number;
  totalCampaigns: number;
  message: string;
}

export default function AdminFixOtherPage() {
  const { toast } = useToast();
  const [result, setResult] = useState<FixResult | null>(null);

  const fixMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/fix-other-industry');
      return response.json() as Promise<FixResult>;
    },
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/industries"] });
      toast({
        title: "Success!",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fix failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <DemoBanner />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2" data-testid="text-page-title">
            <Wrench className="h-8 w-8" />
            Fix "Other" Industry
          </h1>
          <p className="text-muted-foreground" data-testid="text-page-description">
            Add the "Other" industry to all existing campaigns
          </p>
        </div>

        <div className="max-w-2xl space-y-6">
          <Card data-testid="card-fix-other">
            <CardHeader>
              <CardTitle>Add "Other" Industry to All Campaigns</CardTitle>
              <CardDescription>
                This tool ensures that the "Other" industry category is available for booking on all campaigns.
                The "Other" category allows businesses that don't fit standard categories to book slots.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">What this does:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Creates the "Other" industry if it doesn't exist</li>
                  <li>Links "Other" to ALL existing campaigns</li>
                  <li>Allows unlimited businesses to book under "Other" (no slot limit)</li>
                  <li>Requires customers to describe their business type when booking</li>
                </ul>
              </div>

              <Button 
                onClick={() => fixMutation.mutate()}
                disabled={fixMutation.isPending}
                className="w-full"
                size="lg"
                data-testid="button-fix-other"
              >
                {fixMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Fixing...
                  </>
                ) : (
                  <>
                    <Wrench className="h-5 w-5 mr-2" />
                    Fix "Other" Industry Now
                  </>
                )}
              </Button>

              {result && (
                <div className={`p-4 rounded-lg border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-start gap-3">
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    )}
                    <div>
                      <h4 className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                        {result.success ? 'Fix Completed!' : 'Fix Failed'}
                      </h4>
                      <p className={`text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                        {result.message}
                      </p>
                      {result.success && (
                        <div className="mt-2 text-sm text-green-600">
                          <p>Industry ID: {result.industryId}</p>
                          <p>Campaigns updated: {result.campaignsUpdated} of {result.totalCampaigns}</p>
                          {result.industryCreated && <p className="font-medium">New industry was created</p>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>About This Tool</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                • This is a one-time fix tool for production databases
              </p>
              <p className="text-sm text-muted-foreground">
                • New campaigns will automatically include "Other" going forward
              </p>
              <p className="text-sm text-muted-foreground">
                • Running this multiple times is safe - it won't create duplicates
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
