import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../auth/AuthProvider";
import ProtectedRoute from "../auth/ProtectedRoute";
import { AppLayout } from "../components/layout/AppLayout";

// Core feature screens
import { LoginScreen } from "../features/auth/LoginScreen";
import { DashboardScreen } from "../features/dashboard/DashboardScreen";
import { TestingPlaygroundScreen } from "../features/playground/TestingPlaygroundScreen";
import { KnowledgeBaseScreen } from "../features/knowledge/KnowledgeBaseScreen";
import { TicketsScreen } from "../features/tickets/TicketsScreen";
import { BusinessRulesScreen } from "../features/rules/BusinessRulesScreen";
import { OnboardingScreen } from "../features/onboarding/OnboardingScreen";
import { SettingsScreen } from "../features/settings/SettingsScreen";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public authentication route */}
        <Route path="/login" element={<LoginScreen />} />

        {/* Protected application workspace */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            {/* Core Essential Routes */}
            <Route path="/" element={<DashboardScreen />} />
            <Route path="/playground" element={<TestingPlaygroundScreen />} />
            <Route path="/knowledge" element={<KnowledgeBaseScreen />} />
            <Route path="/tickets" element={<TicketsScreen />} />
            <Route path="/rules" element={<BusinessRulesScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="/onboarding" element={<OnboardingScreen />} />

            {/* Clean Redirects for simplified navigation */}
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
            <Route path="/chat" element={<Navigate to="/playground" replace />} />
            <Route path="/conversations" element={<Navigate to="/playground" replace />} />
            <Route path="/customers" element={<Navigate to="/tickets" replace />} />
            <Route path="/analytics" element={<Navigate to="/" replace />} />
            <Route path="/agent" element={<Navigate to="/settings" replace />} />
            <Route path="/flows" element={<Navigate to="/rules" replace />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
