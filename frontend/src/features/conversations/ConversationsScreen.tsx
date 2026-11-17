import { useEffect, useState, useRef } from "react";
import { chatApi } from "../../api/chat";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import type { ChatMessage, ChatResponse, Conversation } from "../../types";
import { Plus, Send, User, Bot, ShieldCheck } from "lucide-react";

export function ConversationsScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function init() {
      try {
        const initial = await chatApi.createConversation("customer_portal");
        setConversations([initial]);
        setActiveConvId(initial.id);
        const history = await chatApi.getMessages(initial.id);
        setMessages(history);
      } catch {
        // error handling
      }
    }

    void init();
  }, []);

  useEffect(() => {
    if (!activeConvId) return;
    chatApi
      .getMessages(activeConvId)
      .then(setMessages)
      .catch(() => setMessages([]));
  }, [activeConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleCreateThread() {
    try {
      const conv = await chatApi.createConversation(`web_chat_${Date.now().toString().slice(-4)}`);
      setConversations((prev) => [conv, ...prev]);
      setActiveConvId(conv.id);
      setMessages([]);
    } catch {
      // error handling
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !activeConvId || isSending) return;

    const userText = input.trim();
    setInput("");
    setIsSending(true);

    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: userText,
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const response: ChatResponse = await chatApi.sendMessage(activeConvId, userText);
      const assistantMsg: ChatMessage = {
        id: response.message_id,
        role: "assistant",
        content: response.answer,
        intent: response.intent,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: "Message delivery failed. Please check backend connection.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal tracking-tight">Customer Conversations</h1>
          <p className="text-xs sm:text-sm text-slate-text mt-0.5">
            Real customer interaction threads persisted with state, intent, entities, and token usage records.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => void handleCreateThread()}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          New Conversation Thread
        </Button>
      </div>

      {/* 3-Column Support Inbox */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[680px]">
        {/* Left Column: Thread List (3 cols) */}
        <Card className="lg:col-span-3 flex flex-col overflow-hidden shadow-xs">
          <CardHeader title="Inbox Threads" description={`${conversations.length} active channel(s)`} />
          <div className="flex-1 overflow-y-auto divide-y divide-warm-border/60">
            {conversations.map((c) => {
              const isActive = c.id === activeConvId;
              return (
                <div
                  key={c.id}
                  onClick={() => setActiveConvId(c.id)}
                  className={`p-3.5 cursor-pointer transition-colors ${
                    isActive ? "bg-coral-light/20 border-l-4 border-coral" : "hover:bg-ivory-light"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-charcoal truncate">
                      Channel: {c.channel}
                    </span>
                    <Badge variant={isActive ? "coral" : "neutral"}>
                      {c.status}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-slate-text font-mono truncate mt-1">
                    ID: {c.id.slice(0, 8)}...
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Middle Column: Active Chat Thread (6 cols) */}
        <Card className="lg:col-span-6 flex flex-col overflow-hidden shadow-xs">
          <CardHeader
            title="Conversation Stream"
            description={activeConvId ? `Thread ID: ${activeConvId}` : "Select a thread"}
            action={
              <Badge variant="mint" withDot>
                Active
              </Badge>
            }
          />

          {/* Transcript */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-ivory-light/30">
            {messages.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-text">
                No messages in this conversation yet. Send a customer message to begin.
              </div>
            ) : (
              messages.map((m) => {
                const isUser = m.role === "user";
                return (
                  <div
                    key={m.id}
                    className={`flex items-start gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 ${
                        isUser ? "bg-coral text-white" : "bg-aubergine text-white"
                      }`}
                    >
                      {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div
                      className={`max-w-[80%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                        isUser
                          ? "bg-coral text-white rounded-tr-none shadow-xs"
                          : "bg-white text-charcoal rounded-tl-none border border-warm-border shadow-xs"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.content}</p>
                      {m.intent && (
                        <div className="mt-2 text-[10px] font-mono text-slate-text">
                          intent: {m.intent}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            {isSending && (
              <div className="flex items-center gap-2 text-xs text-slate-text italic">
                <div className="w-3.5 h-3.5 border-2 border-coral border-t-transparent rounded-full animate-spin" />
                Assistant is responding...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div className="p-3 bg-white border-t border-warm-border">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                placeholder="Type customer message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 bg-ivory-light border border-warm-border rounded-lg px-3.5 py-2 text-xs sm:text-sm focus:outline-none focus:border-coral"
              />
              <Button
                variant="primary"
                size="md"
                type="submit"
                disabled={!input.trim() || isSending}
                leftIcon={<Send className="w-3.5 h-3.5" />}
              >
                Send
              </Button>
            </form>
          </div>
        </Card>

        {/* Right Column: Context & Metadata (3 cols) */}
        <Card className="lg:col-span-3 flex flex-col overflow-y-auto shadow-xs">
          <CardHeader title="Thread Context" description="Extracted customer entities" />
          <CardBody className="p-4 space-y-4 text-xs">
            <div>
              <span className="text-slate-text font-medium block">Channel:</span>
              <span className="font-semibold text-charcoal mt-0.5 block">
                {conversations.find((c) => c.id === activeConvId)?.channel ?? "Web Widget"}
              </span>
            </div>

            <div>
              <span className="text-slate-text font-medium block">Grounding Mode:</span>
              <span className="font-semibold text-mint-dark mt-0.5 block flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Quoted Evidence Only
              </span>
            </div>

            <div>
              <span className="text-slate-text font-medium block">Escalation Policy:</span>
              <span className="text-slate-text mt-0.5 block leading-relaxed">
                If customer requests human handoff or if rule criteria match, conversation is routed to the escalation queue.
              </span>
            </div>

            <div className="p-3 bg-ivory rounded-lg border border-warm-border space-y-1">
              <div className="text-[11px] font-bold text-charcoal uppercase">Tenant Scoped</div>
              <p className="text-[11px] text-slate-text leading-relaxed">
                Messages and LLM token usage are isolated to your organization.
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
