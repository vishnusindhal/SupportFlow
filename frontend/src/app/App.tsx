import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../auth/AuthProvider";
import ProtectedRoute from "../auth/ProtectedRoute";
import { AppLayout } from "../components/layout/AppLayout";

// Feature screens
import { LoginScreen } from "../features/auth/LoginScreen";
import { DashboardScreen } from "../features/dashboard/DashboardScreen";
import { OnboardingScreen } from "../features/onboarding/OnboardingScreen";
import { KnowledgeBaseScreen } from "../features/knowledge/KnowledgeBaseScreen";
import { BusinessRulesScreen } from "../features/rules/BusinessRulesScreen";
import { ConversationFlowsScreen } from "../features/flows/ConversationFlowsScreen";
import { TestingPlaygroundScreen } from "../features/playground/TestingPlaygroundScreen";
import { AgentSetupScreen } from "../features/agent/AgentSetupScreen";
import { ConversationsScreen } from "../features/conversations/ConversationsScreen";
import { TicketsScreen } from "../features/tickets/TicketsScreen";
import { CustomersScreen } from "../features/customers/CustomersScreen";
import { AnalyticsScreen } from "../features/analytics/AnalyticsScreen";
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
            {/* Workspace Routes */}
            <Route path="/" element={<DashboardScreen />} />
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
            <Route path="/conversations" element={<ConversationsScreen />} />
            <Route path="/tickets" element={<TicketsScreen />} />
            <Route path="/customers" element={<CustomersScreen />} />

            {/* AI Agent Routes */}
            <Route path="/agent" element={<AgentSetupScreen />} />
            <Route path="/knowledge" element={<KnowledgeBaseScreen />} />
            <Route path="/flows" element={<ConversationFlowsScreen />} />
            <Route path="/rules" element={<BusinessRulesScreen />} />
            <Route path="/playground" element={<TestingPlaygroundScreen />} />
            <Route path="/chat" element={<TestingPlaygroundScreen />} />

            {/* Insights */}
            <Route path="/analytics" element={<AnalyticsScreen />} />

            {/* Settings & Setup */}
            <Route path="/onboarding" element={<OnboardingScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
