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
                  </div>
                  
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">Business Registration Benefits</span>
                    </div>
                    <ul className="text-xs text-green-700 space-y-1">
                      <li>✓ Custom ad design included (normally $200-500 extra)</li>
                      <li>✓ Premium printing on high-quality glossy stock</li>
                      <li>✓ Guaranteed exclusive industry slot—no competitors</li>
                      <li>✓ EDDM delivery to 5,000 targeted households</li>
                      <li>✓ QR code tracking to measure results</li>
                      <li>✓ Priority access to new routes and campaigns</li>
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
                Reach Alaska Customers Through Direct Mail
                <span className="block mt-2" style={{ color: '#EE5E18' }}>We Handle Everything</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-lg">
                Professional design, premium printing, and guaranteed delivery to 5,000 Anchorage households. 
                Book your exclusive industry slot and we'll create a custom ad that gets results. No designer needed.
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-card border border-border rounded-lg p-4">
                  <div className="font-semibold" style={{ color: '#EE5E18' }}>Everything Included</div>
                  <div className="text-muted-foreground">Design + Print + Mail</div>
                </div>
                <div className="bg-card border border-border rounded-lg p-4">
                  <div className="font-semibold" style={{ color: '#EE5E18' }}>5,000 Households</div>
                  <div className="text-muted-foreground">per route</div>
                </div>
                <div className="bg-card border border-border rounded-lg p-4">
                  <div className="font-semibold" style={{ color: '#EE5E18' }}>$400 Launch Special</div>
                  <div className="text-muted-foreground">Save $200 (Regular $600)</div>
                </div>
                <div className="bg-card border border-border rounded-lg p-4">
                  <div className="font-semibold" style={{ color: '#EE5E18' }}>16 Industries</div>
                  <div className="text-muted-foreground">Exclusive slots per route</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
