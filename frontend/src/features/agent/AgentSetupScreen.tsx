import { useEffect, useState } from "react";
import { onboardingApi } from "../../api/onboarding";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import type { CompanyConfigResponse } from "../../types";
import { Bot, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export function AgentSetupScreen() {
  const [config, setConfig] = useState<CompanyConfigResponse | null>(null);

  useEffect(() => {
    onboardingApi
      .getCurrentConfig()
      .then(setConfig)
      .catch(() => setConfig(null));
  }, []);

  const assistant = config?.config?.assistant;
  const intents = config?.config?.intents ?? [];
  const entities = config?.config?.entities ?? [];
  const faqs = config?.config?.faqs ?? [];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal tracking-tight">AI Agent Setup & Persona</h1>
          <p className="text-xs sm:text-sm text-slate-text mt-0.5">
            Active agent configuration snapshot derived from your industry template.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="mint" withDot>
            Snapshot v{config?.template_version ?? 1} Active
          </Badge>
          <Link to="/playground">
            <Button variant="primary" size="sm" leftIcon={<Sparkles className="w-3.5 h-3.5" />}>
              Test Agent
            </Button>
          </Link>
        </div>
      </div>

      {/* Agent Identity Card */}
      <Card>
        <CardHeader
          title="Agent Identity & Personality"
          description="How the assistant represents your brand to customers."
        />
        <CardBody className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-aubergine text-white flex items-center justify-center shrink-0 shadow-sm">
              <Bot className="w-7 h-7 text-mint" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-charcoal">
                {assistant?.name ?? "Northstar Support Assistant"}
              </h2>
              <p className="text-xs text-slate-text max-w-lg leading-relaxed">
                Tone of voice: <span className="font-semibold text-charcoal">{assistant?.tone ?? "Clear, helpful, and concise"}</span>. Configured with strict grounding prompts to protect brand integrity.
              </p>
              <div className="pt-2 flex items-center gap-2 text-xs">
                <Badge variant="mint">
                  Human Handoff: {assistant?.handoff_enabled ? "Enabled" : "Disabled"}
                </Badge>
                <Badge variant="aubergine">
                  Timezone: {config?.company_profile?.timezone ?? "UTC"}
                </Badge>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 2-column details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Supported Topics / Intents */}
        <Card>
          <CardHeader
            title="Recognized Customer Intents"
            description="Core topics the agent is calibrated to understand."
          />
          <CardBody className="p-5">
            {intents.length === 0 ? (
              <p className="text-xs text-slate-text">No custom intents configured.</p>
            ) : (
              <div className="space-y-2">
                {intents.map((item) => (
                  <div
                    key={item.key}
                    className="p-3 rounded-lg bg-ivory border border-warm-border flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-charcoal">{item.label}</span>
                    <span className="font-mono text-[11px] text-slate-text">{item.key}</span>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Structured Entity Extraction */}
        <Card>
          <CardHeader
            title="Entity Recognition Patterns"
            description="Constrained patterns used to safely extract IDs and numbers."
          />
          <CardBody className="p-5">
            {entities.length === 0 ? (
              <p className="text-xs text-slate-text">No custom entities defined.</p>
            ) : (
              <div className="space-y-2">
                {entities.map((item) => (
                  <div
                    key={item.key}
                    className="p-3 rounded-lg bg-ivory border border-warm-border space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-charcoal">{item.key}</span>
                      <Badge variant="lavender">{item.type}</Badge>
                    </div>
                    {item.pattern && (
                      <div className="font-mono text-[11px] text-slate-text truncate">
                        regex: {item.pattern}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Pre-packaged Domain FAQs */}
      <Card>
        <CardHeader
          title="Baseline Domain Policies & FAQs"
          description="Pre-packaged baseline answers provided by your template snapshot."
        />
        <CardBody className="p-5">
          <div className="divide-y divide-warm-border/60">
            {faqs.map((faq, idx) => (
              <div key={idx} className="py-3 first:pt-0 last:pb-0 text-xs space-y-1">
                <div className="font-bold text-charcoal flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-coral/20 text-coral-dark text-[10px] flex items-center justify-center font-bold">
                    Q
                  </span>
                  {faq.question}
                </div>
                <p className="text-slate-text pl-6 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
