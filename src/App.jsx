import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import DashboardLayout from "./layout/DashboardLayout";

import Dashboard from "./pages/Dashboard";
import CustomersPage from "./pages/CustomersPage";
import Signup from "./pages/Signup";
import SignupSuccess from "./pages/SignupSuccess";
import Schedule from "./pages/Schedule";
import RoutesPage from "./pages/Routes";
import DriverDashboard from "./pages/DriverDashboard";
import Billing from "./pages/Billing";
import Settings from "./pages/Settings";
import Map from "./pages/Map";
import ServiceHistory from "./pages/ServiceHistory";

function RequireAccess({ children }) {
  const isUnlocked = localStorage.getItem("br_crm_unlocked") === "true";

  if (!isUnlocked) {
    const code = window.prompt("Enter Backyard Relief CRM access code:");

    if (code === import.meta.env.VITE_CRM_ACCESS_CODE) {
      localStorage.setItem("br_crm_unlocked", "true");
      return children;
    }

    return <Navigate to="/signup" replace />;
  }

  return children;
}

function ProtectedLayout({ children }) {
  return (
    <RequireAccess>
      <DashboardLayout>{children}</DashboardLayout>
    </RequireAccess>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* MAIN DOMAIN / ROOT GOES TO PUBLIC SIGNUP */}
        <Route
  path="/"
  element={
    window.location.hostname.startsWith("crm.")
      ? <Navigate to="/dashboard" replace />
      : <Navigate to="/signup" replace />
  }
/>

        {/* PUBLIC CUSTOMER SIGNUP PAGE */}
        <Route path="/signup" element={<Signup />} />
        <Route path="/signup-success" element={<SignupSuccess />} />

        {/* PROTECTED CRM DASHBOARD */}
        <Route
          path="/dashboard"
          element={
            <ProtectedLayout>
              <Dashboard />
            </ProtectedLayout>
          }
        />

        <Route
          path="/customers"
          element={
            <ProtectedLayout>
              <CustomersPage />
            </ProtectedLayout>
          }
        />

        <Route
          path="/schedule"
          element={
            <ProtectedLayout>
              <Schedule />
            </ProtectedLayout>
          }
        />

        <Route
          path="/routes"
          element={
            <ProtectedLayout>
              <RoutesPage />
            </ProtectedLayout>
          }
        />

        <Route
          path="/driver"
          element={
            <ProtectedLayout>
              <DriverDashboard />
            </ProtectedLayout>
          }
        />

        <Route
          path="/map"
          element={
            <ProtectedLayout>
              <Map />
            </ProtectedLayout>
          }
        />

        <Route
          path="/billing"
          element={
            <ProtectedLayout>
              <Billing />
            </ProtectedLayout>
          }
        />

        <Route
          path="/service-history"
          element={
            <ProtectedLayout>
              <ServiceHistory />
            </ProtectedLayout>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedLayout>
              <Settings />
            </ProtectedLayout>
          }
        />

        <Route path="*" element={<Navigate to="/signup" replace />} />
      </Routes>
    </BrowserRouter>
  );
}