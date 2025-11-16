import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import BookingPage from "@/pages/booking-page";
import CalendarPage from "@/pages/calendar-page";
import AdminPage from "@/pages/admin-page";
import AdminArtworkReviewPage from "@/pages/admin-artwork-review-page";
import AdminNotificationsPage from "@/pages/admin-notifications-page";
import AdminDesignBriefsPage from "@/pages/admin-design-briefs-page";
import RouteManagementPage from "@/pages/route-management-page";
import IndustryManagementPage from "@/pages/industry-management-page";
import CampaignManagementPage from "@/pages/campaign-management-page";
import SlotGridPage from "@/pages/slot-grid-page";
import CRMPage from "@/pages/crm-page";
import CRMCustomerDetailPage from "@/pages/crm-customer-detail-page";
import CustomerDashboardPage from "@/pages/customer-dashboard-page";
import CustomerRegistrationPage from "@/pages/customer-registration-page";
import CustomerBookingPage from "@/pages/customer-booking-page";
import MultiCampaignBookingPage from "@/pages/multi-campaign-booking-page";
import CustomerPaymentPage from "@/pages/customer-payment-page";
import CustomerConfirmationPage from "@/pages/customer-confirmation-page";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/booking" component={BookingPage} />
      <ProtectedRoute path="/calendar" component={CalendarPage} />
      <ProtectedRoute path="/admin" component={AdminPage} />
      <ProtectedRoute path="/admin/artwork" component={AdminArtworkReviewPage} />
      <ProtectedRoute path="/admin/design-briefs" component={AdminDesignBriefsPage} />
      <ProtectedRoute path="/admin/notifications" component={AdminNotificationsPage} />
      <ProtectedRoute path="/admin/routes" component={RouteManagementPage} />
      <ProtectedRoute path="/admin/industries" component={IndustryManagementPage} />
      <ProtectedRoute path="/admin/campaigns" component={CampaignManagementPage} />
      <ProtectedRoute path="/admin/slots" component={SlotGridPage} />
      <ProtectedRoute path="/admin/crm" component={CRMPage} />
      <ProtectedRoute path="/admin/crm/customer/:id" component={CRMCustomerDetailPage} />
      <Route path="/customer/register" component={CustomerRegistrationPage} />
      <ProtectedRoute path="/customer/dashboard" component={CustomerDashboardPage} />
      <ProtectedRoute path="/customer/booking" component={CustomerBookingPage} />
      <ProtectedRoute path="/customer/booking/multi" component={MultiCampaignBookingPage} />
      <ProtectedRoute path="/customer/payment" component={CustomerPaymentPage} />
      <ProtectedRoute path="/customer/confirmation" component={CustomerConfirmationPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
