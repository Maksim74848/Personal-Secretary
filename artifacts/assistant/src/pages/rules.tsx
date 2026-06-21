import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetRules, useCreateRule, useUpdateRule, useDeleteRule, getGetRulesQueryKey } from "@workspace/api-client-react";
import { Shield, Plus, Trash2, X, ToggleLeft, ToggleRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ["safety", "communication", "behavior", "privacy"] as const;
const CATEGORY_STYLES: Record<string, string> = {
  safety: "text-red-500 bg-red-500/10 border-red-500/20",
  communication: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  behavior: "text-purple-500 bg-purple-500/10 border-purple-500/20",
  privacy: "text-green-500 bg-green-500/10 border-green-500/20",
};

export default function Rules() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", category: "behavior", enabled: true, priority: 0 });
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: rules, isLoading } = useGetRules();
  const create = useCreateRule();
  const update = useUpdateRule();
  const remove = useDeleteRule();

  function invalidate() { qc.invalidateQueries({ queryKey: getGetRulesQueryKey() }); }

  function handleCreate() {
    if (!form.title || !form.description) { toast({ title: "Title and description required" }); return; }
    create.mutate({ data: form }, {
      onSuccess: () => { invalidate(); setShowForm(false); setForm({ title: "", description: "", category: "behavior", enabled: true, priority: 0 }); },
      onError: () => toast({ title: "Failed to create rule", variant: "destructive" }),
    });
  }

  function toggleRule(id: number, enabled: boolean) {
    update.mutate({ id, data: { enabled: !enabled } }, { onSuccess: invalidate });
  }

  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = rules?.filter(r => r.category === cat) ?? [];
    return acc;
  }, {} as Record<string, typeof rules>);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-primary" />
          <div>
            <h1 className="text-xl font-semibold text-foreground">Assistant Rules</h1>
            <p className="text-sm text-muted-foreground">Define how ARIA behaves</p>
          </div>
        </div>
        <button data-testid="button-add-rule" onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90">
          <Plus size={14} /> Add Rule
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-card-border rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">New Rule</h3>
            <button onClick={() => setShowForm(false)}><X size={14} className="text-muted-foreground" /></button>
          </div>
          <div className="space-y-3">
            <input data-testid="input-rule-title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Rule title..." className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
            <textarea data-testid="input-rule-description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2} placeholder="Describe the rule in detail..."
              className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm outline-none resize-none focus:ring-1 focus:ring-ring" />
            <div className="flex gap-2">
              <select data-testid="select-rule-category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="bg-background border border-input rounded-lg px-3 py-2 text-sm outline-none flex-1">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="number" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 0 }))}
                placeholder="Priority" className="bg-background border border-input rounded-lg px-3 py-2 text-sm outline-none w-24" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm text-muted-foreground">Cancel</button>
              <button data-testid="button-submit-rule" onClick={handleCreate} disabled={create.isPending}
                className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50">
                {create.isPending ? "Creating..." : "Create Rule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="space-y-5">
          {CATEGORIES.map(cat => {
            const catRules = grouped[cat] ?? [];
            if (!catRules.length) return null;
            return (
              <div key={cat}>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className={cn("w-1.5 h-1.5 rounded-full", cat === "safety" ? "bg-red-500" : cat === "communication" ? "bg-blue-500" : cat === "behavior" ? "bg-purple-500" : "bg-green-500")} />
                  {cat}
                </h2>
                <div className="space-y-2">
                  {catRules.map(rule => (
                    <div key={rule.id} data-testid={`rule-row-${rule.id}`}
                      className={cn("bg-card border border-card-border rounded-xl px-4 py-3 flex items-start gap-3 transition-opacity", !rule.enabled && "opacity-50")}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-medium text-foreground">{rule.title}</p>
                          <span className={cn("px-1.5 py-0.5 rounded text-xs border capitalize", CATEGORY_STYLES[rule.category] ?? "")}>{rule.category}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{rule.description}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button data-testid={`toggle-rule-${rule.id}`} onClick={() => toggleRule(rule.id, rule.enabled)}
                          className={cn("transition-colors", rule.enabled ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
                          {rule.enabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                        </button>
                        <button data-testid={`button-delete-rule-${rule.id}`} onClick={() => remove.mutate({ id: rule.id }, { onSuccess: invalidate })}
                          className="text-muted-foreground hover:text-destructive p-1"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {!rules?.length && <div className="text-center py-10 text-sm text-muted-foreground">No rules defined yet</div>}
        </div>
      )}
    </div>
  );
}
