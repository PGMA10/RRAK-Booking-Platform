import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building, Calendar, ArrowRight, Star } from "lucide-react";
import { DemoBanner } from "@/components/demo-banner";

export default function AuthPage() {
  const { user, loginMutation } = useAuth();
  const [loginData, setLoginData] = useState({ username: "", password: "" });

  // Redirect if already logged in - admin users go to admin panel, customers go to customer dashboard
  if (user) {
    return <Redirect to={user.role === "admin" ? "/admin" : "/customer/dashboard"} />;
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginData);
  };


  return (
    <div className="min-h-screen bg-background">
      <DemoBanner />
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Left Column - Auth Forms */}
          <div className="flex items-center justify-center">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-primary">Route Reach AK</CardTitle>
                <CardDescription>
                  Direct mail booking platform for Alaska businesses
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Login Section */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-foreground mb-2">Login</h3>
                  <p className="text-sm text-muted-foreground mb-4">Admin dashboard or customer booking access</p>
                </div>
                
                <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-username">Username</Label>
                        <Input
                          id="login-username"
                          data-testid="input-login-username"
                          type="text"
                          value={loginData.username}
                          onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password">Password</Label>
                        <Input
                          id="login-password"
                          data-testid="input-login-password"
                          type="password"
                          value={loginData.password}
                          onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                          required
                        />
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={loginMutation.isPending}
                        data-testid="button-login-submit"
                      >
                        {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Login
                      </Button>
                </form>
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Demo Credentials:</p>
                  <p className="text-sm font-mono">Admin → Username: admin, Password: admin</p>
                  <p className="text-sm font-mono">Customer → Use registered account</p>
                </div>

                
                {/* Customer Options */}
                <div className="mt-8">
                  <Separator className="mb-6" />
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold text-foreground">New Business?</h3>
                    <p className="text-sm text-muted-foreground">Register your business to access customer booking</p>
                  </div>
                  
                  <div className="space-y-3">
                    <Link href="/customer/register">
                      <Button 
                        variant="default" 
                        className="w-full" 
                        data-testid="button-business-registration"
                      >
                        <Building className="h-4 w-4 mr-2" />
                        New Business Registration
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                    
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800 font-medium">Already have an account?</p>
                      <p className="text-xs text-blue-700 mt-1">Use the login form above with your registered username and password</p>
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">Business Registration Benefits</span>
                    </div>
                    <ul className="text-xs text-green-700 space-y-1">
                      <li>• Complete business verification process</li>
                      <li>• License validation and industry confirmation</li>
                      <li>• Streamlined booking for future campaigns</li>
                      <li>• Priority access to new routes and features</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Hero Section */}
          <div className="flex items-center justify-center lg:justify-start">
            <div className="text-center lg:text-left">
              <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">
                Reach Alaska Customers
                <span className="text-primary block">Through Direct Mail</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-lg">
                Book exclusive industry slots on shared postcard campaigns across 4 Alaska routes. 
                Connect with customers in Anchorage's key areas with targeted direct mail marketing.
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-card border border-border rounded-lg p-4">
                  <div className="font-semibold text-primary">4 Routes</div>
                  <div className="text-muted-foreground">Anchorage areas</div>
                </div>
                <div className="bg-card border border-border rounded-lg p-4">
                  <div className="font-semibold text-accent">16 Industries</div>
                  <div className="text-muted-foreground">Per route</div>
                </div>
                <div className="bg-card border border-border rounded-lg p-4">
                  <div className="font-semibold text-chart-3">$600</div>
                  <div className="text-muted-foreground">Per slot</div>
                </div>
                <div className="bg-card border border-border rounded-lg p-4">
                  <div className="font-semibold text-chart-5">Monthly</div>
                  <div className="text-muted-foreground">Campaigns</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
