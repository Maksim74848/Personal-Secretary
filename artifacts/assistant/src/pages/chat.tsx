import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetConversations, useGetConversationMessages, useSendMessage,
  getGetConversationsQueryKey, getGetConversationMessagesQueryKey
} from "@workspace/api-client-react";
import { Send, Mic, MicOff, Plus, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function Chat() {
  const [convId, setConvId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: conversations } = useGetConversations();
  const { data: messages, isLoading: loadingMsgs } = useGetConversationMessages(convId!, {
    query: { enabled: !!convId, queryKey: getGetConversationMessagesQueryKey(convId!) }
  });
  const send = useSendMessage();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

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
      onError: () => toast({ title: "Failed to send message", variant: "destructive" }),
    });
  }

  function handleVoice() {
    type AnyRec = { lang: string; interimResults: boolean; onresult: ((e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start: () => void };
    type WinExt = { SpeechRecognition?: new () => AnyRec; webkitSpeechRecognition?: new () => AnyRec };
    const w = window as unknown as WinExt;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) { toast({ title: "Voice input not supported in this browser" }); return; }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    setIsRecording(true);
    rec.onresult = (e) => {
      const t = e.results[0][0].transcript;
      setInput(prev => prev + (prev ? " " : "") + t);
      setIsRecording(false);
    };
    rec.onerror = () => { setIsRecording(false); toast({ title: "Voice input failed" }); };
    rec.onend = () => setIsRecording(false);
    rec.start();
  }

  const displayMessages = messages ?? (send.isPending ? [] : []);

  return (
    <div className="flex h-full">
      {/* Conversation list */}
      <div className="w-52 flex-shrink-0 border-r border-border flex flex-col bg-card/50">
        <div className="p-3 border-b border-border">
          <button
            data-testid="button-new-conversation"
            onClick={() => setConvId(null)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus size={14} /> New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-0.5">
          {!conversations?.length && (
            <p className="text-xs text-muted-foreground px-2 py-4 text-center">No conversations yet</p>
          )}
          {conversations?.map(c => (
            <button
              key={c.id}
              data-testid={`conversation-item-${c.id}`}
              onClick={() => setConvId(c.id)}
              className={cn(
                "w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors",
                convId === c.id ? "bg-primary/15 text-primary" : "text-foreground hover:bg-muted"
              )}
            >
              <div className="font-medium truncate">{c.title}</div>
              {c.lastMessage && <div className="text-muted-foreground truncate mt-0.5">{c.lastMessage}</div>}
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
          <MessageSquare size={15} className="text-primary" />
          <span className="text-sm font-semibold text-foreground">
            {convId ? (conversations?.find(c => c.id === convId)?.title ?? "Conversation") : "New Conversation"}
          </span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-4">
          {!convId && !send.isPending && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <MessageSquare size={20} className="text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">How can I help you today?</p>
                <p className="text-xs text-muted-foreground mt-1">Start a conversation with ARIA</p>
              </div>
            </div>
          )}

          {loadingMsgs && <div className="text-xs text-muted-foreground text-center py-4">Loading messages...</div>}

          {displayMessages.map(msg => (
            <div key={msg.id} data-testid={`message-${msg.role}-${msg.id}`} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[72%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-primary text-white rounded-br-sm"
                  : "bg-card border border-card-border text-foreground rounded-bl-sm"
              )}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <p className={cn("text-xs mt-1 opacity-60", msg.role === "user" ? "text-right" : "")}>
                  {new Date(msg.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}

          {send.isPending && (
            <div className="flex justify-start">
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

        {/* Input */}
        <div className="px-5 py-4 border-t border-border">
          <div className="flex items-end gap-2 bg-card border border-card-border rounded-xl px-3 py-2">
            <textarea
              data-testid="input-chat-message"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Message ARIA..."
              rows={1}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none max-h-32 py-1"
              style={{ minHeight: "24px" }}
            />
            <button
              data-testid="button-voice-input"
              onClick={handleVoice}
              className={cn("p-1.5 rounded-lg transition-colors flex-shrink-0", isRecording ? "text-red-500 bg-red-500/10" : "text-muted-foreground hover:text-foreground hover:bg-muted")}
            >
              {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            <button
              data-testid="button-send-message"
              onClick={handleSend}
              disabled={!input.trim() || send.isPending}
              className="p-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              <Send size={16} />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 px-1">Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  );
}
