import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetTasks, useCreateTask, useUpdateTask, useDeleteTask, useCompleteTask,
  getGetTasksQueryKey
} from "@workspace/api-client-react";
import { Plus, Check, Trash2, Clock, Flag, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const PRIORITIES = ["urgent", "high", "normal", "low"] as const;
const STATUSES = ["pending", "in-progress", "done", "cancelled"] as const;

const PRIORITY_STYLES: Record<string, string> = {
  urgent: "text-red-500 border-red-500/30 bg-red-500/10",
  high: "text-orange-500 border-orange-500/30 bg-orange-500/10",
  normal: "text-blue-500 border-blue-500/30 bg-blue-500/10",
  low: "text-muted-foreground border-border bg-muted/50",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "text-yellow-500 border-yellow-500/30 bg-yellow-500/10",
  "in-progress": "text-blue-500 border-blue-500/30 bg-blue-500/10",
  done: "text-green-500 border-green-500/30 bg-green-500/10",
  cancelled: "text-muted-foreground border-border bg-muted/50",
};

export default function Tasks() {
  const [filter, setFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", priority: "normal", dueDate: "", tags: "" });
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: tasks, isLoading } = useGetTasks(
    filter !== "all" ? { status: filter } : {},
    { query: { queryKey: getGetTasksQueryKey(filter !== "all" ? { status: filter } : {}) } }
  );
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const completeTask = useCompleteTask();

  function invalidate() {
    qc.invalidateQueries({ queryKey: getGetTasksQueryKey() });
    qc.invalidateQueries({ queryKey: getGetTasksQueryKey({ status: "pending" }) });
  }

  function handleCreate() {
    if (!form.title.trim()) return;
    createTask.mutate({ data: { ...form, priority: form.priority as typeof PRIORITIES[number] } }, {
      onSuccess: () => { invalidate(); setShowForm(false); setForm({ title: "", description: "", priority: "normal", dueDate: "", tags: "" }); },
      onError: () => toast({ title: "Failed to create task", variant: "destructive" }),
    });
  }

  function handleComplete(id: number) {
    completeTask.mutate({ id }, { onSuccess: invalidate, onError: () => toast({ title: "Failed to complete task", variant: "destructive" }) });
  }

  function handleDelete(id: number) {
    deleteTask.mutate({ id }, { onSuccess: invalidate, onError: () => toast({ title: "Failed to delete task", variant: "destructive" }) });
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{tasks?.length ?? 0} tasks</p>
        </div>
        <button
          data-testid="button-add-task"
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus size={14} /> New Task
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-1.5 mb-4">
        {["all", ...STATUSES].map(s => (
          <button
            key={s}
            data-testid={`filter-${s}`}
            onClick={() => setFilter(s)}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs capitalize transition-colors",
              filter === s ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >{s}</button>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-card border border-card-border rounded-xl p-4 mb-4">
          <div className="space-y-3">
            <input
              data-testid="input-task-title"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Task title..."
              className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
            <textarea
              data-testid="input-task-description"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Description (optional)"
              rows={2}
              className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring resize-none"
            />
            <div className="flex gap-2">
              <select
                data-testid="select-task-priority"
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="bg-background border border-input rounded-lg px-3 py-2 text-sm outline-none flex-1"
              >
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <input
                data-testid="input-task-due-date"
                type="date"
                value={form.dueDate}
                onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                className="bg-background border border-input rounded-lg px-3 py-2 text-sm outline-none flex-1"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
              <button
                data-testid="button-create-task-submit"
                onClick={handleCreate}
                disabled={createTask.isPending}
                className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50"
              >
                {createTask.isPending ? "Creating..." : "Create Task"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task list */}
      {isLoading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : !tasks?.length ? (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">No tasks found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => (
            <div
              key={task.id}
              data-testid={`task-row-${task.id}`}
              className={cn("bg-card border border-card-border rounded-xl px-4 py-3 flex items-center gap-3 transition-all duration-150", task.status === "done" && "opacity-60")}
            >
              <button
                data-testid={`button-complete-task-${task.id}`}
                onClick={() => task.status !== "done" && handleComplete(task.id)}
                className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors", task.status === "done" ? "bg-green-500 border-green-500" : "border-border hover:border-green-500")}
              >
                {task.status === "done" && <Check size={11} className="text-white" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium text-foreground truncate", task.status === "done" && "line-through")}>{task.title}</p>
                {task.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{task.description}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {task.dueDate && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock size={10} />{task.dueDate}
                  </span>
                )}
                <span className={cn("px-1.5 py-0.5 rounded text-xs border capitalize", PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES.normal)}>
                  {task.priority}
                </span>
                <span className={cn("px-1.5 py-0.5 rounded text-xs border capitalize", STATUS_STYLES[task.status] ?? STATUS_STYLES.pending)}>
                  {task.status}
                </span>
                <button
                  data-testid={`button-delete-task-${task.id}`}
                  onClick={() => handleDelete(task.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
