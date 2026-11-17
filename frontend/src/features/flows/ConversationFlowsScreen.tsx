import { useEffect, useState } from "react";
import { flowsApi } from "../../api/flows";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import type { FlowConfig, FlowResponse } from "../../types";
import { Code, ArrowRight } from "lucide-react";

export function ConversationFlowsScreen() {
  const [flowResponse, setFlowResponse] = useState<FlowResponse | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function loadFlow() {
    try {
      const data = await flowsApi.getCurrentFlow();
      setFlowResponse(data);
      if (data.flow) {
        setJsonText(JSON.stringify(data.flow, null, 2));
      } else {
        const defaultFlow: FlowConfig = {
          version: 1,
          initial_state: "start",
          states: {
            start: {
              prompt: "How can we help today?",
              options: {
                "1": { label: "Track an order", next_state: "order_status" },
                "2": { label: "Return policy", next_state: "returns" },
                "3": { label: "Speak with a human", next_state: "agent_handoff" },
              },
            },
            order_status: {
              prompt: "Please provide your order reference number (e.g. ORD-1234).",
              options: {
                "1": { label: "Return to main menu", next_state: "start" },
              },
            },
            returns: {
              prompt: "Returns are accepted within 30 days of delivery for unworn items.",
              options: {
                "1": { label: "Start a return", next_state: "order_status" },
                "2": { label: "Return to main menu", next_state: "start" },
              },
            },
            agent_handoff: {
              prompt: "A customer support representative has been notified and will assist you.",
              options: {},
              terminal: true,
            },
          },
        };
        setJsonText(JSON.stringify(defaultFlow, null, 2));
      }
    } catch {
      setFeedback({ type: "error", text: "Unable to load conversation flows from backend." });
    }
  }

  useEffect(() => {
    void loadFlow();
  }, []);

  async function handleSaveFlow() {
    setIsSaving(true);
    setFeedback(null);
    try {
      const parsed = JSON.parse(jsonText) as FlowConfig;
      if (!parsed.states || !parsed.initial_state) {
        throw new Error("Flow must specify an initial_state and states dictionary.");
      }
      if (!parsed.states[parsed.initial_state]) {
        throw new Error(`initial_state "${parsed.initial_state}" does not exist in states.`);
      }

      const res = await flowsApi.saveCurrentFlow(parsed);
      setFlowResponse(res);
      setIsEditing(false);
      setFeedback({
        type: "success",
        text: `Conversation flow updated to version ${res.version}.`,
      });
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        text: (err as Error).message ?? "Invalid flow JSON or transition validation failed.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  const activeFlow = flowResponse?.flow
    ? flowResponse.flow
    : (() => {
        try {
          return JSON.parse(jsonText) as FlowConfig;
        } catch {
          return null;
        }
      })();

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal tracking-tight">Conversation Flows</h1>
          <p className="text-xs sm:text-sm text-slate-text mt-0.5">
            Finite-state workflow machine managing customer greetings, structured menus, and deterministic state transitions.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Badge variant="mint" withDot>
            Version {flowResponse?.version ?? 1}
          </Badge>
          <Button
            variant={isEditing ? "outline" : "primary"}
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            leftIcon={<Code className="w-3.5 h-3.5" />}
          >
            {isEditing ? "View Visual State Map" : "Edit Flow JSON"}
          </Button>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-lg border text-xs font-medium flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-mint-light text-mint-dark border-mint"
              : "bg-red-50 text-status-error border-red-200"
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-bold underline cursor-pointer ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Global Intent Callout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-warm-border">
          <div className="text-xs font-bold text-charcoal uppercase tracking-wider mb-1">
            talk_to_agent
          </div>
          <p className="text-xs text-slate-text leading-relaxed">
            Customers saying "agent", "human", or "representative" immediately offer human escalation.
          </p>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-warm-border">
          <div className="text-xs font-bold text-charcoal uppercase tracking-wider mb-1">
            restart
          </div>
          <p className="text-xs text-slate-text leading-relaxed">
            Resets the conversation context and returns the customer to the initial prompt.
          </p>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-warm-border">
          <div className="text-xs font-bold text-charcoal uppercase tracking-wider mb-1">
            order_status (ORD-...)
          </div>
          <p className="text-xs text-slate-text leading-relaxed">
            Extracts order IDs formatted with prefix such as <span className="font-mono font-bold text-charcoal">ORD-1234</span> into runtime entities.
          </p>
        </div>
      </div>

      {/* Visual State Explorer OR JSON Editor */}
      {isEditing ? (
        <Card>
          <CardHeader
            title="Flow Definition JSON Editor"
            description="Strict Pydantic validation ensures that initial_state and every transition target state exist without dead ends."
          />
          <CardBody className="p-6 space-y-4">
            <textarea
              rows={16}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="w-full bg-ivory font-mono text-xs p-4 rounded-xl border border-warm-border focus:outline-none focus:border-coral leading-relaxed"
            />
            <div className="flex justify-end gap-3">
              <Button variant="ghost" size="md" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="md" isLoading={isSaving} onClick={handleSaveFlow}>
                Validate & Deploy Flow
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-text px-1">
            <span>
              Initial State: <strong className="text-charcoal font-semibold">{activeFlow?.initial_state}</strong>
            </span>
            <span>{Object.keys(activeFlow?.states ?? {}).length} Defined State(s)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeFlow &&
              Object.entries(activeFlow.states).map(([stateKey, stateDef]) => {
                const isInitial = stateKey === activeFlow.initial_state;
                return (
                  <Card key={stateKey} className="overflow-hidden">
                    <CardHeader
                      title={
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-charcoal">{stateKey}</span>
                          {isInitial && <Badge variant="coral">Initial State</Badge>}
                          {stateDef.terminal && <Badge variant="neutral">Terminal State</Badge>}
                        </div>
                      }
                      description="Prompt shown to customer:"
                    />
                    <CardBody className="p-5 space-y-3">
                      <div className="p-3 bg-ivory rounded-lg border border-warm-border text-xs text-charcoal font-medium">
                        "{stateDef.prompt}"
                      </div>

                      {Object.keys(stateDef.options).length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[11px] font-bold text-slate-text uppercase tracking-wider block">
                            Menu Transitions:
                          </span>
                          {Object.entries(stateDef.options).map(([optKey, optVal]) => (
                            <div
                              key={optKey}
                              className="p-2.5 rounded-lg bg-ivory-light border border-warm-border/60 flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded bg-aubergine text-white text-[10px] font-bold flex items-center justify-center">
                                  {optKey}
                                </span>
                                <span className="font-semibold text-charcoal">{optVal.label}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-slate-text font-mono text-[11px]">
                                <span>routes to</span>
                                <ArrowRight className="w-3 h-3 text-coral" />
                                <span className="font-bold text-charcoal">{optVal.next_state}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardBody>
                  </Card>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
