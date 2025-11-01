import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";

export default function HomePage() {
  const { user } = useAuth();
  
  // Redirect customers to booking page, admins to admin dashboard
  if (user?.role === "admin") {
    return <Redirect to="/admin" />;
  }
  
  return <Redirect to="/customer/booking" />;
}
