import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetContacts, useCreateContact, useUpdateContact, useDeleteContact,
  getGetContactsQueryKey
} from "@workspace/api-client-react";
import { Plus, Trash2, Edit2, X, User, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const LIST_LABELS: Record<string, string> = { whitelist: "Разрешён", blacklist: "Заблокирован", custom: "Особый" };
const LIST_STYLES: Record<string, string> = {
  whitelist: "text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/20",
  blacklist: "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20",
  custom: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20",
};
const PERM_LABELS: Record<string, string> = { full: "Полный", limited: "Ограниченный", "read-only": "Только чтение", blocked: "Заблокирован" };
const PRIORITY_LABELS: Record<string, string> = { urgent: "Срочно", high: "Высокий", normal: "Обычный", low: "Низкий" };
const TONE_LABELS: Record<string, string> = { formal: "Официальный", casual: "Неформальный", friendly: "Дружеский", cold: "Нейтральный" };

type CF = {
  name: string; identifier: string; telegramUsername: string; priority: string;
  permissionLevel: string; tone: string; listType: string;
  autoResponseEnabled: boolean; autoResponseTemplate: string; notes: string;
};
const EMPTY: CF = {
  name: "", identifier: "", telegramUsername: "", priority: "normal",
  permissionLevel: "limited", tone: "casual", listType: "whitelist",
  autoResponseEnabled: false, autoResponseTemplate: "", notes: ""
};

export default function ContactsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<CF>(EMPTY);
  const [expanded, setExpanded] = useState<number | null>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: contacts, isLoading } = useGetContacts();
  const create = useCreateContact();
  const update = useUpdateContact();
  const remove = useDeleteContact();

  function invalidate() { qc.invalidateQueries({ queryKey: getGetContactsQueryKey() }); }

  function openEdit(c: NonNullable<typeof contacts>[number]) {
    setForm({
      name: c.name, identifier: c.identifier ?? "", telegramUsername: c.telegramUsername ?? "",
      priority: c.priority, permissionLevel: c.permissionLevel, tone: c.tone,
      listType: c.listType, autoResponseEnabled: c.autoResponseEnabled ?? false,
      autoResponseTemplate: c.autoResponseTemplate ?? "", notes: c.notes ?? ""
    });
    setEditing(c.id); setShowForm(true);
  }

  function handleSubmit() {
    if (!form.name.trim()) return;
    if (editing) {
      update.mutate({ id: editing, data: form }, {
        onSuccess: () => { invalidate(); setShowForm(false); setEditing(null); setForm(EMPTY); },
        onError: () => toast({ title: "Не удалось обновить контакт", variant: "destructive" }),
      });
    } else {
      create.mutate({ data: form }, {
        onSuccess: () => { invalidate(); setShowForm(false); setForm(EMPTY); },
        onError: () => toast({ title: "Не удалось создать контакт", variant: "destructive" }),
      });
    }
  }

  const Sel = ({ field, label, options }: { field: keyof CF; label: string; options: [string, string][] }) => (
    <div>
      <label className="block text-xs text-muted-foreground mb-1 px-1">{label}</label>
      <select value={form[field] as string} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
        className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 pt-4 pb-4">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" />)}
          </div>
        ) : !contacts?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-4xl mb-3">👥</span>
            <p className="text-sm font-medium text-foreground">Контактов нет</p>
            <p className="text-xs text-muted-foreground mt-1">Добавьте людей вручную</p>
            <button
              onClick={() => { setForm(EMPTY); setEditing(null); setShowForm(true); }}
              className="mt-4 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90"
            >
              + Добавить контакт
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {contacts.map(c => (
              <div key={c.id} className="bg-card border border-card-border rounded-2xl overflow-hidden">
                {/* Main row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User size={16} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{c.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-medium border", LIST_STYLES[c.listType] ?? "")}>
                        {LIST_LABELS[c.listType] ?? c.listType}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{PRIORITY_LABELS[c.priority] ?? c.priority}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(c)} className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => remove.mutate({ id: c.id }, { onSuccess: invalidate })} className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                      <Trash2 size={13} />
                    </button>
                    <button onClick={() => setExpanded(expanded === c.id ? null : c.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted">
                      {expanded === c.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>
                {/* Expanded details */}
                {expanded === c.id && (
                  <div className="px-4 pb-3 border-t border-border pt-2 space-y-1.5">
                    {c.identifier && <p className="text-xs text-muted-foreground">Идентификатор: <span className="text-foreground">{c.identifier}</span></p>}
                    {c.telegramUsername && <p className="text-xs text-muted-foreground">Telegram: <span className="text-foreground">@{c.telegramUsername}</span></p>}
                    <p className="text-xs text-muted-foreground">Разрешения: <span className="text-foreground">{PERM_LABELS[c.permissionLevel] ?? c.permissionLevel}</span></p>
                    <p className="text-xs text-muted-foreground">Стиль: <span className="text-foreground">{TONE_LABELS[c.tone] ?? c.tone}</span></p>
                    {c.autoResponseEnabled && <p className="text-xs text-green-500">✓ Авто-ответ включён</p>}
                    {c.autoResponseTemplate && <p className="text-xs text-muted-foreground italic">"{c.autoResponseTemplate}"</p>}
                    {c.notes && <p className="text-xs text-muted-foreground">Заметка: {c.notes}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => { setForm(EMPTY); setEditing(null); setShowForm(true); }}
        className="absolute bottom-20 right-4 w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-all active:scale-95"
      >
        <Plus size={22} />
      </button>

      {/* Form sheet */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => { setShowForm(false); setEditing(null); }}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full max-w-2xl mx-auto bg-background rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
              <h3 className="text-base font-semibold text-foreground">{editing ? "Редактировать контакт" : "Новый контакт"}</h3>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted">
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-4 py-4 space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1 px-1">Имя *</label>
                <input autoFocus value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Полное имя"
                  className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1 px-1">Идентификатор (email, телефон)</label>
                <input value={form.identifier} onChange={e => setForm(f => ({ ...f, identifier: e.target.value }))}
                  placeholder="example@email.com или +7..."
                  className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1 px-1">Telegram (без @)</label>
                <input value={form.telegramUsername} onChange={e => setForm(f => ({ ...f, telegramUsername: e.target.value }))}
                  placeholder="username"
                  className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Sel field="priority" label="Приоритет" options={[["urgent","Срочно"],["high","Высокий"],["normal","Обычный"],["low","Низкий"]]} />
                <Sel field="permissionLevel" label="Разрешения" options={[["full","Полный"],["limited","Ограниченный"],["read-only","Только чтение"],["blocked","Заблокирован"]]} />
                <Sel field="tone" label="Стиль общения" options={[["formal","Официальный"],["casual","Неформальный"],["friendly","Дружеский"],["cold","Нейтральный"]]} />
                <Sel field="listType" label="Список" options={[["whitelist","Разрешён"],["blacklist","Заблокирован"],["custom","Особый"]]} />
              </div>
              <label className="flex items-center gap-3 cursor-pointer px-1">
                <input type="checkbox" checked={form.autoResponseEnabled}
                  onChange={e => setForm(f => ({ ...f, autoResponseEnabled: e.target.checked }))}
                  className="w-4 h-4 rounded" />
                <span className="text-sm text-foreground">Включить авто-ответ</span>
              </label>
              {form.autoResponseEnabled && (
                <textarea value={form.autoResponseTemplate} onChange={e => setForm(f => ({ ...f, autoResponseTemplate: e.target.value }))}
                  rows={2} placeholder="Шаблон авто-ответа..."
                  className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none resize-none focus:ring-2 focus:ring-primary/30" />
              )}
              <div>
                <label className="block text-xs text-muted-foreground mb-1 px-1">Заметка</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} placeholder="Любая информация о контакте..."
                  className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none resize-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
            <div className="px-4 pb-8 pt-3 border-t border-border flex-shrink-0">
              <button onClick={handleSubmit} disabled={!form.name.trim() || create.isPending || update.isPending}
                className="w-full py-3 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
                {editing ? "Сохранить изменения" : "Добавить контакт"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
