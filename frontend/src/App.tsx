import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./lib/auth";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AddEntry from "./pages/AddEntry";
import Reports from "./pages/Reports";
import Reminders from "./pages/Reminders";
import VehiclesRoles from "./pages/VehiclesRoles";
import Settings from "./pages/Settings";
import ValidationModel from "./pages/ValidationModel";

/**
 * App routing.
 *
 * - When logged OUT, only the Login / Register screens are shown.
 * - When logged IN, the app screens render inside <Layout> (header + nav).
 *
 * NOTE: The "Validation Model" screen is intentionally a hidden/internal
 * route and is NOT listed in any navigation (see BottomNav.tsx).
 */
export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="auth-brand">Your AI Assistant for Car Care</div>
          <p className="auth-sub">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/add-entry" element={<AddEntry />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/reminders" element={<Reminders />} />
        <Route path="/vehicles" element={<VehiclesRoles />} />
        <Route path="/settings" element={<Settings />} />

        {/* Hidden / internal only — not shown in any navigation. */}
        <Route path="/internal/validation-model" element={<ValidationModel />} />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
