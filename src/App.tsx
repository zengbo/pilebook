import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { Shell } from "./components/Shell";
import { useSession } from "./session";
import { Marketing } from "./pages/Marketing";
import { AuthPage } from "./pages/Auth";
import { Onboarding } from "./pages/Onboarding";
import { Dashboard } from "./pages/Dashboard";
import { CalendarPage } from "./pages/Calendar";
import { JobPage } from "./pages/JobPage";
import { CustomersPage, CustomerPage } from "./pages/Customers";
import { PricingPage } from "./pages/PricingPage";
import { MessagesPage } from "./pages/Messages";
import { SettingsPage } from "./pages/Settings";
import { BookingPage } from "./pages/Booking";
import { PayPage } from "./pages/PayPage";
import { ConfirmedPage } from "./pages/Confirmed";

function LoadingScreen() {
  return <p className="px-6 py-16 text-muted">Loading Pilebook…</p>;
}

function RequireOwner({ children }: { children: ReactNode }) {
  const { user, business, loading } = useSession();
  const location = useLocation();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (!business?.onboardingComplete) return <Navigate to="/onboarding" replace />;
  return <Shell>{children}</Shell>;
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { user, business, loading } = useSession();
  if (loading) return <LoadingScreen />;
  if (user && business?.onboardingComplete) return <Navigate to="/app" replace />;
  if (user && !business) return <Navigate to="/onboarding" replace />;
  return children;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Marketing />} />
      <Route path="/login" element={<GuestOnly><AuthPage mode="login" /></GuestOnly>} />
      <Route path="/signup" element={<GuestOnly><AuthPage mode="signup" /></GuestOnly>} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/app" element={<RequireOwner><Dashboard /></RequireOwner>} />
      <Route path="/app/calendar" element={<RequireOwner><CalendarPage /></RequireOwner>} />
      <Route path="/app/jobs/:id" element={<RequireOwner><JobPage /></RequireOwner>} />
      <Route path="/app/customers" element={<RequireOwner><CustomersPage /></RequireOwner>} />
      <Route path="/app/customers/:id" element={<RequireOwner><CustomerPage /></RequireOwner>} />
      <Route path="/app/pricing" element={<RequireOwner><PricingPage /></RequireOwner>} />
      <Route path="/app/messages" element={<RequireOwner><MessagesPage /></RequireOwner>} />
      <Route path="/app/settings" element={<RequireOwner><SettingsPage /></RequireOwner>} />
      <Route path="/b/:slug" element={<BookingPage />} />
      <Route path="/b/:slug/embed" element={<BookingPage embed />} />
      <Route path="/b/:slug/confirmed/:token" element={<ConfirmedPage />} />
      <Route path="/pay/:id" element={<PayPage />} />
      <Route path="*" element={<Marketing missing />} />
    </Routes>
  );
}
