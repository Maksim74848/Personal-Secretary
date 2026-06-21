import { Link, useLocation } from "wouter";
import { useTheme } from "@/lib/theme";
import {
  LayoutDashboard, MessageSquare, Calendar, CheckSquare,
  Users, Activity, Send, Shield, Brain, ScrollText, Moon, Sun, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetUserStatus } from "@workspace/api-client-react";

const NAV = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/chat", icon: MessageSquare, label: "Chat" },
  { path: "/calendar", icon: Calendar, label: "Calendar" },
  { path: "/tasks", icon: CheckSquare, label: "Tasks" },
  { path: "/contacts", icon: Users, label: "Contacts" },
  { path: "/status", icon: Activity, label: "Status" },
  { path: "/telegram", icon: Send, label: "Telegram" },
  { path: "/rules", icon: Shield, label: "Rules" },
  { path: "/memory", icon: Brain, label: "Memory" },
  { path: "/logs", icon: ScrollText, label: "Logs" },
];

const STATUS_COLORS: Record<string, string> = {
  free: "bg-green-500",
  busy: "bg-yellow-500",
  unavailable: "bg-red-500",
  custom: "bg-purple-500",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { theme, toggle } = useTheme();
  const { data: status } = useGetUserStatus();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-sidebar-border">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <Zap size={14} className="text-white" />
          </div>
          <div>
            <span className="text-sidebar-foreground font-semibold text-sm tracking-wide">ARIA</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_COLORS[status?.status ?? "free"] ?? "bg-green-500")} />
              <span className="text-xs text-sidebar-foreground opacity-50 capitalize">{status?.status ?? "free"}</span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto scrollbar-thin">
          {NAV.map(({ path, icon: Icon, label }) => {
            const active = location === path || (path !== "/" && location.startsWith(path));
            return (
              <Link
                key={path}
                href={path}
                data-testid={`nav-${label.toLowerCase()}`}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-all duration-150 cursor-pointer",
                  active
                    ? "bg-primary text-white font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon size={15} className="flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-sidebar-border">
          <button
            data-testid="button-theme-toggle"
            onClick={toggle}
            className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-xs text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        {children}
      </main>
    </div>
  );
}
