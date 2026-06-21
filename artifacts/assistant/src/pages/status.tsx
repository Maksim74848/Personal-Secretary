import { useQueryClient } from "@tanstack/react-query";
import { useGetUserStatus, useSetUserStatus, getGetUserStatusQueryKey } from "@workspace/api-client-react";
import { useState, useEffect } from "react";
import { Activity, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const PRESETS = [
  { status: "busy", context: "At school", label: "At School", color: "bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20" },
  { status: "busy", context: "In a meeting", label: "In a Meeting", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20" },
  { status: "busy", context: "Shopping", label: "Shopping", color: "bg-purple-500/10 text-purple-500 border-purple-500/20 hover:bg-purple-500/20" },
  { status: "free", context: "", label: "Completely Free", color: "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20" },
  { status: "unavailable", context: "Do not disturb", label: "Do Not Disturb", color: "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20" },
];

const STATUS_OPTIONS = ["free", "busy", "unavailable", "custom"];
const STATUS_COLORS: Record<string, string> = {
  free: "bg-green-500", busy: "bg-yellow-500", unavailable: "bg-red-500", custom: "bg-purple-500"
};

export default function Status() {
  const { data: status, isLoading } = useGetUserStatus();
  const setStatus = useSetUserStatus();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [form, setForm] = useState({ status: "free", context: "", customMessage: "", availableUntil: "" });

  useEffect(() => {
    if (status) setForm({ status: status.status, context: status.context, customMessage: status.customMessage ?? "", availableUntil: status.availableUntil ?? "" });
  }, [status]);

  function applyPreset(p: typeof PRESETS[number]) {
    const data = { status: p.status, context: p.context, customMessage: "", availableUntil: "" };
    setForm(data);
    setStatus.mutate({ data }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getGetUserStatusQueryKey() }),
      onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
    });
  }

  function handleSave() {
    setStatus.mutate({ data: form }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getGetUserStatusQueryKey() }); toast({ title: "Status updated" }); },
      onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
    });
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Activity Status</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Let ARIA know your current availability</p>
      </div>

      {/* Current status */}
      {!isLoading && status && (
        <div className="bg-card border border-card-border rounded-xl p-4 mb-5 flex items-center gap-3">
          <span className={cn("w-3 h-3 rounded-full flex-shrink-0", STATUS_COLORS[status.status] ?? "bg-green-500")} />
          <div>
            <p className="text-sm font-semibold text-foreground capitalize">{status.status}</p>
            {status.context && <p className="text-xs text-muted-foreground">{status.context}</p>}
            {status.customMessage && <p className="text-xs text-muted-foreground italic">"{status.customMessage}"</p>}
          </div>
          <span className="ml-auto text-xs text-muted-foreground">
            Updated {new Date(status.updatedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      )}

      {/* Quick presets */}
      <div className="mb-5">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Quick Set</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PRESETS.map(p => {
            const active = form.status === p.status && form.context === p.context;
            return (
              <button key={p.label} data-testid={`preset-${p.label.toLowerCase().replace(/\s/g,"-")}`}
                onClick={() => applyPreset(p)}
                className={cn("px-3 py-2.5 rounded-lg text-sm font-medium border transition-all flex items-center justify-between gap-2", p.color)}>
                {p.label}
                {active && <Check size={13} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom form */}
      <div className="bg-card border border-card-border rounded-xl p-4">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><Activity size={14} className="text-primary" /> Custom Status</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Status</label>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map(s => (
                <button key={s} data-testid={`status-option-${s}`}
                  onClick={() => setForm(f => ({ ...f, status: s }))}
                  className={cn("px-3 py-1.5 rounded-lg text-sm capitalize transition-colors border", form.status === s ? "bg-primary text-white border-primary" : "bg-muted text-muted-foreground border-border hover:text-foreground")}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Context</label>
            <input data-testid="input-status-context" value={form.context} onChange={e => setForm(f => ({ ...f, context: e.target.value }))}
              placeholder="e.g. At school, In a meeting, Traveling..."
              className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Custom Message (optional)</label>
            <input data-testid="input-status-message" value={form.customMessage} onChange={e => setForm(f => ({ ...f, customMessage: e.target.value }))}
              placeholder="A brief message for auto-replies..."
              className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Available Until (optional)</label>
            <input data-testid="input-status-until" type="datetime-local" value={form.availableUntil} onChange={e => setForm(f => ({ ...f, availableUntil: e.target.value }))}
              className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <button data-testid="button-save-status" onClick={handleSave} disabled={setStatus.isPending}
            className="w-full py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            {setStatus.isPending ? "Saving..." : "Save Status"}
          </button>
        </div>
      </div>
    </div>
  );
}
