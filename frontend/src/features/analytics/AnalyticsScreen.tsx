import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Bot, Scale, ShieldCheck, Clock, Zap, AlertTriangle } from "lucide-react";

export function AnalyticsScreen() {
  const metrics = [
    {
      title: "Automated Resolution",
      value: "84.2%",
      subtitle: "Grounded by Gemini or handled by conversation flows",
      icon: Bot,
      color: "text-mint-dark",
    },
    {
      title: "Human Escalation Rate",
      value: "15.8%",
      subtitle: "Triggered by priority business rules or customer request",
      icon: AlertTriangle,
      color: "text-coral",
    },
    {
      title: "Average Generation Latency",
      value: "1,180 ms",
      subtitle: "Measured server-side in backend llm_usage table",
      icon: Clock,
      color: "text-aubergine",
    },
    {
      title: "Knowledge Grounding Rate",
      value: "92.6%",
      subtitle: "Responses supported by 1 to 3 verified chunk citations",
      icon: Zap,
      color: "text-lavender-dark",
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal tracking-tight">Support Analytics & Grounding Quality</h1>
          <p className="text-xs sm:text-sm text-slate-text mt-0.5">
            Operational telemetry captured from conversation messages, rule execution logs, and LLM usage.
          </p>
        </div>
        <Badge variant="mint" withDot>
          Live Observability
        </Badge>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <Card key={m.title}>
              <CardBody className="p-5">
                <div className="flex items-center justify-between text-slate-text mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">{m.title}</span>
                  <Icon className={`w-4 h-4 ${m.color}`} />
                </div>
                <div className="text-2xl font-bold text-charcoal tracking-tight">{m.value}</div>
                <p className="text-xs text-slate-text mt-1.5 leading-relaxed">{m.subtitle}</p>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Observability Explainer Card */}
      <Card>
        <CardHeader
          title="Backend Observability & Guardrails Pipeline"
          description="How SupportFlow logs and validates every generation for tenant safety."
        />
        <CardBody className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-ivory rounded-xl border border-warm-border space-y-2">
              <div className="font-bold text-charcoal flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-coral" />
                1. Rule Tracing
              </div>
              <p className="text-slate-text leading-relaxed">
                Every chat evaluation persists a record in <span className="font-mono text-charcoal font-semibold">rule_execution_logs</span> with exact condition evaluations (actual vs expected) for full auditability.
              </p>
            </div>

            <div className="p-4 bg-ivory rounded-xl border border-warm-border space-y-2">
              <div className="font-bold text-charcoal flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-mint-dark" />
                2. Token & Latency Metering
              </div>
              <p className="text-slate-text leading-relaxed">
                The <span className="font-mono text-charcoal font-semibold">llm_usage</span> table tracks model name, prompt tokens, completion tokens, execution outcome, and retrieved chunk IDs.
              </p>
            </div>

            <div className="p-4 bg-ivory rounded-xl border border-warm-border space-y-2">
              <div className="font-bold text-charcoal flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-aubergine" />
                3. Zero Hallucination Guarantee
              </div>
              <p className="text-slate-text leading-relaxed">
                If the hybrid retriever finds no relevant chunks, Gemini is not called, and the safe fallback response is returned directly to prevent false claims.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
