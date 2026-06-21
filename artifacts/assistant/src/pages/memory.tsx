import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMemoryEntries, useCreateMemoryEntry, useUpdateMemoryEntry, useDeleteMemoryEntry, getGetMemoryEntriesQueryKey } from "@workspace/api-client-react";
import { Brain, Plus, Trash2, Edit2, X, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ["preference", "fact", "correction", "rule"] as const;
const CAT_STYLES: Record<string, string> = {
  preference: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  fact: "text-green-500 bg-green-500/10 border-green-500/20",
  correction: "text-orange-500 bg-orange-500/10 border-orange-500/20",
  rule: "text-purple-500 bg-purple-500/10 border-purple-500/20",
};

export default function Memory() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState({ content: "", category: "fact", source: "", confidence: 80 });
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: entries, isLoading } = useGetMemoryEntries();
  const create = useCreateMemoryEntry();
  const update = useUpdateMemoryEntry();
  const remove = useDeleteMemoryEntry();

  function invalidate() { qc.invalidateQueries({ queryKey: getGetMemoryEntriesQueryKey() }); }

  function handleSubmit() {
    if (!form.content.trim()) return;
    if (editing) {
      update.mutate({ id: editing, data: { content: form.content, category: form.category, confidence: form.confidence } }, {
        onSuccess: () => { invalidate(); setEditing(null); setShowForm(false); setForm({ content: "", category: "fact", source: "", confidence: 80 }); },
        onError: () => toast({ title: "Failed to update", variant: "destructive" }),
      });
    } else {
      create.mutate({ data: form }, {
        onSuccess: () => { invalidate(); setShowForm(false); setForm({ content: "", category: "fact", source: "", confidence: 80 }); },
        onError: () => toast({ title: "Failed to save memory", variant: "destructive" }),
      });
    }
  }

  function openEdit(e: typeof entries extends (infer T)[] | undefined ? T : never) {
    if (!e) return;
    setForm({ content: e.content, category: e.category, source: e.source ?? "", confidence: e.confidence ?? 80 });
    setEditing(e.id);
    setShowForm(true);
  }

  const grouped = CATEGORIES.reduce((acc, c) => {
    acc[c] = entries?.filter(e => e.category === c) ?? [];
    return acc;
  }, {} as Record<string, typeof entries>);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Brain size={18} className="text-primary" />
          <div>
            <h1 className="text-xl font-semibold text-foreground">Assistant Memory</h1>
            <p className="text-sm text-muted-foreground">Things ARIA knows and remembers about you</p>
          </div>
        </div>
        <button data-testid="button-add-memory" onClick={() => { setEditing(null); setForm({ content: "", category: "fact", source: "", confidence: 80 }); setShowForm(v => !v); }}
          className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90">
          <Plus size={14} /> Add Memory
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-card-border rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">{editing ? "Edit Memory" : "New Memory"}</h3>
            <button onClick={() => { setShowForm(false); setEditing(null); }}><X size={14} className="text-muted-foreground" /></button>
          </div>
          <div className="space-y-3">
            <textarea data-testid="input-memory-content" value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              rows={2} placeholder="What should ARIA remember?"
              className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm outline-none resize-none focus:ring-1 focus:ring-ring" />
            <div className="flex gap-2">
              <select data-testid="select-memory-category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="bg-background border border-input rounded-lg px-3 py-2 text-sm outline-none flex-1">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Confidence: {form.confidence}%</span>
                <input type="range" min={0} max={100} value={form.confidence} onChange={e => setForm(f => ({ ...f, confidence: parseInt(e.target.value) }))}
                  className="flex-1" />
              </div>
            </div>
            {!editing && (
              <input value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} placeholder="Source (optional)"
                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="px-3 py-1.5 text-sm text-muted-foreground">Cancel</button>
              <button data-testid="button-submit-memory" onClick={handleSubmit} disabled={create.isPending || update.isPending}
                className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5">
                <Save size={13} /> {editing ? "Save Changes" : "Remember"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="space-y-5">
          {CATEGORIES.map(cat => {
            const catEntries = grouped[cat] ?? [];
            if (!catEntries.length) return null;
            return (
              <div key={cat}>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{cat}</h2>
                <div className="space-y-2">
                  {catEntries.map(entry => (
                    <div key={entry.id} data-testid={`memory-row-${entry.id}`} className="bg-card border border-card-border rounded-xl px-4 py-3 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">{entry.content}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={cn("px-1.5 py-0.5 rounded text-xs border capitalize", CAT_STYLES[entry.category] ?? "")}>{entry.category}</span>
                          {entry.source && <span className="text-xs text-muted-foreground">via {entry.source}</span>}
                          {entry.confidence != null && (
                            <span className="text-xs text-muted-foreground ml-auto">{entry.confidence}% confidence</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button data-testid={`button-edit-memory-${entry.id}`} onClick={() => openEdit(entry)} className="p-1.5 text-muted-foreground hover:text-foreground"><Edit2 size={13} /></button>
                        <button data-testid={`button-delete-memory-${entry.id}`} onClick={() => remove.mutate({ id: entry.id }, { onSuccess: invalidate })} className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {!entries?.length && <div className="text-center py-10 text-sm text-muted-foreground">No memories stored yet</div>}
        </div>
      )}
    </div>
  );
}
