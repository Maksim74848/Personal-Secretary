import { Link, useLocation } from "wouter";
import { useTheme } from "@/lib/theme";
import {
  MessageSquare, Calendar, CheckSquare, Users, Settings, Moon, Sun, Zap, FolderOpen, LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetUserStatus } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";

const NAV = [
  { path: "/", icon: MessageSquare, label: "Чат" },
  { path: "/calendar", icon: Calendar, label: "Календарь" },
  { path: "/tasks", icon: CheckSquare, label: "Задачи" },
  { path: "/contacts", icon: Users, label: "Контакты" },
  { path: "/files", icon: FolderOpen, label: "Файлы" },
  { path: "/settings", icon: Settings, label: "Настройки" },
];

const STATUS_COLORS: Record<string, string> = {
  free: "bg-green-500",
  busy: "bg-yellow-500",
  unavailable: "bg-red-500",
  custom: "bg-purple-500",
};

const STATUS_LABELS: Record<string, string> = {
  free: "Свободен",
  busy: "Занят",
  unavailable: "Недоступен",
  custom: "Особый",
};

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { theme, toggle } = useTheme();
  const { data: status } = useGetUserStatus();
  const { user } = useAuth();

  const isActive = (path: string) =>
    path === "/" ? location === "/" : location.startsWith(path);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background max-w-2xl mx-auto relative">
      {/* Top header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur-sm flex-shrink-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Zap size={13} className="text-white" />
          </div>
          <div>
            <span className="text-foreground font-semibold text-sm">JARVIS</span>
            <div className="flex items-center gap-1.5">
              <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", STATUS_COLORS[status?.status ?? "free"])} />
              <span className="text-xs text-muted-foreground">{STATUS_LABELS[status?.status ?? "free"]}</span>
              {status?.context ? <span className="text-xs text-muted-foreground">· {status.context}</span> : null}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {user && (
            <a
              href={`${BASE}/api/logout`}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Выйти"
              title={user.firstName ?? user.email ?? "Выйти"}
            >
              <LogOut size={15} />
            </a>
          )}
          <button
            onClick={toggle}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Переключить тему"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="flex-shrink-0 border-t border-border bg-background/95 backdrop-blur-sm safe-area-pb">
        <div className="flex">
          {NAV.map(({ path, icon: Icon, label }) => {
            const active = isActive(path);
            return (
              <Link
                key={path}
                href={path}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors text-center",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
                <span className={cn("text-[9px] leading-none font-medium", active ? "text-primary" : "")}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
