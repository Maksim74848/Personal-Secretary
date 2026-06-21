import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetUserStatus, useSetUserStatus, getGetUserStatusQueryKey,
  useGetTelegramSettings, useUpdateTelegramSettings, useTestTelegramConnection, getGetTelegramSettingsQueryKey,
  useGetRules, useCreateRule, useUpdateRule, useDeleteRule, getGetRulesQueryKey,
  useGetMemoryEntries, useCreateMemoryEntry, useDeleteMemoryEntry, getGetMemoryEntriesQueryKey,
  useGetLogs, useClearLogs, getGetLogsQueryKey,
} from "@workspace/api-client-react";
import {
  Activity, Send, Shield, Brain, ScrollText,
  ChevronRight, Plus, Trash2, ToggleLeft, ToggleRight, Eye, EyeOff, RefreshCw, X, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type Section = "status" | "telegram" | "rules" | "memory" | "logs" | null;

export default function SettingsPage() {
  const [section, setSection] = useState<Section>(null);

  const MENU = [
    { key: "status" as Section, icon: Activity, label: "Статус", desc: "Доступность и контекст" },
    { key: "telegram" as Section, icon: Send, label: "Telegram", desc: "Подключение бота" },
    { key: "rules" as Section, icon: Shield, label: "Правила", desc: "Поведение ассистента" },
    { key: "memory" as Section, icon: Brain, label: "Память", desc: "Что помнит ARIA" },
    { key: "logs" as Section, icon: ScrollText, label: "Логи", desc: "История действий" },
  ];

  if (section === "status") return <StatusSection onBack={() => setSection(null)} />;
  if (section === "telegram") return <TelegramSection onBack={() => setSection(null)} />;
  if (section === "rules") return <RulesSection onBack={() => setSection(null)} />;
  if (section === "memory") return <MemorySection onBack={() => setSection(null)} />;
  if (section === "logs") return <LogsSection onBack={() => setSection(null)} />;

  return (
    <div className="px-4 pt-4">
      <h1 className="text-lg font-semibold text-foreground mb-4">Настройки</h1>
      <div className="space-y-2">
        {MENU.map(({ key, icon: Icon, label, desc }) => (
          <button key={key} onClick={() => setSection(key)}
            className="w-full flex items-center gap-3 bg-card border border-card-border rounded-2xl px-4 py-3.5 text-left hover:bg-muted/40 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Icon size={16} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </div>
            <ChevronRight size={15} className="text-muted-foreground flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

function BackHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
      <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-foreground">
        ←
      </button>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
    </div>
  );
}

function StatusSection({ onBack }: { onBack: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: statusData } = useGetUserStatus();
  const setStatus = useSetUserStatus();
  const [form, setForm] = useState({ status: "free", context: "", customMessage: "" });

  useEffect(() => {
    if (statusData) setForm({ status: statusData.status, context: statusData.context ?? "", customMessage: statusData.customMessage ?? "" });
  }, [statusData]);

  const STATUS_OPTS = [
    { v: "free", label: "Свободен", color: "bg-green-500", desc: "Доступен для общения" },
    { v: "busy", label: "Занят", color: "bg-yellow-500", desc: "Ограниченная доступность" },
    { v: "unavailable", label: "Недоступен", color: "bg-red-500", desc: "Не беспокоить" },
    { v: "custom", label: "Особый", color: "bg-purple-500", desc: "Свой статус" },
  ];

  const PRESETS = [
    { label: "В школе 08:00–14:00", status: "busy", context: "В школе" },
    { label: "На встрече", status: "busy", context: "На встрече" },
    { label: "Сплю", status: "unavailable", context: "Сплю" },
    { label: "Свободен", status: "free", context: "" },
    { label: "Не беспокоить", status: "unavailable", context: "Не беспокоить" },
  ];

  function save() {
    setStatus.mutate({ data: form }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getGetUserStatusQueryKey() }); toast({ title: "Статус обновлён" }); },
    });
  }

  return (
    <div className="flex flex-col h-full">
      <BackHeader title="Статус" onBack={onBack} />
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-4">
        <div>
          <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-2">Статус</p>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_OPTS.map(o => (
              <button key={o.v} onClick={() => setForm(f => ({ ...f, status: o.v }))}
                className={cn("flex items-center gap-2.5 px-3 py-3 rounded-2xl border text-left transition-all",
                  form.status === o.v ? "border-primary bg-primary/10" : "bg-card border-card-border hover:bg-muted/40")}>
                <span className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", o.color)} />
                <div>
                  <p className="text-sm font-medium text-foreground">{o.label}</p>
                  <p className="text-[10px] text-muted-foreground">{o.desc}</p>
                </div>
                {form.status === o.v && <Check size={13} className="text-primary ml-auto" />}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1 px-1">Контекст</p>
          <input value={form.context} onChange={e => setForm(f => ({ ...f, context: e.target.value }))}
            placeholder="Например: в школе, на тренировке..."
            className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1 px-1">Сообщение для авто-ответов</p>
          <textarea value={form.customMessage} onChange={e => setForm(f => ({ ...f, customMessage: e.target.value }))}
            rows={2} placeholder="Я сейчас занят, отвечу позже..."
            className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none resize-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-2">Быстрый выбор</p>
          <div className="space-y-1.5">
            {PRESETS.map(p => (
              <button key={p.label} onClick={() => { setForm(f => ({ ...f, status: p.status, context: p.context })); }}
                className="w-full text-left px-4 py-2.5 bg-card border border-card-border rounded-xl text-sm text-foreground hover:bg-muted/40 transition-colors">
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <button onClick={save} disabled={setStatus.isPending}
          className="w-full py-3 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
          {setStatus.isPending ? "Сохранение..." : "Сохранить статус"}
        </button>
      </div>
    </div>
  );
}

function TelegramSection({ onBack }: { onBack: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: settings } = useGetTelegramSettings();
  const update = useUpdateTelegramSettings();
  const test = useTestTelegramConnection();
  const [showToken, setShowToken] = useState(false);
  const [form, setForm] = useState({ enabled: false, botToken: "", autoReplyEnabled: false, forwardAllMessages: false, requireConfirmation: true, defaultReplyTemplate: "" });

  useEffect(() => {
    if (settings) setForm({
      enabled: settings.enabled, botToken: settings.botToken ?? "",
      autoReplyEnabled: settings.autoReplyEnabled, forwardAllMessages: settings.forwardAllMessages,
      requireConfirmation: settings.requireConfirmation, defaultReplyTemplate: settings.defaultReplyTemplate ?? ""
    });
  }, [settings]);

  function save() {
    update.mutate({ data: form }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getGetTelegramSettingsQueryKey() }); toast({ title: "Настройки Telegram сохранены" }); },
    });
  }

  function handleTest() {
    test.mutate(undefined, {
      onSuccess: r => {
        qc.invalidateQueries({ queryKey: getGetTelegramSettingsQueryKey() });
        toast({ title: r.success ? `Подключено как @${r.botUsername}` : (r.message ?? "Ошибка"), variant: r.success ? "default" : "destructive" });
      },
    });
  }

  const Toggle = ({ field, label, desc }: { field: keyof typeof form; label: string; desc?: string }) => (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <button onClick={() => setForm(f => ({ ...f, [field]: !f[field as keyof typeof form] }))}
        className={cn("w-11 h-6 rounded-full relative transition-colors flex-shrink-0",
          form[field as keyof typeof form] ? "bg-primary" : "bg-muted border border-border")}>
        <span className={cn("absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform",
          form[field as keyof typeof form] ? "translate-x-5" : "")} />
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <BackHeader title="Telegram" onBack={onBack} />
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-4">
        {settings && (
          <div className={cn("flex items-center gap-3 p-3.5 rounded-2xl border", settings.botConnected ? "bg-green-500/10 border-green-500/20" : "bg-muted border-border")}>
            <span className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", settings.botConnected ? "bg-green-500" : "bg-muted-foreground")} />
            <div>
              <p className="text-sm font-medium text-foreground">{settings.botConnected ? `@${settings.botUsername}` : "Не подключён"}</p>
              <p className="text-xs text-muted-foreground">{settings.botConnected ? "Бот активен" : "Введите токен для подключения"}</p>
            </div>
          </div>
        )}
        <div>
          <p className="text-xs text-muted-foreground mb-1 px-1">Токен бота (@BotFather)</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input type={showToken ? "text" : "password"} value={form.botToken}
                onChange={e => setForm(f => ({ ...f, botToken: e.target.value }))}
                placeholder="Токен от @BotFather"
                className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none pr-10 focus:ring-2 focus:ring-primary/30" />
              <button onClick={() => setShowToken(v => !v)} className="absolute right-3 top-3 text-muted-foreground">
                {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <button onClick={handleTest} disabled={test.isPending || !form.botToken}
              className="px-3 py-2 bg-muted rounded-xl text-sm text-foreground hover:bg-muted/80 disabled:opacity-50 flex-shrink-0">
              <RefreshCw size={14} className={test.isPending ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
        <div className="bg-card border border-card-border rounded-2xl px-4">
          <Toggle field="enabled" label="Включить бота" desc="Принимать сообщения через Telegram" />
          <Toggle field="autoReplyEnabled" label="Авто-ответ" desc="Отвечать автоматически когда занят" />
          <Toggle field="requireConfirmation" label="Подтверждение" desc="Спрашивать перед отправкой ответа" />
          <Toggle field="forwardAllMessages" label="Пересылка" desc="Показывать все входящие сообщения" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1 px-1">Шаблон ответа по умолчанию</p>
          <textarea value={form.defaultReplyTemplate} onChange={e => setForm(f => ({ ...f, defaultReplyTemplate: e.target.value }))}
            rows={3} placeholder="Привет, я сейчас занят. Отвечу позже."
            className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none resize-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <button onClick={save} disabled={update.isPending}
          className="w-full py-3 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
          {update.isPending ? "Сохранение..." : "Сохранить"}
        </button>
      </div>
    </div>
  );
}

const RULE_CATS: [string, string][] = [["safety","Безопасность"],["communication","Общение"],["behavior","Поведение"],["privacy","Приватность"]];
const RULE_CAT_STYLES: Record<string, string> = {
  safety: "text-red-500 bg-red-500/10 border-red-500/20",
  communication: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  behavior: "text-purple-500 bg-purple-500/10 border-purple-500/20",
  privacy: "text-green-500 bg-green-500/10 border-green-500/20",
};

function RulesSection({ onBack }: { onBack: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", category: "behavior", enabled: true, priority: 0 });
  const { data: rules, isLoading } = useGetRules();
  const create = useCreateRule();
  const update = useUpdateRule();
  const remove = useDeleteRule();

  function invalidate() { qc.invalidateQueries({ queryKey: getGetRulesQueryKey() }); }

  function handleCreate() {
    if (!form.title.trim() || !form.description.trim()) { toast({ title: "Заполните название и описание" }); return; }
    create.mutate({ data: form }, { onSuccess: () => { invalidate(); setShowForm(false); setForm({ title: "", description: "", category: "behavior", enabled: true, priority: 0 }); } });
  }

  return (
    <div className="flex flex-col h-full">
      <BackHeader title="Правила ассистента" onBack={onBack} />
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
        {isLoading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-muted rounded-2xl animate-pulse" />)}</div>
        ) : !rules?.length ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="text-4xl mb-3">🛡️</span>
            <p className="text-sm font-medium text-foreground">Правил нет</p>
            <p className="text-xs text-muted-foreground mt-1">Добавьте правила для ассистента</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rules.map(rule => (
              <div key={rule.id} className={cn("bg-card border border-card-border rounded-2xl px-4 py-3 flex items-start gap-3", !rule.enabled && "opacity-50")}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-foreground">{rule.title}</p>
                    <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] border", RULE_CAT_STYLES[rule.category] ?? "")}>
                      {RULE_CATS.find(([v]) => v === rule.category)?.[1] ?? rule.category}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{rule.description}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => update.mutate({ id: rule.id, data: { enabled: !rule.enabled } }, { onSuccess: invalidate })}
                    className={cn("transition-colors", rule.enabled ? "text-primary" : "text-muted-foreground")}>
                    {rule.enabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                  </button>
                  <button onClick={() => remove.mutate({ id: rule.id }, { onSuccess: invalidate })} className="text-muted-foreground hover:text-destructive p-1">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="px-4 pb-4 pt-2 border-t border-border flex-shrink-0">
        <button onClick={() => setShowForm(true)} className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90">
          <Plus size={16} /> Добавить правило
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowForm(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full max-w-2xl mx-auto bg-background rounded-t-2xl p-4 pb-8 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">Новое правило</h3>
              <button onClick={() => setShowForm(false)}><X size={16} className="text-muted-foreground" /></button>
            </div>
            <div className="space-y-3">
              <input autoFocus value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Название правила *"
                className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3} placeholder="Подробное описание правила *"
                className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none resize-none focus:ring-2 focus:ring-primary/30" />
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none">
                {RULE_CATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <button onClick={handleCreate} disabled={create.isPending}
                className="w-full py-3 bg-primary text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                {create.isPending ? "Создание..." : "Создать правило"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const MEM_CATS: [string, string][] = [["preference","Предпочтение"],["fact","Факт"],["correction","Поправка"],["rule","Правило"]];
const MEM_STYLES: Record<string, string> = {
  preference: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  fact: "text-green-500 bg-green-500/10 border-green-500/20",
  correction: "text-orange-500 bg-orange-500/10 border-orange-500/20",
  rule: "text-purple-500 bg-purple-500/10 border-purple-500/20",
};

function MemorySection({ onBack }: { onBack: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ content: "", category: "fact", source: "", confidence: 80 });
  const { data: entries, isLoading } = useGetMemoryEntries();
  const create = useCreateMemoryEntry();
  const remove = useDeleteMemoryEntry();

  function invalidate() { qc.invalidateQueries({ queryKey: getGetMemoryEntriesQueryKey() }); }

  function handleCreate() {
    if (!form.content.trim()) return;
    create.mutate({ data: form }, { onSuccess: () => { invalidate(); setShowForm(false); setForm({ content: "", category: "fact", source: "", confidence: 80 }); } });
  }

  return (
    <div className="flex flex-col h-full">
      <BackHeader title="Память ассистента" onBack={onBack} />
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
        {isLoading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-muted rounded-2xl animate-pulse" />)}</div>
        ) : !entries?.length ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="text-4xl mb-3">🧠</span>
            <p className="text-sm font-medium text-foreground">Память пуста</p>
            <p className="text-xs text-muted-foreground mt-1">ARIA пока ничего не помнит о вас</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map(e => (
              <div key={e.id} className="bg-card border border-card-border rounded-2xl px-4 py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{e.content}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] border", MEM_STYLES[e.category] ?? "")}>
                      {MEM_CATS.find(([v]) => v === e.category)?.[1] ?? e.category}
                    </span>
                    {e.source && <span className="text-[10px] text-muted-foreground">через {e.source}</span>}
                    {e.confidence != null && <span className="text-[10px] text-muted-foreground ml-auto">{e.confidence}%</span>}
                  </div>
                </div>
                <button onClick={() => remove.mutate({ id: e.id }, { onSuccess: invalidate })} className="text-muted-foreground hover:text-destructive p-1 flex-shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="px-4 pb-4 pt-2 border-t border-border flex-shrink-0">
        <button onClick={() => setShowForm(true)} className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90">
          <Plus size={16} /> Добавить в память
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowForm(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full max-w-2xl mx-auto bg-background rounded-t-2xl p-4 pb-8 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">Добавить в память</h3>
              <button onClick={() => setShowForm(false)}><X size={16} className="text-muted-foreground" /></button>
            </div>
            <div className="space-y-3">
              <textarea autoFocus value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                rows={3} placeholder="Что должна запомнить ARIA? *"
                className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none resize-none focus:ring-2 focus:ring-primary/30" />
              <div className="grid grid-cols-2 gap-2">
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="bg-muted rounded-xl px-3 py-2.5 text-sm outline-none">
                  {MEM_CATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <div className="flex items-center gap-2 px-3 py-2.5 bg-muted rounded-xl">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{form.confidence}%</span>
                  <input type="range" min={0} max={100} value={form.confidence} onChange={e => setForm(f => ({ ...f, confidence: parseInt(e.target.value) }))} className="flex-1" />
                </div>
              </div>
              <button onClick={handleCreate} disabled={!form.content.trim() || create.isPending}
                className="w-full py-3 bg-primary text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                {create.isPending ? "Сохранение..." : "Запомнить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const LOG_TYPES = ["all", "chat", "auto-reply", "calendar", "task", "telegram", "system"];
const LOG_LABELS: Record<string, string> = {
  all: "Все", chat: "Чат", "auto-reply": "Авто", calendar: "Кал.", task: "Задачи", telegram: "TG", system: "Сист."
};
const LOG_TYPE_STYLES: Record<string, string> = {
  chat: "text-blue-500 bg-blue-500/10", "auto-reply": "text-purple-500 bg-purple-500/10",
  calendar: "text-green-500 bg-green-500/10", task: "text-orange-500 bg-orange-500/10",
  telegram: "text-sky-500 bg-sky-500/10", system: "text-muted-foreground bg-muted",
};

function LogsSection({ onBack }: { onBack: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState("all");

  const params = filter !== "all" ? { type: filter, limit: 200 } : { limit: 200 };
  const { data: logs, isLoading, refetch } = useGetLogs(params, { query: { queryKey: getGetLogsQueryKey(params) } });
  const clear = useClearLogs();

  return (
    <div className="flex flex-col h-full">
      <BackHeader title="Логи" onBack={onBack} />
      <div className="px-4 pt-3 pb-2 flex-shrink-0">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {LOG_TYPES.map(t => (
            <button key={t} onClick={() => setFilter(t)}
              className={cn("px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors",
                filter === t ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground")}>
              {LOG_LABELS[t] ?? t}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 pb-4">
        {isLoading ? (
          <div className="space-y-1.5">{[...Array(8)].map((_, i) => <div key={i} className="h-10 bg-muted rounded-xl animate-pulse" />)}</div>
        ) : !logs?.length ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="text-4xl mb-3">📋</span>
            <p className="text-sm text-muted-foreground">Логов нет</p>
          </div>
        ) : (
          <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
            {logs.map((log, i) => (
              <div key={log.id} className={cn("flex items-start gap-2.5 px-3 py-2.5 text-xs", i < logs.length - 1 && "border-b border-border")}>
                <span className="text-muted-foreground whitespace-nowrap font-mono flex-shrink-0 mt-0.5">
                  {new Date(log.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
                <span className={cn("px-1.5 py-0.5 rounded text-[10px] capitalize flex-shrink-0", LOG_TYPE_STYLES[log.type] ?? LOG_TYPE_STYLES.system)}>
                  {LOG_LABELS[log.type] ?? log.type}
                </span>
                <span className="text-foreground flex-1 min-w-0 break-words">{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="px-4 pb-4 pt-2 border-t border-border flex-shrink-0 flex gap-2">
        <button onClick={() => refetch()} className="flex-1 py-2.5 bg-muted text-foreground rounded-xl text-sm font-medium hover:bg-muted/80 flex items-center justify-center gap-2">
          <RefreshCw size={14} /> Обновить
        </button>
        <button onClick={() => clear.mutate(undefined, { onSuccess: () => { qc.invalidateQueries({ queryKey: getGetLogsQueryKey() }); toast({ title: "Логи очищены" }); } })}
          disabled={clear.isPending}
          className="flex-1 py-2.5 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl text-sm font-medium hover:bg-destructive/20 disabled:opacity-50 flex items-center justify-center gap-2">
          <Trash2 size={14} /> Очистить
        </button>
      </div>
    </div>
  );
}
