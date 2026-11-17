import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { onboardingApi } from "../../api/onboarding";
import { knowledgeApi } from "../../api/knowledge";
import { rulesApi } from "../../api/rules";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import type { CompanyConfigResponse, CompanyDocument, CompanyRule } from "../../types";
import {
  Sparkles,
  Database,
  Scale,
  ArrowRight,
  CheckCircle2,
  Circle,
  Bot,
  FileText,
  Clock,
  Layers,
} from "lucide-react";

export function DashboardScreen() {
  const { session } = useAuth();

  const [config, setConfig] = useState<CompanyConfigResponse | null>(null);
  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [rules, setRules] = useState<CompanyRule[]>([]);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [statusRes, docsRes, rulesRes] = await Promise.allSettled([
          onboardingApi.getStatus(),
          knowledgeApi.getDocuments(),
          rulesApi.getRules(),
        ]);

        if (statusRes.status === "fulfilled") {
          setIsOnboardingComplete(statusRes.value.is_completed);
          if (statusRes.value.is_completed) {
            try {
              const cfg = await onboardingApi.getCurrentConfig();
              setConfig(cfg);
            } catch {
              // Ignore if config not yet available
            }
          }
        }

        if (docsRes.status === "fulfilled") {
          setDocuments(docsRes.value);
        }

        if (rulesRes.status === "fulfilled") {
          setRules(rulesRes.value);
        }
      } catch {
        // ignore
      }
    }

    void loadDashboardData();
  }, []);

  const readyDocuments = documents.filter((d) => d.status === "ready");
  const activeRules = rules.filter((r) => r.enabled);

  // Compute readiness
  const isAgentReady = isOnboardingComplete && readyDocuments.length > 0;
  const assistantName = config?.config?.assistant?.name ?? "Support Assistant";

  const checklistSteps = [
    {
      title: "Organization workspace created",
      description: `Tenant isolation active for ${session?.organization?.name ?? "your organization"}`,
      completed: true,
      link: "/settings",
      actionLabel: "View settings",
    },
    {
      title: "Industry template configured",
      description: isOnboardingComplete
        ? `Configured with ${config?.config?.assistant?.name ?? "Industry"} template v${config?.template_version ?? 1}`
        : "Select an industry template to load default intents and policies",
      completed: isOnboardingComplete,
      link: "/onboarding",
      actionLabel: isOnboardingComplete ? "View configuration" : "Complete onboarding",
    },
    {
      title: "Support knowledge uploaded",
      description:
        readyDocuments.length > 0
          ? `${readyDocuments.length} document(s) chunked and vector-embedded`
          : "Upload PDFs, DOCX, or text policies for grounded answers",
      completed: readyDocuments.length > 0,
      link: "/knowledge",
      actionLabel: "Manage knowledge",
    },
    {
      title: "Conversation flows verified",
      description: "State machine handles greetings, order status, and human handoffs",
      completed: isOnboardingComplete,
      link: "/flows",
      actionLabel: "Inspect flows",
    },
    {
      title: "Business rules active",
      description:
        activeRules.length > 0
          ? `${activeRules.length} deterministic rule(s) prioritizing customer requests`
          : "Define deterministic actions (escalate, approval) before Gemini runs",
      completed: activeRules.length > 0,
      link: "/rules",
      actionLabel: "Configure rules",
    },
    {
      title: "Test assistant in playground",
      description: "Ask questions to verify citations, grounded answers, and rule executions",
      completed: false,
      link: "/playground",
      actionLabel: "Launch playground",
    },
  ];

  const completedCount = checklistSteps.filter((s) => s.completed).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome & Context Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal tracking-tight">
            Welcome back, {session?.user?.display_name?.split(" ")[0] ?? "there"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-text mt-0.5">
            Here is the current operational status of your customer support workspace.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/playground">
            <Button variant="primary" size="md" leftIcon={<Sparkles className="w-4 h-4" />}>
              Open Test Playground
            </Button>
          </Link>
        </div>
      </div>

      {/* 1. Prominent AI Agent Status Banner */}
      <div
        className={`p-6 rounded-2xl border transition-all ${
          isAgentReady
            ? "bg-gradient-to-r from-white via-white to-mint-light/40 border-mint-dark/30 shadow-xs"
            : "bg-gradient-to-r from-white via-white to-amber-50/50 border-amber-200 shadow-xs"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                isAgentReady ? "bg-mint text-mint-dark" : "bg-amber-100 text-amber-800"
              }`}
            >
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-charcoal tracking-tight">{assistantName}</h2>
                <Badge variant={isAgentReady ? "mint" : "amber"} withDot>
                  {isAgentReady ? "Ready to Serve Customers" : "Setup In Progress"}
                </Badge>
              </div>
              <p className="text-xs text-slate-text mt-1 max-w-xl leading-relaxed">
                {isAgentReady
                  ? "Your AI assistant is armed with tenant-scoped knowledge, deterministic state transitions, and priority escalation rules."
                  : "Complete your knowledge ingestion and template configuration before publishing your assistant."}
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-text font-medium">
                <span className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-mint-dark" />
                  {readyDocuments.length} Knowledge Sources Ready
                </span>
                <span className="flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-coral" />
                  {activeRules.length} Active Business Rules
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-lavender-dark" />
                  Timezone: {config?.company_profile?.timezone ?? "UTC"}
                </span>
              </div>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {!isOnboardingComplete && (
              <Link to="/onboarding">
                <Button variant="primary" size="md">
                  Complete Onboarding
                </Button>
              </Link>
            )}
            {isOnboardingComplete && readyDocuments.length === 0 && (
              <Link to="/knowledge">
                <Button variant="primary" size="md">
                  Upload First Knowledge Doc
                </Button>
              </Link>
            )}
            {isAgentReady && (
              <Link to="/playground">
                <Button variant="outline" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Run Verification Test
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 2. Key Operational Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardBody className="p-5">
            <div className="flex items-center justify-between text-slate-text mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">AI Grounding Mode</span>
              <Bot className="w-4 h-4 text-mint-dark" />
            </div>
            <div className="text-2xl font-bold text-charcoal">Gemini + RAG</div>
            <p className="text-xs text-slate-text mt-1.5">
              Strictly answers from quoted evidence; safe fallback if evidence is missing.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-5">
            <div className="flex items-center justify-between text-slate-text mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Knowledge Chunks</span>
              <FileText className="w-4 h-4 text-coral" />
            </div>
            <div className="text-2xl font-bold text-charcoal">
              {readyDocuments.length > 0 ? `${readyDocuments.length} Documents` : "0 Indexed"}
            </div>
            <p className="text-xs text-slate-text mt-1.5">
              384-dimensional vector embeddings with hybrid lexical ranking.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-5">
            <div className="flex items-center justify-between text-slate-text mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Business Rules</span>
              <Scale className="w-4 h-4 text-aubergine" />
            </div>
            <div className="text-2xl font-bold text-charcoal">{activeRules.length} Active</div>
            <p className="text-xs text-slate-text mt-1.5">
              Deterministic priority actions executed before any LLM generation.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-5">
            <div className="flex items-center justify-between text-slate-text mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Tenant Boundary</span>
              <Layers className="w-4 h-4 text-lavender-dark" />
            </div>
            <div className="text-2xl font-bold text-charcoal">Strictly Isolated</div>
            <p className="text-xs text-slate-text mt-1.5">
              Every document, chunk, and conversation is filtered by organization ID.
            </p>
          </CardBody>
        </Card>
      </div>

      {/* 3. Setup Progress Stepper (Always helpful for new or growing workspaces) */}
      <Card>
        <CardHeader
          title="Workspace Setup Progress"
          description={`Completed ${completedCount} of ${checklistSteps.length} essential setup milestones.`}
          action={
            <div className="flex items-center gap-2">
              <div className="w-24 sm:w-32 h-2 bg-ivory-dark rounded-full overflow-hidden">
                <div
                  className="h-full bg-coral transition-all duration-500 rounded-full"
                  style={{ width: `${(completedCount / checklistSteps.length) * 100}%` }}
                />
              </div>
              <span className="text-xs font-bold text-charcoal">
                {Math.round((completedCount / checklistSteps.length) * 100)}%
              </span>
            </div>
          }
        />
        <div className="divide-y divide-warm-border/60">
          {checklistSteps.map((step, idx) => (
            <div
              key={step.title}
              className="p-4 sm:p-5 flex items-start justify-between gap-4 hover:bg-ivory-light/40 transition-colors"
            >
              <div className="flex items-start gap-3.5">
                <div className="mt-0.5 shrink-0">
                  {step.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-mint-dark" />
                  ) : (
                    <Circle className="w-5 h-5 text-warm-border" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-text">Step {idx + 1}</span>
                    <h3
                      className={`text-sm font-semibold tracking-tight ${
                        step.completed ? "text-charcoal" : "text-charcoal/80"
                      }`}
                    >
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-text mt-0.5 leading-relaxed">{step.description}</p>
                </div>
              </div>
              <div className="shrink-0">
                <Link to={step.link}>
                  <Button variant={step.completed ? "ghost" : "outline"} size="sm">
                    {step.actionLabel}
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 4. Quick Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/knowledge" className="block group">
          <Card hoverEffect className="p-5 h-full flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-lg bg-mint-light text-mint-dark flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-charcoal group-hover:text-coral transition-colors">
                Upload Support Knowledge
              </h3>
              <p className="text-xs text-slate-text mt-1 leading-relaxed">
                Add return policies, FAQs, or shipping guidelines as PDF, DOCX, or text files.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-coral">
              <span>Upload documents</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Card>
        </Link>

        <Link to="/rules" className="block group">
          <Card hoverEffect className="p-5 h-full flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-lg bg-lavender-light text-lavender-dark flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Scale className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-charcoal group-hover:text-coral transition-colors">
                Configure Business Rules
              </h3>
              <p className="text-xs text-slate-text mt-1 leading-relaxed">
                Create deterministic rules to route orders, request approvals, or escalate immediately.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-coral">
              <span>Manage rules</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Card>
        </Link>

        <Link to="/playground" className="block group">
          <Card hoverEffect className="p-5 h-full flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-lg bg-coral-light text-coral flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-charcoal group-hover:text-coral transition-colors">
                Test in Live Playground
              </h3>
              <p className="text-xs text-slate-text mt-1 leading-relaxed">
                Simulate customer questions, verify citations, and inspect real-time grounding traces.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-coral">
              <span>Open playground</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
