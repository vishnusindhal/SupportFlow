import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { onboardingApi } from "../../api/onboarding";
import { X } from "lucide-react";

export function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [agentReady, setAgentReady] = useState(true);

  useEffect(() => {
    onboardingApi
      .getStatus()
      .then((status) => {
        setAgentReady(status.is_completed);
      })
      .catch(() => {
        setAgentReady(false);
      });
  }, []);

  return (
    <div className="flex h-screen w-full bg-ivory overflow-hidden antialiased">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-aubergine-dark/70 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full bg-aubergine z-10 flex flex-col">
            <div className="absolute right-3 top-3 text-white">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-md text-lavender/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          agentReady={agentReady}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-ivory">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
