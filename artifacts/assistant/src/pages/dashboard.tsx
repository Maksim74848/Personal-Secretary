import { useGetDashboardSummary, useGetUserStatus, useGetTasks, useGetEvents } from "@workspace/api-client-react";
import { CheckSquare, Calendar, Users, MessageSquare, Clock, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

function StatCard({ icon: Icon, label, value, color, href }: {
  icon: React.ElementType; label: string; value: number | string; color: string; href?: string;
}) {
  const inner = (
    <div className={cn(
      "bg-card border border-card-border rounded-xl p-4 flex items-center gap-4 transition-all duration-200 hover:shadow-md hover:border-primary/30",
      href && "cursor-pointer"
    )}>
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", color)}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
  return href ? (
    <Link href={href} data-testid={`stat-${label.toLowerCase().replace(/\s/g,"-")}`} className="block">
      {inner}
    </Link>
  ) : inner;
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500/15 text-red-500 border-red-500/20",
  high: "bg-orange-500/15 text-orange-500 border-orange-500/20",
  normal: "bg-blue-500/15 text-blue-500 border-blue-500/20",
  low: "bg-muted text-muted-foreground border-border",
};

const STATUS_BG: Record<string, string> = {
  free: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/20",
  busy: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
  unavailable: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20",
  custom: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/20",
};

export default function Dashboard() {
  const { data: summary, isLoading } = useGetDashboardSummary();
  const { data: status } = useGetUserStatus();
  const { data: tasks } = useGetTasks({ status: "pending" });
  const { data: events } = useGetEvents({ from: new Date().toISOString().split("T")[0] });

  const todayEvents = events?.slice(0, 3) ?? [];
  const urgentTasks = tasks?.filter(t => t.priority === "urgent" || t.priority === "high").slice(0, 4) ?? [];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          {status && (
            <div data-testid="status-current" className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium border capitalize",
              STATUS_BG[status.status] ?? STATUS_BG.free
            )}>
              {status.context ? `${status.status} — ${status.context}` : status.status}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={CheckSquare} label="Pending Tasks" value={isLoading ? "—" : (summary?.pendingTasks ?? 0)} color="bg-blue-500" href="/tasks" />
        <StatCard icon={Calendar} label="Today's Events" value={isLoading ? "—" : (summary?.todayEvents ?? 0)} color="bg-purple-500" href="/calendar" />
        <StatCard icon={Users} label="Total Contacts" value={isLoading ? "—" : (summary?.totalContacts ?? 0)} color="bg-green-500" href="/contacts" />
        <StatCard icon={MessageSquare} label="Messages (24h)" value={isLoading ? "—" : (summary?.recentMessages ?? 0)} color="bg-orange-500" href="/chat" />
      </div>

      {/* Two-col grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upcoming Events */}
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Calendar size={14} className="text-purple-500" /> Upcoming Events
            </h2>
            <Link href="/calendar" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          {todayEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No upcoming events</p>
          ) : (
            <div className="space-y-2">
              {todayEvents.map(ev => (
                <div key={ev.id} data-testid={`event-item-${ev.id}`} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/40">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{ev.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(ev.startTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                      {ev.location && ` · ${ev.location}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Priority Tasks */}
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp size={14} className="text-orange-500" /> Priority Tasks
            </h2>
            <Link href="/tasks" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          {urgentTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No urgent tasks</p>
          ) : (
            <div className="space-y-2">
              {urgentTasks.map(task => (
                <div key={task.id} data-testid={`task-item-${task.id}`} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40">
                  <span className={cn("px-1.5 py-0.5 rounded text-xs border capitalize flex-shrink-0", PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.normal)}>
                    {task.priority}
                  </span>
                  <span className="text-sm text-foreground truncate">{task.title}</span>
                  {task.dueDate && (
                    <span className="text-xs text-muted-foreground ml-auto flex-shrink-0 flex items-center gap-1">
                      <Clock size={10} /> {task.dueDate}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick chat shortcut */}
      <div className="mt-4 bg-card border border-card-border rounded-xl p-4">
        <Link href="/chat" data-testid="link-quick-chat" className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquare size={14} className="text-primary" />
            </div>
            <span>Ask ARIA anything...</span>
            <span className="ml-auto text-xs text-muted-foreground">Press Enter</span>
        </Link>
      </div>
    </div>
  );
}
