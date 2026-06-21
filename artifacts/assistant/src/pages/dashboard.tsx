import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetConversations, useGetConversationMessages, useSendMessage,
  useGetUserStatus, useSetUserStatus,
  getGetConversationsQueryKey, getGetConversationMessagesQueryKey,
  getGetUserStatusQueryKey,
} from "@workspace/api-client-react";
import { Send, Mic, MicOff, Plus, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const STATUS_OPTIONS = [
  { value: "free", label: "Свободен", color: "bg-green-500", desc: "Доступен для общения" },
  { value: "busy", label: "Занят", color: "bg-yellow-500", desc: "Ограниченный доступ" },
  { value: "unavailable", label: "Недоступен", color: "bg-red-500", desc: "Не беспокоить" },
  { value: "custom", label: "Особый", color: "bg-purple-500", desc: "Свой статус" },
];

export default function AssistantPage() {
  const [convId, setConvId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [showConvs, setShowConvs] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [statusContext, setStatusContext] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: statusData } = useGetUserStatus();
  const setStatus = useSetUserStatus();
  const { data: conversations } = useGetConversations();
  const { data: messages, isLoading: loadingMsgs } = useGetConversationMessages(convId!, {
    query: { enabled: !!convId, queryKey: getGetConversationMessagesQueryKey(convId!) }
  });
  const send = useSendMessage();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, send.isPending]);

  useEffect(() => {
    if (statusData) setStatusContext(statusData.context ?? "");
  }, [statusData]);

  function handleSend() {
    const content = input.trim();
    if (!content || send.isPending) return;
    setInput("");
    send.mutate({ data: { content, conversationId: convId ?? undefined } }, {
      onSuccess: (msg) => {
        if (!convId) setConvId(msg.conversationId);
        qc.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetConversationMessagesQueryKey(msg.conversationId) });
      },
      onError: () => toast({ title: "Ошибка отправки сообщения", variant: "destructive" }),
    });
  }

  function handleVoice() {
    type AnyRec = {
      lang: string; interimResults: boolean;
      onresult: ((e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
      onerror: (() => void) | null; onend: (() => void) | null; start: () => void;
    };
    type WinExt = { SpeechRecognition?: new () => AnyRec; webkitSpeechRecognition?: new () => AnyRec };
    const w = window as unknown as WinExt;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) { toast({ title: "Голосовой ввод не поддерживается браузером" }); return; }
    const rec = new SR();
    rec.lang = "ru-RU";
    rec.interimResults = false;
    setIsRecording(true);
    rec.onresult = (e) => {
      const t = e.results[0][0].transcript;
      setInput(prev => prev + (prev ? " " : "") + t);
      setIsRecording(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    };
    rec.onerror = () => { setIsRecording(false); toast({ title: "Ошибка голосового ввода" }); };
    rec.onend = () => setIsRecording(false);
    rec.start();
  }

  function handleSetStatus(value: string) {
    setStatus.mutate({ data: { status: value, context: statusContext } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetUserStatusQueryKey() });
        setShowStatus(false);
      },
    });
  }

  const displayMessages = messages ?? [];
  const currentStatus = STATUS_OPTIONS.find(s => s.value === (statusData?.status ?? "free")) ?? STATUS_OPTIONS[0]!;

  return (
    <div className="flex flex-col h-full">
      {/* Status + conversation bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30 flex-shrink-0">
        {/* Status picker */}
        <div className="relative">
          <button
            onClick={() => { setShowStatus(v => !v); setShowConvs(false); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted text-sm text-foreground hover:bg-muted/80 transition-colors"
          >
            <span className={cn("w-2 h-2 rounded-full flex-shrink-0", currentStatus.color)} />
            <span className="text-xs font-medium">{currentStatus.label}</span>
            <ChevronDown size={11} className="text-muted-foreground" />
          </button>
          {showStatus && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-popover border border-popover-border rounded-xl shadow-lg z-50 overflow-hidden">
              {STATUS_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => handleSetStatus(opt.value)}
                  className={cn("w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted text-left transition-colors", statusData?.status === opt.value && "bg-muted/50")}>
                  <span className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", opt.color)} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                </button>
              ))}
              <div className="px-3 py-2.5 border-t border-border">
                <input value={statusContext} onChange={e => setStatusContext(e.target.value)}
                  placeholder="Контекст (напр. в школе)"
                  className="w-full bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring" />
              </div>
            </div>
          )}
        </div>

        {/* Conversation selector */}
        <div className="relative flex-1">
          <button
            onClick={() => { setShowConvs(v => !v); setShowStatus(false); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted text-sm text-muted-foreground hover:bg-muted/80 transition-colors max-w-full"
          >
            <span className="text-xs truncate">
              {convId ? (conversations?.find(c => c.id === convId)?.title ?? "Диалог") : "Новый диалог"}
            </span>
            <ChevronDown size={11} className="flex-shrink-0" />
          </button>
          {showConvs && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-popover border border-popover-border rounded-xl shadow-lg z-50 overflow-hidden max-h-60 overflow-y-auto">
              <button onClick={() => { setConvId(null); setShowConvs(false); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted text-left transition-colors border-b border-border">
                <Plus size={13} className="text-primary" />
                <span className="text-sm font-medium text-foreground">Новый диалог</span>
              </button>
              {!conversations?.length && (
                <p className="text-xs text-muted-foreground px-3 py-3 text-center">История пуста</p>
              )}
              {conversations?.map(c => (
                <button key={c.id} onClick={() => { setConvId(c.id); setShowConvs(false); }}
                  className={cn("w-full px-3 py-2.5 text-left hover:bg-muted transition-colors", convId === c.id && "bg-muted/50")}>
                  <p className="text-sm text-foreground truncate">{c.title}</p>
                  {c.lastMessage && <p className="text-xs text-muted-foreground truncate mt-0.5">{c.lastMessage}</p>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(showStatus || showConvs) && (
        <div className="fixed inset-0 z-40" onClick={() => { setShowStatus(false); setShowConvs(false); }} />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-3">
        {!convId && !send.isPending && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
              <span className="text-2xl">🤖</span>
            </div>
            <p className="text-base font-semibold text-foreground">Привет! Я ARIA</p>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
              Ваш персональный ИИ-ассистент. Напишите или скажите что-нибудь — я помогу.
            </p>
          </div>
        )}

        {loadingMsgs && (
          <div className="text-xs text-muted-foreground text-center py-4">Загрузка сообщений...</div>
        )}

        {displayMessages.map(msg => (
          <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.role !== "user" && (
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                <span className="text-xs">🤖</span>
              </div>
            )}
            <div className={cn(
              "max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed",
              msg.role === "user"
                ? "bg-primary text-white rounded-br-sm"
                : "bg-card border border-card-border text-foreground rounded-bl-sm"
            )}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <p className={cn("text-[10px] mt-1 opacity-50", msg.role === "user" ? "text-right" : "")}>
                {new Date(msg.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}

        {send.isPending && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
              <span className="text-xs">🤖</span>
            </div>
            <div className="bg-card border border-card-border rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1.5 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 px-3 py-3 border-t border-border bg-background">
        <div className="flex items-end gap-2 bg-card border border-card-border rounded-2xl px-3 py-2 shadow-sm">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            placeholder="Напишите сообщение..."
            rows={1}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none py-1"
            style={{ minHeight: "24px", maxHeight: "120px" }}
          />
          <button
            onClick={handleVoice}
            className={cn(
              "w-8 h-8 flex items-center justify-center rounded-xl flex-shrink-0 transition-colors",
              isRecording ? "bg-red-500/15 text-red-500" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
          <button
            onClick={handleSend}
            disabled={!input.trim() || send.isPending}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-primary text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors flex-shrink-0"
          >
            <Send size={15} />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-1.5">Shift+Enter — новая строка</p>
      </div>
    </div>
  );
}
