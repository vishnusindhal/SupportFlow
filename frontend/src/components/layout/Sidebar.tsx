import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Sparkles,
  Database,
  AlertCircle,
  Scale,
  Sliders,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { useAuth } from "../../auth/AuthProvider";
import { SHOW_BUSINESS_RULES } from "../../app/featureFlags";

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
}

export function Sidebar() {
  const location = useLocation();
  const { session, signOut } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems: NavItem[] = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Chat & Test Agent", href: "/playground", icon: Sparkles },
    { label: "Knowledge Base", href: "/knowledge", icon: Database },
    { label: "Tickets", href: "/tickets", icon: AlertCircle },
    ...(SHOW_BUSINESS_RULES ? [{ label: "Business Rules", href: "/rules", icon: Scale }] : []),
    { label: "Settings", href: "/settings", icon: Sliders },
  ];

  const currentPath = location.pathname;

  return (
    <aside
      className={`bg-aubergine text-white flex flex-col justify-between shrink-0 transition-all duration-300 z-30 select-none border-r border-aubergine-dark relative ${
        isCollapsed ? "w-18" : "w-64"
      }`}
    >
      {/* Top Organization Header */}
      <div>
        <div className="p-4 border-b border-aubergine-light/40 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-lg bg-coral flex items-center justify-center shrink-0 shadow-sm text-white font-bold text-lg tracking-tight">
              S
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white tracking-tight truncate">
                  {session?.organization?.name ?? "SupportFlow"}
                </div>
                <div className="text-xs text-lavender/70 font-mono truncate">
                  {session?.membership?.role ?? "tenant"} workspace
                </div>
              </div>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-lavender/60 hover:text-white p-1 rounded-md hover:bg-aubergine-light/50 transition-colors hidden md:block cursor-pointer"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Clean Navigation List */}
        <nav className="p-3 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? currentPath === "/"
                : currentPath.startsWith(item.href);

            return (
              <Link
                key={item.href}
                to={item.href}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all group relative ${
                  isActive
                    ? "bg-aubergine-light text-white shadow-xs font-semibold before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-coral before:rounded-r"
                    : "text-lavender/75 hover:text-white hover:bg-aubergine-light/40"
                } ${isCollapsed ? "justify-center px-0" : ""}`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? "text-coral" : "text-lavender/60 group-hover:text-lavender"
                  }`}
                />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Profile Footer */}
      <div className="p-3 border-t border-aubergine-light/40 bg-aubergine-dark/30">
        <div
          className={`flex items-center gap-3 p-2 rounded-lg hover:bg-aubergine-light/40 transition-colors ${
            isCollapsed ? "justify-center" : ""
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-lavender-dark/40 text-lavender border border-lavender/30 flex items-center justify-center text-xs font-bold shrink-0">
            {session?.user?.display_name?.charAt(0).toUpperCase() ?? "U"}
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-white truncate">
                {session?.user?.display_name ?? "User"}
              </div>
              <div className="text-[11px] text-lavender/60 truncate">
                {session?.user?.email}
              </div>
            </div>
          )}
          {!isCollapsed && (
            <button
              type="button"
              onClick={() => void signOut()}
              title="Sign out"
              className="text-lavender/60 hover:text-coral p-1 rounded-md hover:bg-aubergine-light/50 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
