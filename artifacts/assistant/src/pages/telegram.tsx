import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetTelegramSettings, useUpdateTelegramSettings, useTestTelegramConnection, getGetTelegramSettingsQueryKey } from "@workspace/api-client-react";
import { Send, CheckCircle, XCircle, RefreshCw, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function Telegram() {
  const { data: settings, isLoading } = useGetTelegramSettings();
  const update = useUpdateTelegramSettings();
  const test = useTestTelegramConnection();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showToken, setShowToken] = useState(false);
  const [form, setForm] = useState({
    enabled: false, botToken: "", autoReplyEnabled: false,
    forwardAllMessages: false, requireConfirmation: true, defaultReplyTemplate: ""
  });

  useEffect(() => {
    if (settings) setForm({
      enabled: settings.enabled, botToken: settings.botToken ?? "",
      autoReplyEnabled: settings.autoReplyEnabled, forwardAllMessages: settings.forwardAllMessages,
      requireConfirmation: settings.requireConfirmation, defaultReplyTemplate: settings.defaultReplyTemplate ?? ""
    });
  }, [settings]);

  function handleSave() {
    update.mutate({ data: form }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getGetTelegramSettingsQueryKey() }); toast({ title: "Telegram settings saved" }); },
      onError: () => toast({ title: "Failed to save settings", variant: "destructive" }),
    });
  }

  function handleTest() {
    test.mutate(undefined, {
      onSuccess: (r) => {
        qc.invalidateQueries({ queryKey: getGetTelegramSettingsQueryKey() });
        toast({ title: r.success ? `Connected as @${r.botUsername}` : r.message, variant: r.success ? "default" : "destructive" });
      },
      onError: () => toast({ title: "Connection test failed", variant: "destructive" }),
    });
  }

  const Toggle = ({ field, label, desc }: { field: keyof typeof form; label: string; desc?: string }) => (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <button data-testid={`toggle-${field}`} onClick={() => setForm(f => ({ ...f, [field]: !f[field as keyof typeof form] }))}
        className={cn("w-10 h-5.5 rounded-full relative transition-colors flex-shrink-0 mt-0.5", form[field as keyof typeof form] ? "bg-primary" : "bg-muted border border-border")}>
        <span className={cn("absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm", form[field as keyof typeof form] ? "translate-x-4.5" : "")} />
      </button>
    </div>
  );

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6 flex items-center gap-2">
        <Send size={18} className="text-primary" />
        <div>
          <h1 className="text-xl font-semibold text-foreground">Telegram Bot</h1>
          <p className="text-sm text-muted-foreground">Connect ARIA to Telegram for smart messaging</p>
        </div>
      </div>

      {/* Connection status */}
      {!isLoading && (
        <div className={cn("rounded-xl p-3.5 mb-5 flex items-center gap-3 border", settings?.botConnected ? "bg-green-500/10 border-green-500/20" : "bg-muted border-border")}>
          {settings?.botConnected ? <CheckCircle size={16} className="text-green-500" /> : <XCircle size={16} className="text-muted-foreground" />}
          <div>
            <p className="text-sm font-medium text-foreground">{settings?.botConnected ? `Connected as @${settings.botUsername}` : "Not connected"}</p>
            <p className="text-xs text-muted-foreground">{settings?.botConnected ? "Bot is active and receiving messages" : "Enter a bot token to connect"}</p>
          </div>
        </div>
      )}

      <div className="bg-card border border-card-border rounded-xl p-4 mb-4">
        <h2 className="text-sm font-semibold mb-3">Bot Token</h2>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input data-testid="input-bot-token"
              type={showToken ? "text" : "password"}
              value={form.botToken} onChange={e => setForm(f => ({ ...f, botToken: e.target.value }))}
              placeholder="Enter bot token from @BotFather"
              className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring pr-9" />
            <button onClick={() => setShowToken(v => !v)} className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground">
              {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <button data-testid="button-test-connection" onClick={handleTest} disabled={test.isPending || !form.botToken}
            className="px-3 py-2 bg-muted text-foreground rounded-lg text-sm hover:bg-muted/80 disabled:opacity-50 flex items-center gap-1.5">
            <RefreshCw size={13} className={test.isPending ? "animate-spin" : ""} /> Test
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Create a bot at <span className="text-primary">@BotFather</span> on Telegram to get a token</p>
      </div>

      <div className="bg-card border border-card-border rounded-xl p-4 mb-4">
        <h2 className="text-sm font-semibold mb-1">Settings</h2>
        <Toggle field="enabled" label="Enable Telegram Bot" desc="Allow ARIA to receive and respond to Telegram messages" />
        <Toggle field="autoReplyEnabled" label="Auto-Reply" desc="Automatically generate replies when you're busy" />
        <Toggle field="requireConfirmation" label="Require Confirmation" desc="Ask before sending any message on your behalf" />
        <Toggle field="forwardAllMessages" label="Forward All Messages" desc="Forward incoming messages to your dashboard" />
      </div>

      <div className="bg-card border border-card-border rounded-xl p-4 mb-4">
        <h2 className="text-sm font-semibold mb-2">Default Reply Template</h2>
        <textarea data-testid="input-reply-template" value={form.defaultReplyTemplate}
          onChange={e => setForm(f => ({ ...f, defaultReplyTemplate: e.target.value }))}
          rows={3} placeholder="e.g. Hi, I'm currently unavailable. I'll get back to you soon."
          className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm outline-none resize-none focus:ring-1 focus:ring-ring" />
      </div>

      <button data-testid="button-save-telegram" onClick={handleSave} disabled={update.isPending}
        className="w-full py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
        {update.isPending ? "Saving..." : "Save Settings"}
      </button>
    </div>
  );
}
