import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetTasks, useCreateTask, useDeleteTask, useCompleteTask,
  getGetTasksQueryKey
} from "@workspace/api-client-react";
import { Plus, Check, Trash2, X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const PRIORITIES = [
  { value: "urgent", label: "Срочно", style: "text-red-500 bg-red-500/10 border-red-500/20" },
  { value: "high", label: "Высокий", style: "text-orange-500 bg-orange-500/10 border-orange-500/20" },
  { value: "normal", label: "Обычный", style: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  { value: "low", label: "Низкий", style: "text-muted-foreground bg-muted border-border" },
];
const PRIORITY_MAP = Object.fromEntries(PRIORITIES.map(p => [p.value, p]));

const STATUS_FILTERS = [
  { value: "all", label: "Все" },
  { value: "pending", label: "Активные" },
  { value: "in-progress", label: "В работе" },
  { value: "done", label: "Выполнены" },
];

export default function TasksPage() {
  const [filter, setFilter] = useState("pending");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", priority: "normal", dueDate: "" });
  const qc = useQueryClient();
  const { toast } = useToast();

  const params = filter !== "all" ? { status: filter } : {};
  const { data: tasks, isLoading } = useGetTasks(params, {
    query: { queryKey: getGetTasksQueryKey(params) }
  });
  const create = useCreateTask();
  const remove = useDeleteTask();
  const complete = useCompleteTask();

  function invalidate() {
    qc.invalidateQueries({ queryKey: getGetTasksQueryKey() });
    qc.invalidateQueries({ queryKey: getGetTasksQueryKey({ status: "pending" }) });
    qc.invalidateQueries({ queryKey: getGetTasksQueryKey({ status: "done" }) });
  }

  function handleCreate() {
    if (!form.title.trim()) return;
    create.mutate({ data: { ...form, priority: form.priority as "urgent" | "high" | "normal" | "low" } }, {
      onSuccess: () => { invalidate(); setShowForm(false); setForm({ title: "", description: "", priority: "normal", dueDate: "" }); },
      onError: () => toast({ title: "Не удалось создать задачу", variant: "destructive" }),
    });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filter tabs */}
      <div className="px-4 pt-4 pb-2 flex-shrink-0">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0",
                filter === f.value ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 pb-4">
        {isLoading ? (
          <div className="space-y-2 pt-2">
            {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" />)}
          </div>
        ) : !tasks?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-4xl mb-3">✅</span>
            <p className="text-sm font-medium text-foreground">Задач нет</p>
            <p className="text-xs text-muted-foreground mt-1">Нажмите «+» чтобы добавить задачу</p>
          </div>
        ) : (
          <div className="space-y-2 pt-2">
            {tasks.map(task => {
              const pr = PRIORITY_MAP[task.priority];
              const done = task.status === "done";
              return (
                <div
                  key={task.id}
                  className={cn(
                    "bg-card border border-card-border rounded-2xl px-4 py-3 flex items-start gap-3 transition-opacity",
                    done && "opacity-50"
                  )}
                >
                  {/* Complete button */}
                  <button
                    onClick={() => !done && complete.mutate({ id: task.id }, { onSuccess: invalidate })}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all",
                      done ? "bg-green-500 border-green-500" : "border-border hover:border-green-500"
                    )}
                  >
                    {done && <Check size={12} className="text-white" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium text-foreground", done && "line-through")}>{task.title}</p>
                    {task.description && <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {pr && (
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium border", pr.style)}>
                          {pr.label}
                        </span>
                      )}
                      {task.dueDate && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock size={9} /> {task.dueDate}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => remove.mutate({ id: task.id }, { onSuccess: invalidate })}
                    className="p-1.5 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowForm(true)}
        className="absolute bottom-20 right-4 w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-all active:scale-95"
      >
        <Plus size={22} />
      </button>

      {/* Create task sheet */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowForm(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full max-w-2xl mx-auto bg-background rounded-t-2xl p-4 pb-8 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-foreground">Новая задача</h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted">
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                autoFocus
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && handleCreate()}
                placeholder="Название задачи *"
                className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Описание (необязательно)"
                rows={2}
                className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none resize-none focus:ring-2 focus:ring-primary/30"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1 px-1">Приоритет</label>
                  <select
                    value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                    className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none"
                  >
                    {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1 px-1">Срок</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                    className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none"
                  />
                </div>
              </div>
              <button
                onClick={handleCreate}
                disabled={!form.title.trim() || create.isPending}
                className="w-full py-3 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {create.isPending ? "Создание..." : "Создать задачу"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
