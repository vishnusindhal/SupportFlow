import { Link, useLocation } from "react-router-dom";
import { Sparkles, Menu, Shield } from "lucide-react";
import { Button } from "../ui/Button";

interface TopBarProps {
  onOpenMobileMenu?: () => void;
  agentReady?: boolean;
}

export function TopBar({ onOpenMobileMenu, agentReady = true }: TopBarProps) {
  const location = useLocation();

  const getBreadcrumb = (path: string): { section: string; title: string } => {
    switch (true) {
      case path === "/":
        return { section: "SupportFlow", title: "Dashboard" };
      case path.startsWith("/playground"):
        return { section: "AI Agent", title: "Chat & Test Agent" };
      case path.startsWith("/knowledge"):
        return { section: "AI Agent", title: "Knowledge Base" };
      case path.startsWith("/tickets"):
        return { section: "Support", title: "Tickets & Escalations" };
      case path.startsWith("/rules"):
        return { section: "Automation", title: "Business Rules" };
      case path.startsWith("/onboarding"):
        return { section: "Setup", title: "Company Onboarding" };
      case path.startsWith("/settings"):
        return { section: "Settings", title: "Organization Settings" };
      default:
        return { section: "SupportFlow", title: "Console" };
    }
  };

  const breadcrumb = getBreadcrumb(location.pathname);

  return (
    <header className="h-16 bg-white border-b border-warm-border px-4 sm:px-6 flex items-center justify-between gap-4 z-20 shrink-0">
      {/* Left: Mobile trigger & Breadcrumb */}
      <div className="flex items-center gap-3">
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="md:hidden text-slate-text hover:text-charcoal p-1.5 rounded-lg hover:bg-ivory"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-text font-medium">{breadcrumb.section}</span>
          <span className="text-warm-border">/</span>
          <span className="font-semibold text-charcoal">{breadcrumb.title}</span>
        </div>
      </div>

      {/* Right: Live Agent Status & Action buttons */}
      <div className="flex items-center gap-3">
        {/* Agent Health Pill */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-ivory border border-warm-border text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              agentReady ? "bg-mint-dark animate-pulse" : "bg-status-warning"
            }`}
          />
          <span className="text-slate-text font-medium">Agent:</span>
          <span className={`font-semibold ${agentReady ? "text-mint-dark" : "text-amber-800"}`}>
            {agentReady ? "Ready & Grounded" : "Setup Incomplete"}
          </span>
        </div>

        {/* Tenant Boundary Indicator */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-aubergine/5 border border-aubergine/10 text-[11px] text-aubergine font-medium">
          <Shield className="w-3.5 h-3.5 text-aubergine" />
          <span>Tenant Isolated</span>
        </div>

        {/* Test Agent shortcut CTA */}
        {location.pathname !== "/playground" && (
            <Link to="/playground">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Sparkles className="w-3.5 h-3.5" />}
              >
                Test Agent
              </Button>
            </Link>
          )}
      </div>
    </header>
  );
}
