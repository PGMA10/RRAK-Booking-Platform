import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { LogOut, Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import logoImage from "@assets/Mail and Map Connection Logo_1762489170332.png";

export function Navigation() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  // Fetch notification count for admin users
  const { data: notificationCount } = useQuery<{ count: number }>({
    queryKey: ['/api/notifications/count'],
    enabled: !!user && user.role === "admin",
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const navItems = [
    { 
      path: user?.role === "admin" ? "/admin" : "/customer/dashboard", 
      label: "Dashboard" 
    },
    { path: "/calendar", label: "Calendar" },
    ...(user?.role === "admin" ? [{ path: "/admin/settings", label: "Settings" }] : []),
  ];

  return (
    <nav className="bg-card border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/" data-testid="link-home">
                <div className="flex items-center gap-3">
                  <img src={logoImage} alt="Route Reach AK" className="h-10 w-auto" />
                  <h1 className="text-xl font-bold text-primary hidden sm:block">Route Reach AK</h1>
                </div>
              </Link>
            </div>
            <div className="hidden md:block ml-10">
              <div className="flex items-baseline space-x-4">
                {navItems.map((item) => (
                  <Link key={item.path} href={item.path}>
                    <Button
                      variant={location === item.path ? "default" : "ghost"}
                      className="transition-colors"
                      data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {item.label}
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {user?.role === "admin" && (
              <Link href="/admin/notifications">
                <Button
                  variant={location === "/admin/notifications" ? "default" : "ghost"}
                  className="relative"
                  data-testid="nav-notifications"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Notifications
                  {notificationCount && notificationCount.count > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="ml-2 h-5 min-w-5 flex items-center justify-center px-1.5"
                      data-testid="badge-notification-count"
                    >
                      {notificationCount.count}
                    </Badge>
                  )}
                </Button>
              </Link>
            )}
            <span className="text-sm text-muted-foreground" data-testid="text-welcome-user">
              Welcome, {user?.username || user?.businessName || "User"}
            </span>
            <Button 
              variant="secondary" 
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              data-testid="button-logout"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
