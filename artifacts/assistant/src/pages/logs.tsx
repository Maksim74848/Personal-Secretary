import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetLogs, useClearLogs, getGetLogsQueryKey } from "@workspace/api-client-react";
import { ScrollText, Trash2, RefreshCw, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const LOG_TYPES = ["all", "chat", "auto-reply", "calendar", "task", "telegram", "system"];
const TYPE_STYLES: Record<string, string> = {
  chat: "text-blue-500 bg-blue-500/10",
  "auto-reply": "text-purple-500 bg-purple-500/10",
  calendar: "text-green-500 bg-green-500/10",
  task: "text-orange-500 bg-orange-500/10",
  telegram: "text-sky-500 bg-sky-500/10",
  system: "text-muted-foreground bg-muted",
};

export default function Logs() {
  const [filter, setFilter] = useState("all");
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: logs, isLoading, refetch } = useGetLogs(
    filter !== "all" ? { type: filter, limit: 200 } : { limit: 200 },
    { query: { queryKey: getGetLogsQueryKey(filter !== "all" ? { type: filter, limit: 200 } : { limit: 200 }) } }
  );
  const clear = useClearLogs();

  function handleClear() {
    clear.mutate(undefined, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getGetLogsQueryKey() }); toast({ title: "Logs cleared" }); },
      onError: () => toast({ title: "Failed to clear logs", variant: "destructive" }),
    });
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ScrollText size={18} className="text-primary" />
          <div>
            <h1 className="text-xl font-semibold text-foreground">Activity Logs</h1>
            <p className="text-sm text-muted-foreground">{logs?.length ?? 0} entries</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button data-testid="button-refresh-logs" onClick={() => refetch()}
            className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw size={14} />
          </button>
          <button data-testid="button-clear-logs" onClick={handleClear} disabled={clear.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-destructive/10 text-destructive rounded-lg text-sm hover:bg-destructive/20 disabled:opacity-50 border border-destructive/20">
            <Trash2 size={13} /> Clear All
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
        <Filter size={12} className="text-muted-foreground" />
        {LOG_TYPES.map(t => (
          <button key={t} data-testid={`log-filter-${t}`} onClick={() => setFilter(t)}
            className={cn("px-2.5 py-1 rounded-md text-xs capitalize transition-colors", filter === t ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground")}>
            {t}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-1.5">{[...Array(8)].map((_, i) => <div key={i} className="h-10 bg-muted rounded-lg animate-pulse" />)}</div>
      ) : !logs?.length ? (
        <div className="text-center py-12 text-sm text-muted-foreground">No log entries</div>
      ) : (
        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          {logs.map((log, i) => (
            <div key={log.id} data-testid={`log-entry-${log.id}`}
              className={cn("flex items-start gap-3 px-4 py-2.5 text-xs", i < logs.length - 1 && "border-b border-border")}>
              <span className="text-muted-foreground whitespace-nowrap font-mono flex-shrink-0 mt-0.5">
                {new Date(log.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
              <span className={cn("px-1.5 py-0.5 rounded text-xs capitalize flex-shrink-0", TYPE_STYLES[log.type] ?? TYPE_STYLES.system)}>
                {log.type}
              </span>
              <span className="text-foreground flex-1">{log.message}</span>
              {log.source && <span className="text-muted-foreground flex-shrink-0">{log.source}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
