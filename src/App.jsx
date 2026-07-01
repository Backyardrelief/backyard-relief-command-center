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
import Schedule from "./pages/Schedule";
import RoutesPage from "./pages/Routes";
import Billing from "./pages/Billing";
import Settings from "./pages/Settings";
import Map from "./pages/Map";

export default function App() {
  return (
    <BrowserRouter>
      <DashboardLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />

          <Route path="/customers" element={<CustomersPage />} />

          <Route path="/signup" element={<Signup />} />

          <Route path="/schedule" element={<Schedule />} />

          <Route path="/routes" element={<RoutesPage />} />

          <Route path="/map" element={<Map />} />

          <Route path="/billing" element={<Billing />} />

          <Route path="/settings" element={<Settings />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </DashboardLayout>
    </BrowserRouter>
  );
}