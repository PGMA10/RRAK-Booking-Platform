import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Upload, ImagePlus, Palette, QrCode, Type, Sparkles } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const designBriefSchema = z.object({
  mainMessage: z.string().min(1, "Main message is required").max(40, "Message must be 40 characters or less"),
  qrCodeDestination: z.enum(["website", "social", "other", "none"]),
  qrCodeUrl: z.string().optional(),
  qrCodeLabel: z.string().optional(),
  brandColor: z.string().min(1, "Brand color is required"),
  secondaryColor: z.string().optional(),
  additionalColor1: z.string().optional(),
  additionalColor2: z.string().optional(),
  adStyle: z.string().min(1, "Ad style is required"),
}).refine((data) => {
  // If QR destination is not "none", URL is required
  if (data.qrCodeDestination !== "none" && !data.qrCodeUrl) {
    return false;
  }
  return true;
}, {
  message: "QR code URL is required when a QR destination is selected",
  path: ["qrCodeUrl"],
}).refine((data) => {
  // If QR destination is "other", label is required
  if (data.qrCodeDestination === "other" && !data.qrCodeLabel) {
    return false;
  }
  return true;
}, {
  message: "QR code label is required for 'Other' destination",
  path: ["qrCodeLabel"],
});

type DesignBriefFormData = z.infer<typeof designBriefSchema>;

interface AdDesignBriefFormProps {
  bookingId: string;
  businessName: string;
  onSuccess?: () => void;
}

export function AdDesignBriefForm({ bookingId, businessName, onSuccess }: AdDesignBriefFormProps) {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [optionalImageFile, setOptionalImageFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<DesignBriefFormData>({
    resolver: zodResolver(designBriefSchema),
    defaultValues: {
      mainMessage: "",
      qrCodeDestination: "none",
      qrCodeUrl: "",
      qrCodeLabel: "",
      brandColor: "#000000",
      secondaryColor: "",
      additionalColor1: "",
      additionalColor2: "",
      adStyle: "modern",
    },
  });

  const qrCodeDestination = form.watch("qrCodeDestination");
  const mainMessage = form.watch("mainMessage");

  const submitBriefMutation = useMutation({
    mutationFn: async (data: DesignBriefFormData) => {
      const formData = new FormData();
      formData.append('briefData', JSON.stringify(data));
      
      if (logoFile) {
        formData.append('logo', logoFile);
      }
      
      if (optionalImageFile) {
        formData.append('optionalImage', optionalImageFile);
      }

      const response = await fetch(`/api/bookings/${bookingId}/design-brief`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit design brief');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      toast({
        title: "Design brief submitted",
        description: "Your ad design brief has been submitted for review.",
      });
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: DesignBriefFormData) => {
    if (!logoFile) {
      toast({
        title: "Logo required",
        description: "Please upload your business logo",
        variant: "destructive",
      });
      return;
    }

    submitBriefMutation.mutate(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Ad Design Brief
        </CardTitle>
        <CardDescription>
          Tell us about your brand and what you want to communicate to potential customers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Business Name Display */}
            <div className="bg-muted p-4 rounded-lg">
              <Label className="text-sm font-medium text-muted-foreground">Business Name</Label>
              <p className="text-lg font-semibold mt-1" data-testid="text-business-name">{businessName}</p>
            </div>

            {/* Logo Upload */}
            <div className="space-y-2">
              <Label htmlFor="logo-upload" className="flex items-center gap-2">
                <ImagePlus className="h-4 w-4" />
                Business Logo <span className="text-red-500">*</span>
              </Label>
              <p className="text-sm text-muted-foreground">
                Upload your business logo (PNG or JPG, max 5MB)
              </p>
              <div className="flex items-center gap-3">
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                  className="hidden"
                  data-testid="input-logo"
                />
                <label htmlFor="logo-upload" className="flex-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => document.getElementById('logo-upload')?.click()}
                    data-testid="button-select-logo"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {logoFile ? logoFile.name : 'Select Logo'}
                  </Button>
                </label>
              </div>
            </div>

            {/* Main Message */}
            <FormField
              control={form.control}
              name="mainMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    Main Message <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Textarea
                        placeholder="e.g., Quality Plumbing Services - Available 24/7"
                        {...field}
                        maxLength={40}
                        data-testid="input-main-message"
                        className="resize-none"
                      />
                      <p className="text-sm text-muted-foreground text-right">
                        {mainMessage.length}/40 characters
                      </p>
                    </div>
                  </FormControl>
                  <FormDescription>
                    The key message that will grab attention (max 40 characters)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* QR Code Options */}
            <FormField
              control={form.control}
              name="qrCodeDestination"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="flex items-center gap-2">
                    <QrCode className="h-4 w-4" />
                    QR Code Destination
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="website" data-testid="radio-qr-website" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Website
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="social" data-testid="radio-qr-social" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Social Media Profile
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="other" data-testid="radio-qr-other" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Other Link
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="none" data-testid="radio-qr-none" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          No QR Code
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* QR Code URL (conditional) */}
            {qrCodeDestination !== "none" && (
              <>
                <FormField
                  control={form.control}
                  name="qrCodeUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>QR Code URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://yourwebsite.com"
                          {...field}
                          data-testid="input-qr-url"
                        />
                      </FormControl>
                      <FormDescription>
                        Where should the QR code take people?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="qrCodeLabel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>QR Code Label</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Visit Our Website, Follow Us"
                          {...field}
                          data-testid="input-qr-label"
                        />
                      </FormControl>
                      <FormDescription>
                        Text to display near the QR code
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Brand Colors */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="brandColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Primary Brand Color
                    </FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-3">
                        <Input
                          type="color"
                          {...field}
                          className="w-20 h-10 cursor-pointer"
                          data-testid="input-brand-color"
                        />
                        <Input
                          type="text"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          placeholder="#000000"
                          className="flex-1"
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      The main color that represents your brand
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="secondaryColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Secondary Color (Optional)</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-3">
                        <Input
                          type="color"
                          {...field}
                          className="w-20 h-10 cursor-pointer"
                          data-testid="input-secondary-color"
                        />
                        <Input
                          type="text"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value)}
                          placeholder="#000000"
                          className="flex-1"
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Additional brand color if you use one
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="additionalColor1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Color 1 (Optional)</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-3">
                        <Input
                          type="color"
                          {...field}
                          className="w-20 h-10 cursor-pointer"
                          data-testid="input-additional-color-1"
                        />
                        <Input
                          type="text"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value)}
                          placeholder="#000000"
                          className="flex-1"
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Third color for your brand palette
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="additionalColor2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Color 2 (Optional)</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-3">
                        <Input
                          type="color"
                          {...field}
                          className="w-20 h-10 cursor-pointer"
                          data-testid="input-additional-color-2"
                        />
                        <Input
                          type="text"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value)}
                          placeholder="#000000"
                          className="flex-1"
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Fourth color for your brand palette
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Ad Style */}
            <FormField
              control={form.control}
              name="adStyle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ad Style Preference</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-ad-style">
                        <SelectValue placeholder="Select a style" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="modern" data-testid="option-modern">Modern & Minimal</SelectItem>
                      <SelectItem value="professional" data-testid="option-professional">Professional & Corporate</SelectItem>
                      <SelectItem value="bold" data-testid="option-bold">Bold & Eye-Catching</SelectItem>
                      <SelectItem value="friendly" data-testid="option-friendly">Friendly & Approachable</SelectItem>
                      <SelectItem value="elegant" data-testid="option-elegant">Elegant & Sophisticated</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The overall look and feel you want for your ad
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Optional Image Upload */}
            <div className="space-y-2">
              <Label htmlFor="image-upload" className="flex items-center gap-2">
                <ImagePlus className="h-4 w-4" />
                Optional Additional Image
              </Label>
              <p className="text-sm text-muted-foreground">
                Upload a product photo or other image to include (PNG or JPG, max 5MB)
              </p>
              <div className="flex items-center gap-3">
                <input
                  id="image-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={(e) => setOptionalImageFile(e.target.files?.[0] || null)}
                  className="hidden"
                  data-testid="input-optional-image"
                />
                <label htmlFor="image-upload" className="flex-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => document.getElementById('image-upload')?.click()}
                    data-testid="button-select-image"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {optionalImageFile ? optionalImageFile.name : 'Select Image (Optional)'}
                  </Button>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={submitBriefMutation.isPending}
              data-testid="button-submit-brief"
            >
              {submitBriefMutation.isPending ? "Submitting..." : "Submit Design Brief"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
