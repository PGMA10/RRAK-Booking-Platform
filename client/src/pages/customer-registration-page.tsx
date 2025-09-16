import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation, Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building, User, Mail, Phone, FileText, Briefcase, CheckCircle, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import type { Industry } from "@shared/schema";

// Customer registration form schema
const customerRegistrationSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(30, "Username too long"),
  password: z.string().min(6, "Password must be at least 6 characters").max(50, "Password too long"),
  businessName: z.string().min(1, "Business name is required").max(100, "Business name too long"),
  email: z.string().email("Valid email address is required"),
  phone: z.string().min(10, "Phone number must be at least 10 digits").max(15, "Phone number too long"),
  licenseNumber: z.string().min(1, "Business license number is required").max(50, "License number too long"),
  industryId: z.string().min(1, "Please select an industry"),
});

type CustomerRegistrationData = z.infer<typeof customerRegistrationSchema>;

export default function CustomerRegistrationPage() {
  const { user, registerMutation } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // Redirect if already logged in
  if (user) {
    return <Redirect to={user.role === "admin" ? "/admin" : "/customer/booking"} />;
  }
  
  // License verification state
  const [isVerifyingLicense, setIsVerifyingLicense] = useState(false);
  const [licenseVerified, setLicenseVerified] = useState(false);
  const [licenseVerificationDetails, setLicenseVerificationDetails] = useState<{
    valid: boolean;
    business: string;
    license: string;
  } | null>(null);

  // Form handling
  const form = useForm<CustomerRegistrationData>({
    resolver: zodResolver(customerRegistrationSchema),
    defaultValues: {
      username: "",
      password: "",
      businessName: "",
      email: "",
      phone: "",
      licenseNumber: "",
      industryId: "",
    },
  });

  // Data fetching - get industries for dropdown
  const { data: industries = [] } = useQuery<Industry[]>({
    queryKey: ["/api/industries"],
  });

  // Use existing auth registration mutation
  // Note: registerMutation handles the API call and navigation automatically

  // Mock license verification
  const handleLicenseVerification = async () => {
    const licenseNumber = form.getValues("licenseNumber");
    const businessName = form.getValues("businessName");
    
    if (!licenseNumber || !businessName) {
      toast({
        variant: "destructive",
        description: "Please enter business name and license number first",
      });
      return;
    }

    setIsVerifyingLicense(true);
    
    try {
      // Mock API call to verify license
      const response = await apiRequest("/api/verify-license", "POST", {
        licenseNumber,
        businessName,
      });
      
      const data = await response.json();
      setLicenseVerificationDetails(data);
      setLicenseVerified(data.valid);
      
      if (data.valid) {
        toast({ description: "License verified successfully!" });
      } else {
        toast({
          variant: "destructive", 
          description: "License verification failed. Please check your details.",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        description: "License verification failed. Please try again.",
      });
    } finally {
      setIsVerifyingLicense(false);
    }
  };

  // Form submission
  const handleRegistration = (data: CustomerRegistrationData) => {
    if (!licenseVerified) {
      toast({
        variant: "destructive",
        description: "Please verify your business license before registering",
      });
      return;
    }

    // Use existing auth registration mutation
    registerMutation.mutate({
      username: data.username,
      password: data.password,
      email: data.email,
      businessName: data.businessName,
      phone: data.phone,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/auth">
              <Button variant="outline" size="sm" data-testid="button-back-to-login">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Login
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">
                Business Registration
              </h1>
              <p className="text-muted-foreground" data-testid="text-page-description">
                Register your business to book direct mail campaign slots
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Business Information
              </CardTitle>
              <CardDescription>
                Provide your business details to get started with Route Reach AK
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleRegistration)} className="space-y-6">
                  {/* Username */}
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Username
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Choose a username" 
                            {...field} 
                            data-testid="input-username"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Password */}
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Password
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="password"
                            placeholder="Create a secure password" 
                            {...field} 
                            data-testid="input-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Business Name */}
                  <FormField
                    control={form.control}
                    name="businessName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          Business Name
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter your business name" 
                            {...field} 
                            data-testid="input-business-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Contact Person Name */}
                  <FormField
                    control={form.control}
                    name="contactPersonName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Contact Person Name
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter contact person's full name" 
                            {...field} 
                            data-testid="input-contact-person"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Email */}
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Email Address
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="Enter business email address" 
                            {...field} 
                            data-testid="input-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Phone */}
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Phone Number
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="tel" 
                            placeholder="Enter business phone number" 
                            {...field} 
                            data-testid="input-phone"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* License Number with Verification */}
                  <FormField
                    control={form.control}
                    name="licenseNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Business License Number
                        </FormLabel>
                        <div className="flex gap-2">
                          <FormControl className="flex-1">
                            <Input 
                              placeholder="Enter business license number" 
                              {...field} 
                              data-testid="input-license-number"
                            />
                          </FormControl>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={handleLicenseVerification}
                            disabled={isVerifyingLicense || !field.value || !form.getValues("businessName")}
                            data-testid="button-verify-license"
                          >
                            {isVerifyingLicense ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Verifying...
                              </>
                            ) : (
                              <>
                                <FileText className="h-4 w-4 mr-2" />
                                Verify
                              </>
                            )}
                          </Button>
                        </div>
                        {licenseVerificationDetails && (
                          <div className="mt-2">
                            {licenseVerified ? (
                              <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                License Verified
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                License Invalid
                              </Badge>
                            )}
                            <p className="text-xs text-muted-foreground mt-1" data-testid="text-license-details">
                              Business: {licenseVerificationDetails.business} | License: {licenseVerificationDetails.license}
                            </p>
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Industry Selection */}
                  <FormField
                    control={form.control}
                    name="industryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4" />
                          Business Industry
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-industry">
                              <SelectValue placeholder="Select your business industry" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {industries.map((industry) => (
                              <SelectItem 
                                key={industry.id} 
                                value={industry.id}
                                data-testid={`option-industry-${industry.name.replace(/\s+/g, '-').toLowerCase()}`}
                              >
                                {industry.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Submit Button */}
                  <div className="flex justify-end space-x-4 pt-6">
                    <Link href="/auth">
                      <Button variant="outline" data-testid="button-cancel-registration">
                        Cancel
                      </Button>
                    </Link>
                    <Button 
                      type="submit" 
                      disabled={registerMutation.isPending || !licenseVerified}
                      data-testid="button-submit-registration"
                    >
                      {registerMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Registering...
                        </>
                      ) : (
                        "Complete Registration"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Registration Benefits */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Why Register with Route Reach AK?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Exclusive Industry Slots</h4>
                    <p className="text-sm text-muted-foreground">
                      Only one business per industry per route - no direct competition
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Professional Direct Mail</h4>
                    <p className="text-sm text-muted-foreground">
                      High-quality postcards delivered to thousands of households
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Targeted Routes</h4>
                    <p className="text-sm text-muted-foreground">
                      Choose specific Anchorage zip codes that match your service area
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Affordable Marketing</h4>
                    <p className="text-sm text-muted-foreground">
                      Just $600 per slot - cost-effective way to reach new customers
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}