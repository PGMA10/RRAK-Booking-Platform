import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation, Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building, User, Mail, Phone, FileText, CheckCircle, Loader2, Lock } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { passwordSchema } from "@/lib/password-validation";
import { PasswordStrengthIndicator } from "@/components/password-strength-indicator";

// Customer registration form schema
const customerRegistrationSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(30, "Username too long"),
  password: passwordSchema,
  businessName: z.string().min(1, "Business name is required").max(100, "Business name too long"),
  contactPersonName: z.string().optional(),
  email: z.string().email("Valid email address is required"),
  phone: z.string().min(10, "Phone number must be at least 10 digits").max(15, "Phone number too long"),
});

type CustomerRegistrationData = z.infer<typeof customerRegistrationSchema>;

export default function CustomerRegistrationPage() {
  const { user, registerMutation } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Form handling
  const form = useForm<CustomerRegistrationData>({
    resolver: zodResolver(customerRegistrationSchema),
    defaultValues: {
      username: "",
      password: "",
      businessName: "",
      contactPersonName: "",
      email: "",
      phone: "",
    },
  });
  
  // Redirect if already logged in (AFTER all hooks are called)
  if (user) {
    return <Redirect to={user.role === "admin" ? "/admin" : "/customer/booking"} />;
  }

  // Form submission
  const handleRegistration = (data: CustomerRegistrationData) => {
    // Use existing auth registration mutation
    registerMutation.mutate({
      username: data.username,
      password: data.password,
      email: data.email,
      name: data.contactPersonName,
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
                          <Lock className="h-4 w-4" />
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
                        <PasswordStrengthIndicator password={field.value || ""} />
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

                  {/* Submit Button */}
                  <div className="flex justify-end space-x-4 pt-6">
                    <Link href="/auth">
                      <Button variant="outline" data-testid="button-cancel-registration">
                        Cancel
                      </Button>
                    </Link>
                    <Button 
                      type="submit" 
                      disabled={registerMutation.isPending}
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
                    <h4 className="font-medium">Professional Design Included</h4>
                    <p className="text-sm text-muted-foreground">
                      We create your custom ad—no designer needed. Just tell us your offer and we handle the rest.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Exclusive Industry Slots</h4>
                    <p className="text-sm text-muted-foreground">
                      Only one business per industry per route. Zero competition on your postcard.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Complete Turnkey Service</h4>
                    <p className="text-sm text-muted-foreground">
                      Design, premium printing, and EDDM delivery to 5,000+ households. You provide the offer, we do everything else.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium">No Hidden Fees</h4>
                    <p className="text-sm text-muted-foreground">
                      Everything included starting at $600 per slot. Multi-slot and loyalty discounts available.
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