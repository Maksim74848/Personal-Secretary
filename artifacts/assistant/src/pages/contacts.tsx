import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetContacts, useCreateContact, useUpdateContact, useDeleteContact, getGetContactsQueryKey } from "@workspace/api-client-react";
import { Plus, Trash2, Edit2, X, Shield, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const LIST_STYLES: Record<string, string> = {
  whitelist: "text-green-500 bg-green-500/10 border-green-500/20",
  blacklist: "text-red-500 bg-red-500/10 border-red-500/20",
  custom: "text-purple-500 bg-purple-500/10 border-purple-500/20",
};
const PRIORITY_STYLES: Record<string, string> = {
  urgent: "text-red-500", high: "text-orange-500", normal: "text-blue-500", low: "text-muted-foreground"
};
const PERMISSION_STYLES: Record<string, string> = {
  full: "text-green-500", limited: "text-yellow-500", "read-only": "text-blue-500", blocked: "text-red-500"
};

type ContactForm = {
  name: string; identifier: string; telegramUsername: string; priority: string;
  permissionLevel: string; tone: string; listType: string; autoResponseEnabled: boolean;
  autoResponseTemplate: string; notes: string;
};

const EMPTY_FORM: ContactForm = {
  name: "", identifier: "", telegramUsername: "", priority: "normal",
  permissionLevel: "limited", tone: "casual", listType: "whitelist",
  autoResponseEnabled: false, autoResponseTemplate: "", notes: ""
};

export default function Contacts() {
  const [form, setForm] = useState<ContactForm>(EMPTY_FORM);
  const [editing, setEditing] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: contacts, isLoading } = useGetContacts();
  const create = useCreateContact();
  const update = useUpdateContact();
  const remove = useDeleteContact();

  function invalidate() { qc.invalidateQueries({ queryKey: getGetContactsQueryKey() }); }

  function openEdit(c: typeof contacts extends (infer T)[] | undefined ? T : never) {
    if (!c) return;
    setForm({
      name: c.name, identifier: c.identifier ?? "", telegramUsername: c.telegramUsername ?? "",
      priority: c.priority, permissionLevel: c.permissionLevel, tone: c.tone,
      listType: c.listType, autoResponseEnabled: c.autoResponseEnabled ?? false,
      autoResponseTemplate: c.autoResponseTemplate ?? "", notes: c.notes ?? ""
    });
    setEditing(c.id);
    setShowForm(true);
  }

  function handleSubmit() {
    if (!form.name.trim()) return;
    if (editing) {
      update.mutate({ id: editing, data: form }, {
        onSuccess: () => { invalidate(); setShowForm(false); setEditing(null); setForm(EMPTY_FORM); },
        onError: () => toast({ title: "Failed to update contact", variant: "destructive" }),
      });
    } else {
      create.mutate({ data: form }, {
        onSuccess: () => { invalidate(); setShowForm(false); setForm(EMPTY_FORM); },
        onError: () => toast({ title: "Failed to create contact", variant: "destructive" }),
      });
    }
  }

  const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div><label className="block text-xs text-muted-foreground mb-1">{label}</label>{children}</div>
  );
  const Input = ({ field, ...p }: { field: keyof ContactForm } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...p} value={form[field] as string} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
  );
  const Select = ({ field, options }: { field: keyof ContactForm; options: string[] }) => (
    <select value={form[field] as string} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm outline-none">
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Contacts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{contacts?.length ?? 0} contacts</p>
        </div>
        <button
          data-testid="button-add-contact"
          onClick={() => { setForm(EMPTY_FORM); setEditing(null); setShowForm(v => !v); }}
          className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
        >
          <Plus size={14} /> Add Contact
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-card-border rounded-xl p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">{editing ? "Edit Contact" : "New Contact"}</h3>
            <button onClick={() => { setShowForm(false); setEditing(null); }}><X size={15} className="text-muted-foreground" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <F label="Name *"><Input field="name" placeholder="Contact name" /></F>
            <F label="Identifier"><Input field="identifier" placeholder="Email, phone..." /></F>
            <F label="Telegram Username"><Input field="telegramUsername" placeholder="@username" /></F>
            <F label="Priority"><Select field="priority" options={["urgent","high","normal","low"]} /></F>
            <F label="Permission Level"><Select field="permissionLevel" options={["full","limited","read-only","blocked"]} /></F>
            <F label="Tone"><Select field="tone" options={["formal","casual","friendly","cold"]} /></F>
            <F label="List Type"><Select field="listType" options={["whitelist","blacklist","custom"]} /></F>
            <F label="Auto-response">
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input type="checkbox" checked={form.autoResponseEnabled}
                  onChange={e => setForm(f => ({ ...f, autoResponseEnabled: e.target.checked }))}
                  className="rounded" />
                <span className="text-sm text-foreground">Enable auto-response</span>
              </label>
            </F>
            {form.autoResponseEnabled && (
              <div className="col-span-2">
                <F label="Auto-response Template">
                  <textarea value={form.autoResponseTemplate} onChange={e => setForm(f => ({ ...f, autoResponseTemplate: e.target.value }))}
                    rows={2} placeholder="Auto-reply message..."
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm outline-none resize-none focus:ring-1 focus:ring-ring" />
                </F>
              </div>
            )}
            <div className="col-span-2">
              <F label="Notes">
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} placeholder="Notes about this contact..."
                  className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm outline-none resize-none focus:ring-1 focus:ring-ring" />
              </F>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
            <button
              data-testid="button-submit-contact"
              onClick={handleSubmit}
              disabled={create.isPending || update.isPending}
              className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50"
            >{editing ? "Save Changes" : "Add Contact"}</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : !contacts?.length ? (
        <div className="text-center py-12 text-sm text-muted-foreground">No contacts yet</div>
      ) : (
        <div className="space-y-2">
          {contacts.map(c => (
            <div key={c.id} data-testid={`contact-row-${c.id}`} className="bg-card border border-card-border rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User size={15} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{c.name}</p>
                <p className="text-xs text-muted-foreground truncate">{c.identifier ?? c.telegramUsername ?? "No identifier"}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className={cn("text-xs px-1.5 py-0.5 rounded border capitalize", LIST_STYLES[c.listType] ?? LIST_STYLES.custom)}>{c.listType}</span>
                <span className={cn("text-xs font-medium capitalize", PRIORITY_STYLES[c.priority] ?? "")}>{c.priority}</span>
                <Shield size={12} className={cn(PERMISSION_STYLES[c.permissionLevel] ?? "")} />
                <button data-testid={`button-edit-contact-${c.id}`} onClick={() => openEdit(c)} className="p-1.5 text-muted-foreground hover:text-foreground"><Edit2 size={13} /></button>
                <button data-testid={`button-delete-contact-${c.id}`} onClick={() => remove.mutate({ id: c.id }, { onSuccess: invalidate })} className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
