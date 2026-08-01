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
import Messages from "./pages/Messages";

function RequireAccess({ children }) {
  const expectedAccessCode =
    import.meta.env.VITE_CRM_ACCESS_CODE;

  const isUnlocked =
    localStorage.getItem("br_crm_unlocked") ===
    "true";

  /*
    Repair older unlocked sessions that were created
    before the CRM access code was stored separately.

    The Messages page uses this stored code when it calls
    the send-crm-message Supabase Edge Function.
  */
  if (isUnlocked) {
    const storedAccessCode =
      localStorage.getItem(
        "br_crm_access_code"
      );

    if (
      expectedAccessCode &&
      storedAccessCode !== expectedAccessCode
    ) {
      localStorage.setItem(
        "br_crm_access_code",
        expectedAccessCode
      );
    }

    return children;
  }

  const code = window.prompt(
    "Enter Backyard Relief CRM access code:"
  );

  if (
    code &&
    code === expectedAccessCode
  ) {
    localStorage.setItem(
      "br_crm_unlocked",
      "true"
    );

    localStorage.setItem(
      "br_crm_access_code",
      code
    );

    return children;
  }

  localStorage.removeItem(
    "br_crm_unlocked"
  );

  localStorage.removeItem(
    "br_crm_access_code"
  );

  return <Navigate to="/signup" replace />;
}

function ProtectedLayout({ children }) {
  return (
    <RequireAccess>
      <DashboardLayout>
        {children}
      </DashboardLayout>
    </RequireAccess>
  );
}

function RootRedirect() {
  const hostname =
    window.location.hostname;

  const shouldOpenCrm =
    hostname.startsWith("crm.") ||
    hostname === "localhost" ||
    hostname === "127.0.0.1";

  return (
    <Navigate
      to={
        shouldOpenCrm
          ? "/dashboard"
          : "/signup"
      }
      replace
    />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<RootRedirect />}
        />

        {/* PUBLIC CUSTOMER SIGNUP */}
        <Route
          path="/signup"
          element={<Signup />}
        />

        <Route
          path="/signup-success"
          element={<SignupSuccess />}
        />

        {/* PROTECTED CRM */}
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
          path="/messages"
          element={
            <ProtectedLayout>
              <Messages />
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

        <Route
          path="*"
          element={<RootRedirect />}
        />
      </Routes>
    </BrowserRouter>
  );
}