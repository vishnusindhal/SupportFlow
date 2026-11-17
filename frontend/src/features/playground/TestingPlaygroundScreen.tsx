import { useState, useRef, useEffect } from "react";
import { chatApi } from "../../api/chat";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import type { ChatResponse } from "../../types";
import {
  Send,
  Bot,
  User,
  ShieldCheck,
  AlertTriangle,
  GitFork,
  BookOpen,
  RotateCcw,
} from "lucide-react";

interface MessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  responseMeta?: ChatResponse;
}

export function TestingPlaygroundScreen() {
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: "init",
      role: "assistant",
      content:
        "Hello! I am your SupportFlow AI Assistant. How can I help you today? You can ask about shipping, cancellations, return policies, or check your order status.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeMeta, setActiveMeta] = useState<ChatResponse | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const samplePrompts = [
    "How long does delivery usually take?",
    "Can I return an item after 20 days?",
    "Where is my order ORD-8891?",
    "I received a damaged item, can I get a replacement?",
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(textToSend?: string) {
    const text = textToSend ?? input;
    if (!text.trim() || isLoading) return;

    const userMsg: MessageItem = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: text.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setIsLoading(true);

    try {
      const response = await chatApi.preview(text.trim());
      const assistantMsg: MessageItem = {
        id: response.message_id || `asst-${Date.now()}`,
        role: "assistant",
        content: response.answer,
        responseMeta: response,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setActiveMeta(response);
    } catch {
      const errorMsg: MessageItem = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content:
          "Unable to reach the assistant service. Please verify that the backend API is running and your Gemini configuration is present in .env.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }

  function resetConversation() {
    setMessages([
      {
        id: "init",
        role: "assistant",
        content:
          "Conversation restarted. Ask a support question to test tenant retrieval, conversation flows, and business rules.",
      },
    ]);
    setActiveMeta(null);
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal tracking-tight">Testing Playground</h1>
          <p className="text-xs sm:text-sm text-slate-text mt-0.5">
            Simulate real customer interactions. Inspect the deterministic flow, rule matches, and evidence citations behind every response.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={resetConversation}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Reset Chat
          </Button>
        </div>
      </div>

      {/* Dual Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Pane: Interactive Chat Simulation (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="flex flex-col h-[650px] shadow-sm overflow-hidden">
            <CardHeader
              title="Customer Chat Preview"
              description="Simulated web chat widget"
              action={
                <Badge variant="mint" withDot>
                  Active Preview
                </Badge>
              }
            />

            {/* Chat Transcript */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-ivory-light/30">
              {messages.map((msg) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 ${
                        isUser
                          ? "bg-coral text-white"
                          : "bg-aubergine text-white"
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
                      <p className="whitespace-pre-wrap">{msg.content}</p>

                      {/* Assistant citation pill */}
                      {!isUser && msg.responseMeta && (
                        <div className="mt-2.5 pt-2 border-t border-warm-border/60 flex flex-wrap items-center gap-2 text-[11px]">
                          {msg.responseMeta.sources.length > 0 ? (
                            <span className="text-mint-dark font-medium flex items-center gap-1">
                              <BookOpen className="w-3 h-3" />
                              Grounded in {msg.responseMeta.sources.length} document source(s)
                            </span>
                          ) : msg.responseMeta.action === "escalate" ? (
                            <span className="text-status-error font-medium flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Escalated by Business Rule
                            </span>
                          ) : msg.responseMeta.fallback ? (
                            <span className="text-status-warning font-medium flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Safe Fallback Triggered
                            </span>
                          ) : (
                            <span className="text-slate-text font-medium flex items-center gap-1">
                              <GitFork className="w-3 h-3" />
                              Deterministic Flow
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-slate-text italic">
                  <div className="w-4 h-4 border-2 border-coral border-t-transparent rounded-full animate-spin" />
                  Evaluating rules, retrieving knowledge & generating grounded response...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Sample Questions */}
            <div className="p-3 bg-white border-t border-warm-border/60 flex items-center gap-2 overflow-x-auto text-xs">
              <span className="text-[11px] font-semibold text-slate-text uppercase shrink-0">
                Sample:
              </span>
              {samplePrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSend(prompt)}
                  className="px-2.5 py-1 rounded-full bg-ivory border border-warm-border hover:border-coral text-slate-text hover:text-charcoal whitespace-nowrap text-xs transition-colors cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="p-3.5 bg-white border-t border-warm-border">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Ask a customer question (e.g. Can I cancel order ORD-1234?)..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="flex-1 bg-ivory-light/80 border border-warm-border rounded-lg px-3.5 py-2 text-xs sm:text-sm text-charcoal placeholder:text-slate-text/60 focus:outline-none focus:ring-2 focus:ring-coral/20 focus:border-coral"
                />
                <Button
                  variant="primary"
                  size="md"
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  leftIcon={<Send className="w-3.5 h-3.5" />}
                >
                  Send
                </Button>
              </form>
            </div>
          </Card>
        </div>

        {/* Right Pane: Real-Time Grounding & Decision Inspector (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="shadow-sm">
            <CardHeader
              title="Decision & Grounding Inspector"
              description="Behind-the-scenes trace for the latest customer message."
            />
            <CardBody className="p-5 space-y-5">
              {!activeMeta ? (
                <div className="p-8 text-center text-xs text-slate-text bg-ivory rounded-xl border border-warm-border">
                  <Bot className="w-8 h-8 text-slate-text/50 mx-auto mb-2" />
                  Send a message in the chat simulator to inspect intent detection, rule matches, and evidence citations.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 1. Action Outcome */}
                  <div>
                    <span className="text-[11px] font-semibold text-slate-text uppercase tracking-wider block mb-1">
                      Execution Outcome
                    </span>
                    <div className="p-3 bg-ivory rounded-lg border border-warm-border flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {activeMeta.action === "escalate" ? (
                          <Badge variant="red" withDot>
                            Escalated by Rule
                          </Badge>
                        ) : activeMeta.fallback ? (
                          <Badge variant="amber" withDot>
                            Safe Grounding Fallback
                          </Badge>
                        ) : activeMeta.sources.length > 0 ? (
                          <Badge variant="mint" withDot>
                            Grounded in Evidence
                          </Badge>
                        ) : (
                          <Badge variant="lavender" withDot>
                            Flow Handled
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs font-mono text-slate-text">
                        State: {activeMeta.current_state}
                      </span>
                    </div>
                  </div>

                  {/* 2. Intent & Rule Action */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-ivory rounded-lg border border-warm-border">
                      <span className="text-slate-text font-medium block">Detected Intent:</span>
                      <span className="font-bold text-charcoal mt-1 block">
                        {activeMeta.intent ?? "knowledge_question"}
                      </span>
                    </div>
                    <div className="p-3 bg-ivory rounded-lg border border-warm-border">
                      <span className="text-slate-text font-medium block">Escalation Flag:</span>
                      <span
                        className={`font-bold mt-1 block ${
                          activeMeta.escalation_offered ? "text-status-error" : "text-mint-dark"
                        }`}
                      >
                        {activeMeta.escalation_offered ? "Escalated to Agent" : "Automated"}
                      </span>
                    </div>
                  </div>

                  {/* 3. Citations & Grounded Evidence */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold text-slate-text uppercase tracking-wider">
                        Cited Evidence ({activeMeta.sources.length})
                      </span>
                      <span className="text-[11px] text-slate-text">Max 3 citations</span>
                    </div>

                    {activeMeta.sources.length === 0 ? (
                      <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-lg text-xs text-amber-900 leading-relaxed">
                        No quoted company evidence matched this question. The assistant provided a safe fallback answer rather than inventing unverified claims.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {activeMeta.sources.map((source, idx) => (
                          <div
                            key={source.chunk_id}
                            className="p-3 bg-white rounded-lg border border-warm-border shadow-2xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-charcoal flex items-center gap-1.5">
                                <span className="w-4 h-4 rounded-full bg-mint text-mint-dark text-[10px] font-bold flex items-center justify-center">
                                  {idx + 1}
                                </span>
                                {source.document_name}
                              </span>
                              <span className="text-[11px] text-slate-text font-mono">
                                chunk #{source.chunk_id.slice(0, 6)}
                              </span>
                            </div>
                            <p className="text-xs text-charcoal font-mono bg-ivory p-2 rounded border border-warm-border/60 leading-relaxed">
                              "{source.excerpt}"
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 4. Safety & Tenancy Invariant */}
                  <div className="p-3 bg-aubergine-light/10 border border-aubergine/20 rounded-lg text-xs text-aubergine space-y-1">
                    <div className="font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-mint-dark" />
                      Controlled AI Boundary Verified
                    </div>
                    <p className="text-[11px] text-slate-text leading-relaxed">
                      Gemini is instructed via system prompt to treat evidence as untrusted reference text and answer only from quoted excerpts.
                    </p>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
