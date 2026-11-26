import { useEffect, useState } from "react";
import { rulesApi } from "../../api/rules";
import { Card, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Modal } from "../../components/ui/Modal";
import { EmptyState } from "../../components/ui/EmptyState";
import type {
  CompanyRule,
  RuleActionType,
  RuleEvaluation,
  RuleInput,
  RuleOperator,
} from "../../types";
import {
  Scale,
  Plus,
  Play,
  Trash2,
  CheckCircle2,
  XCircle,
  RotateCcw,
} from "lucide-react";

export function BusinessRulesScreen() {
  const [rules, setRules] = useState<CompanyRule[]>([]);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // New Rule Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [rulePriority, setRulePriority] = useState(10);
  const [ruleLogic, setRuleLogic] = useState<"all" | "any">("all");
  const [conditionField, setConditionField] = useState("intent");
  const [conditionOperator, setConditionOperator] = useState<RuleOperator>("equals");
  const [conditionValue, setConditionValue] = useState("order_status");
  const [actionType, setActionType] = useState<RuleActionType>("escalate");
  const [actionMessage, setActionMessage] = useState("A customer support representative will review this request.");
  const [actionTeam, setActionTeam] = useState("");
  const [ticketPriority, setTicketPriority] = useState<"" | "low" | "normal" | "high" | "urgent">("");
  const [isCreating, setIsCreating] = useState(false);
  // Fields and intents the chat workflow actually provides (from the backend).
  const [fieldOptions, setFieldOptions] = useState<string[]>([
    "intent",
    "message",
    "entities.order_id",
    "conversation.state",
  ]);
  const [intentOptions, setIntentOptions] = useState<string[]>([
    "order_status",
    "damaged_item",
    "cancellation",
    "returns",
    "talk_to_agent",
    "knowledge_question",
  ]);

  // Dry-run Sandbox Modal
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testContextText, setTestContextText] = useState(
    JSON.stringify(
      {
        message: "Where is my package for order ORD-1234?",
        intent: "order_status",
        entities: { order_id: "ORD-1234" },
      },
      null,
      2
    )
  );
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<RuleEvaluation | null>(null);

  async function loadRules() {
    try {
      const data = await rulesApi.getRules();
      setRules(data);
    } catch {
      setFeedback({ type: "error", text: "Unable to load business rules from backend." });
    }
  }

  useEffect(() => {
    void loadRules();
    rulesApi
      .getOptions()
      .then((options) => {
        setFieldOptions(options.fields);
        setIntentOptions(options.intents);
      })
      .catch(() => {
        // Keep the built-in defaults.
      });
  }, []);

  const usesTicket = actionType !== "auto_respond";
  const isIntentValue = conditionField === "intent" && conditionOperator !== "in" && conditionOperator !== "contains";

  function handleFieldChange(field: string) {
    setConditionField(field);
    if (field === "intent") {
      setConditionValue(intentOptions[0] ?? "order_status");
    } else if (conditionField === "intent") {
      setConditionValue("");
    }
  }

  async function handleCreateRule(e: React.FormEvent) {
    e.preventDefault();
    if (!ruleName.trim()) return;

    setIsCreating(true);
    setFeedback(null);

    const payload: RuleInput = {
      name: ruleName.trim(),
      priority: Number(rulePriority),
      logic: ruleLogic,
      conditions: [
        {
          field: conditionField.trim(),
          operator: conditionOperator,
          value: conditionValue.trim(),
        },
      ],
      action: {
        type: actionType,
        message: actionType === "set_priority" ? undefined : actionMessage.trim() || undefined,
        team: actionType === "route_to_team" ? actionTeam.trim() || "support" : undefined,
        priority: usesTicket && ticketPriority ? ticketPriority : undefined,
      },
      enabled: true,
    };

    try {
      await rulesApi.createRule(payload);
      setFeedback({ type: "success", text: `Rule "${payload.name}" successfully created.` });
      setIsModalOpen(false);
      // Reset form
      setRuleName("");
      setActionMessage("A customer support representative will review this request.");
      await loadRules();
    } catch (err: unknown) {
      const errResp = err as { response?: { data?: { detail?: string | Array<{ msg?: string }> } } };
      const detail = errResp.response?.data?.detail;
      setFeedback({
        type: "error",
        text:
          typeof detail === "string"
            ? detail
            : detail?.[0]?.msg?.replace(/^Value error, /, "") ?? "Could not create rule. Check condition format.",
      });
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDisableRule(id: string) {
    try {
      await rulesApi.disableRule(id);
      setFeedback({ type: "success", text: "Rule disabled." });
      await loadRules();
    } catch {
      setFeedback({ type: "error", text: "Could not disable rule." });
    }
  }

  async function handleEnableRule(rule: CompanyRule) {
    try {
      await rulesApi.updateRule(rule.id, {
        name: rule.name,
        conditions: rule.conditions,
        logic: rule.logic,
        action: rule.action,
        priority: rule.priority,
        enabled: true,
      });
      setFeedback({ type: "success", text: `Rule "${rule.name}" enabled.` });
      await loadRules();
    } catch (err: unknown) {
      const errResp = err as { response?: { data?: { detail?: string | Array<{ msg?: string }> } } };
      const detail = errResp.response?.data?.detail;
      setFeedback({
        type: "error",
        text:
          typeof detail === "string"
            ? detail
            : detail?.[0]?.msg?.replace(/^Value error, /, "") ?? "Could not enable rule.",
      });
    }
  }

  async function handleRunDryRun() {
    setIsEvaluating(true);
    setEvaluationResult(null);
    try {
      const parsedContext = JSON.parse(testContextText);
      const res = await rulesApi.testRules(parsedContext);
      setEvaluationResult(res);
    } catch {
      setFeedback({ type: "error", text: "Invalid JSON format in test context." });
    } finally {
      setIsEvaluating(false);
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal tracking-tight">Deterministic Business Rules</h1>
          <p className="text-xs sm:text-sm text-slate-text mt-0.5">
            Rules evaluate customer intents and entities in priority order before retrieval or Gemini runs.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTestModalOpen(true)}
            leftIcon={<Play className="w-3.5 h-3.5 text-mint-dark" />}
          >
            Dry-Run Test Sandbox
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Create Rule
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

      {/* Rules Explainer Banner */}
      <div className="p-4 rounded-xl bg-aubergine text-white border border-aubergine-dark shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-coral text-white flex items-center justify-center shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">
              Deterministic Guardrail Architecture
            </h2>
            <p className="text-xs text-lavender/80 mt-0.5 max-w-2xl leading-relaxed">
              Rules run in ascending priority order (1 first). The first matching rule immediately executes its typed action (escalate, require approval, route to team). The LLM is never allowed to override these business decisions.
            </p>
          </div>
        </div>
        <Badge variant="mint" withDot className="self-start md:self-center shrink-0">
          Strict Data Validation · No Code Execution
        </Badge>
      </div>

      {/* Rules List Card */}
      <Card>
        <CardHeader
          title="Configured Company Rules"
          description={`Showing ${rules.length} rule(s) in priority sequence.`}
          action={
            <Button variant="ghost" size="sm" onClick={() => void loadRules()} leftIcon={<RotateCcw className="w-3.5 h-3.5" />}>
              Refresh
            </Button>
          }
        />
        {rules.length === 0 ? (
          <EmptyState
            icon={<Scale className="w-6 h-6" />}
            title="No business rules configured"
            description="Add priority rules to safely escalate sensitive requests, like damaged items or order cancellations."
            actionLabel="Create First Rule"
            onAction={() => setIsModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-ivory border-b border-warm-border text-slate-text uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-5">Priority</th>
                  <th className="py-3 px-5">Rule Name</th>
                  <th className="py-3 px-5">WHEN (Conditions)</th>
                  <th className="py-3 px-5">THEN (Action)</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-border/60">
                {rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-ivory-light/40 transition-colors">
                    <td className="py-3.5 px-5 font-mono font-bold text-charcoal">
                      #{rule.priority}
                    </td>
                    <td className="py-3.5 px-5 font-semibold text-charcoal">
                      {rule.name}
                    </td>
                    <td className="py-3.5 px-5 font-mono text-slate-text max-w-xs">
                      {rule.conditions.map((c, i) => (
                        <div key={i} className="truncate">
                          {c.field} {c.operator} <span className="text-charcoal font-bold">"{String(c.value)}"</span>
                        </div>
                      ))}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant={
                            rule.action.type === "escalate"
                              ? "red"
                              : rule.action.type === "require_approval"
                              ? "amber"
                              : "lavender"
                          }
                        >
                          {rule.action.type}
                        </Badge>
                        {rule.action.message && (
                          <span className="text-[11px] text-slate-text truncate max-w-xs" title={rule.action.message}>
                            "{rule.action.message}"
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      {rule.enabled ? (
                        <Badge variant="mint" withDot>
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="neutral">Disabled</Badge>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      {rule.enabled ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleDisableRule(rule.id)}
                          title="Disable rule"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-status-error" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleEnableRule(rule)}
                          title="Enable rule"
                        >
                          Enable
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* CREATE RULE MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Deterministic Business Rule"
        description="Configure conditions that evaluate customer context before LLM generation."
      >
        <form onSubmit={handleCreateRule} className="space-y-4">
          <Input
            label="Rule Name"
            required
            placeholder="e.g. Escalate damaged product queries"
            value={ruleName}
            onChange={(e) => setRuleName(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Evaluation Priority"
              type="number"
              required
              min={1}
              max={1000}
              helperText="Lower numbers execute first (e.g. 10 runs before 100)"
              value={rulePriority}
              onChange={(e) => setRulePriority(Number(e.target.value))}
            />
            <Select
              label="Match Logic"
              value={ruleLogic}
              onChange={(e) => setRuleLogic(e.target.value as "all" | "any")}
              options={[
                { value: "all", label: "Match ALL conditions (AND)" },
                { value: "any", label: "Match ANY condition (OR)" },
              ]}
            />
          </div>

          <div className="p-4 bg-ivory rounded-xl border border-warm-border space-y-3">
            <span className="text-xs font-bold text-charcoal uppercase tracking-wider block">
              WHEN (Condition Definition)
            </span>
            <div className="grid grid-cols-3 gap-2">
              <Select
                label="Context Field"
                value={conditionField}
                onChange={(e) => handleFieldChange(e.target.value)}
                options={fieldOptions.map((field) => ({ value: field, label: field }))}
              />
              <Select
                label="Operator"
                value={conditionOperator}
                onChange={(e) => setConditionOperator(e.target.value as RuleOperator)}
                options={[
                  { value: "equals", label: "equals" },
                  { value: "not_equals", label: "not equals" },
                  { value: "contains", label: "contains" },
                  { value: "greater_than", label: "greater than" },
                  { value: "less_than", label: "less than" },
                  { value: "in", label: "in list" },
                ]}
              />
              {isIntentValue ? (
                <Select
                  label="Target Value"
                  value={conditionValue}
                  onChange={(e) => setConditionValue(e.target.value)}
                  options={intentOptions.map((intent) => ({ value: intent, label: intent }))}
                />
              ) : (
                <Input
                  label="Target Value"
                  required
                  placeholder={
                    conditionOperator === "in"
                      ? "returns, cancellation"
                      : conditionField === "message"
                      ? "e.g. damaged, lawyer"
                      : "e.g. ORD-1234"
                  }
                  value={conditionValue}
                  onChange={(e) => setConditionValue(e.target.value)}
                />
              )}
            </div>
            <p className="text-[11px] text-slate-text leading-relaxed">
              <strong>intent</strong> is detected from the customer message (order status, damaged item,
              cancellation, returns, talk to agent). <strong>message</strong> + contains matches words in
              the message. For <strong>in list</strong>, separate values with commas. Text comparisons ignore
              upper/lower case.
            </p>
          </div>

          <div className="p-4 bg-ivory rounded-xl border border-warm-border space-y-3">
            <span className="text-xs font-bold text-charcoal uppercase tracking-wider block">
              THEN (Deterministic Action)
            </span>
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Action Type"
                value={actionType}
                onChange={(e) => setActionType(e.target.value as RuleActionType)}
                options={[
                  { value: "escalate", label: "Escalate to Human Agent" },
                  { value: "require_approval", label: "Require Human Approval" },
                  { value: "route_to_team", label: "Route to Specialist Team" },
                  { value: "auto_respond", label: "Auto-Respond with Fixed Message" },
                  { value: "set_priority", label: "Set Priority" },
                ]}
              />
              {actionType === "route_to_team" && (
                <Input
                  label="Team Name"
                  placeholder="e.g. shipping, tier2, billing"
                  value={actionTeam}
                  onChange={(e) => setActionTeam(e.target.value)}
                />
              )}
              {usesTicket && (
                <Select
                  label="Ticket Priority"
                  value={ticketPriority}
                  onChange={(e) => setTicketPriority(e.target.value as typeof ticketPriority)}
                  options={[
                    { value: "", label: actionType === "set_priority" ? "normal" : "Default (normal)" },
                    { value: "low", label: "low" },
                    { value: "normal", label: "normal" },
                    { value: "high", label: "high" },
                    { value: "urgent", label: "urgent" },
                  ]}
                />
              )}
            </div>

            {actionType === "set_priority" ? (
              <p className="text-[11px] text-slate-text leading-relaxed">
                Set Priority does not reply by itself: the assistant answers normally, and any ticket created
                later in the conversation gets this priority.
              </p>
            ) : (
              <Input
                label="Customer-Facing Response Message"
                placeholder="e.g. Your request has been escalated to our human support team."
                value={actionMessage}
                onChange={(e) => setActionMessage(e.target.value)}
              />
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" size="md" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit" isLoading={isCreating}>
              Save & Activate Rule
            </Button>
          </div>
        </form>
      </Modal>

      {/* DRY RUN SANDBOX MODAL */}
      <Modal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        title="Side-Effect-Free Rule Dry-Run Sandbox"
        description="Simulate rule execution against runtime context without altering conversation state."
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">
              Simulation Context (JSON)
            </label>
            <textarea
              rows={6}
              value={testContextText}
              onChange={(e) => setTestContextText(e.target.value)}
              className="w-full bg-ivory font-mono text-xs p-3 rounded-lg border border-warm-border focus:outline-none focus:border-coral"
            />
          </div>

          <Button
            variant="aubergine"
            size="md"
            className="w-full"
            isLoading={isEvaluating}
            leftIcon={<Play className="w-4 h-4" />}
            onClick={handleRunDryRun}
          >
            Execute Dry-Run Evaluation
          </Button>

          {evaluationResult && (
            <div className="p-4 rounded-xl border border-warm-border bg-ivory space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-charcoal uppercase tracking-wider">
                  Evaluation Result
                </span>
                <Badge variant={evaluationResult.matched ? "mint" : "neutral"} withDot>
                  {evaluationResult.matched ? "Rule Matched & Fired" : "No Rules Matched (RAG would run)"}
                </Badge>
              </div>

              {evaluationResult.matched && (
                <div className="p-3 bg-white rounded-lg border border-warm-border text-xs space-y-1">
                  <div>
                    Matched Rule: <strong className="text-charcoal">{evaluationResult.rule_name}</strong>
                  </div>
                  <div>
                    Action Triggered: <Badge variant="red">{evaluationResult.action?.type}</Badge>
                  </div>
                  {evaluationResult.action?.message && (
                    <div className="text-slate-text">"{evaluationResult.action.message}"</div>
                  )}
                </div>
              )}

              {/* Trace items */}
              <div>
                <span className="text-[11px] font-bold text-slate-text uppercase block mb-1.5">
                  Evaluated Rule Trace ({evaluationResult.trace.length} evaluated)
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {evaluationResult.trace.map((t, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded bg-white border border-warm-border/60 text-[11px] flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        {t.matched ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-mint-dark shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-slate-text/40 shrink-0" />
                        )}
                        <span className="font-semibold text-charcoal">{t.name}</span>
                      </div>
                      <span className="font-mono text-slate-text">
                        {t.matched ? "MATCHED (Stop)" : "no match"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
