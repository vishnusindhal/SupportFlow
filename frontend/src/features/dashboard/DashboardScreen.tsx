import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { onboardingApi } from "../../api/onboarding";
import { knowledgeApi } from "../../api/knowledge";
import { rulesApi } from "../../api/rules";
import { ticketsApi } from "../../api/tickets";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import type { CompanyConfigResponse, CompanyDocument, CompanyRule, Ticket } from "../../types";
import {
  Sparkles,
  Database,
  Scale,
  ArrowRight,
  CheckCircle2,
  Circle,
  Bot,
  AlertCircle,
  Clock,
  Layers,
} from "lucide-react";

export function DashboardScreen() {
  const { session } = useAuth();

  const [config, setConfig] = useState<CompanyConfigResponse | null>(null);
  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [rules, setRules] = useState<CompanyRule[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [statusRes, docsRes, rulesRes, ticketsRes] = await Promise.allSettled([
          onboardingApi.getStatus(),
          knowledgeApi.getDocuments(),
          rulesApi.getRules(),
          ticketsApi.getTickets(),
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

        if (ticketsRes.status === "fulfilled") {
          setTickets(ticketsRes.value);
        }
      } catch {
        // ignore
      }
    }

    void loadDashboardData();
  }, []);

  const readyDocuments = documents.filter((d) => d.status === "ready");
  const activeRules = rules.filter((r) => r.enabled);
  const openTickets = tickets.filter((t) => t.status === "open" || t.status === "in_progress");

  // Agent readiness
  const isAgentReady = isOnboardingComplete && readyDocuments.length > 0;
  const assistantName = config?.config?.assistant?.name ?? "Support Assistant";

  const checklistSteps = [
    {
      title: "Select Industry Template",
      description: isOnboardingComplete
        ? `Configured with ${assistantName} template`
        : "Choose an industry template to load default intents, tone, and policies.",
      completed: isOnboardingComplete,
      link: "/onboarding",
      actionLabel: isOnboardingComplete ? "View Setup" : "Complete Onboarding",
    },
    {
      title: "Upload Support Knowledge",
      description:
        readyDocuments.length > 0
          ? `${readyDocuments.length} document(s) chunked and vector-embedded for AI answers`
          : "Upload PDFs, DOCX, or text policy documents for grounded responses.",
      completed: readyDocuments.length > 0,
      link: "/knowledge",
      actionLabel: "Upload Documents",
    },
    {
      title: "Test AI Agent in Playground",
      description: "Ask questions to verify citations, grounded answers, and escalation rules.",
      completed: false,
      link: "/playground",
      actionLabel: "Launch Playground",
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
            Overview of your SupportFlow AI assistant and customer support activity.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/playground">
            <Button variant="primary" size="md" leftIcon={<Sparkles className="w-4 h-4" />}>
              Chat & Test Agent
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
                  {isAgentReady ? "Ready & Active" : "Setup Required"}
                </Badge>
              </div>
              <p className="text-xs text-slate-text mt-1 max-w-xl leading-relaxed">
                {isAgentReady
                  ? "Your AI assistant is armed with tenant-scoped knowledge, state transitions, and priority escalation rules."
                  : "Upload support documents and select a template to enable grounded answers."}
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-text font-medium">
                <span className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-mint-dark" />
                  {readyDocuments.length} Knowledge Sources Ready
                </span>
                <span className="flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-coral" />
                  {activeRules.length} Active Rules
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
                  Upload Knowledge Docs
                </Button>
              </Link>
            )}
            {isAgentReady && (
              <Link to="/playground">
                <Button variant="outline" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Test Agent in Playground
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 2. Key Operational Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/knowledge" className="block group">
          <Card hoverEffect className="p-5 h-full">
            <CardBody className="p-0">
              <div className="flex items-center justify-between text-slate-text mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Knowledge Base</span>
                <Database className="w-4 h-4 text-mint-dark group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-bold text-charcoal">
                {readyDocuments.length} Document{readyDocuments.length === 1 ? "" : "s"}
              </div>
              <p className="text-xs text-slate-text mt-1.5">
                {readyDocuments.length > 0 ? "Indexed for vector search" : "No documents uploaded yet"}
              </p>
            </CardBody>
          </Card>
        </Link>

        <Link to="/tickets" className="block group">
          <Card hoverEffect className="p-5 h-full">
            <CardBody className="p-0">
              <div className="flex items-center justify-between text-slate-text mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Open Tickets</span>
                <AlertCircle className="w-4 h-4 text-coral group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-bold text-charcoal">
                {openTickets.length} Active
              </div>
              <p className="text-xs text-slate-text mt-1.5">
                {openTickets.length > 0 ? "Awaiting agent or human resolution" : "All customer tickets resolved"}
              </p>
            </CardBody>
          </Card>
        </Link>

        <Link to="/rules" className="block group">
          <Card hoverEffect className="p-5 h-full">
            <CardBody className="p-0">
              <div className="flex items-center justify-between text-slate-text mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Business Rules</span>
                <Scale className="w-4 h-4 text-aubergine group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-bold text-charcoal">{activeRules.length} Active</div>
              <p className="text-xs text-slate-text mt-1.5">
                Deterministic escalation & routing rules
              </p>
            </CardBody>
          </Card>
        </Link>

        <Link to="/settings" className="block group">
          <Card hoverEffect className="p-5 h-full">
            <CardBody className="p-0">
              <div className="flex items-center justify-between text-slate-text mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Workspace</span>
                <Layers className="w-4 h-4 text-lavender-dark group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-bold text-charcoal truncate">
                {session?.organization?.name ?? "Protected"}
              </div>
              <p className="text-xs text-slate-text mt-1.5">
                Strict multi-tenant database isolation
              </p>
            </CardBody>
          </Card>
        </Link>
      </div>

      {/* 3. Setup Progress Stepper (Shown if not fully configured) */}
      {!isAgentReady && (
        <Card>
          <CardHeader
            title="Getting Started Checklist"
            description={`Completed ${completedCount} of ${checklistSteps.length} essential setup steps.`}
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
      )}

      {/* 4. Quick Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/playground" className="block group">
          <Card hoverEffect className="p-5 h-full flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-lg bg-coral-light text-coral flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-charcoal group-hover:text-coral transition-colors">
                Chat & Test AI Agent
              </h3>
              <p className="text-xs text-slate-text mt-1 leading-relaxed">
                Simulate customer inquiries, test document citations, and verify escalation rules in real-time.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-coral">
              <span>Open playground</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Card>
        </Link>

        <Link to="/knowledge" className="block group">
          <Card hoverEffect className="p-5 h-full flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-lg bg-mint-light text-mint-dark flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-charcoal group-hover:text-coral transition-colors">
                Upload Knowledge
              </h3>
              <p className="text-xs text-slate-text mt-1 leading-relaxed">
                Add return policies, shipping guides, or FAQs as PDF, DOCX, or TXT documents.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-coral">
              <span>Upload documents</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Card>
        </Link>

        <Link to="/tickets" className="block group">
          <Card hoverEffect className="p-5 h-full flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-lg bg-lavender-light text-lavender-dark flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-charcoal group-hover:text-coral transition-colors">
                Support Tickets
              </h3>
              <p className="text-xs text-slate-text mt-1 leading-relaxed">
                Handle customer handoffs, collaborate with internal notes, and track issue resolution.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-coral">
              <span>View tickets</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Card>
        </Link>
      </div>

      {/* 5. Recent Support Tickets Table */}
      <Card>
        <CardHeader
          title="Recent Support Tickets"
          description="Customer issues and human escalations requiring team attention."
          action={
            <Link to="/tickets">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                View All Tickets ({tickets.length})
              </Button>
            </Link>
          }
        />
        {tickets.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-text">
            <AlertCircle className="w-8 h-8 text-slate-text/40 mx-auto mb-2" />
            No customer tickets yet. When a conversation is escalated or a ticket is created, it will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-ivory border-b border-warm-border text-slate-text uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-5">Ticket</th>
                  <th className="py-3 px-5">Subject</th>
                  <th className="py-3 px-5">Priority</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-border/60">
                {tickets.slice(0, 5).map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-ivory-light/40 transition-colors">
                    <td className="py-3.5 px-5 font-mono text-slate-text text-[11px]">
                      #{ticket.id.slice(0, 8)}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-charcoal">{ticket.title}</div>
                      <div className="text-slate-text text-[11px] truncate max-w-xs">
                        {ticket.customer_email ?? ticket.description}
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <Badge
                        variant={
                          ticket.priority === "urgent"
                            ? "red"
                            : ticket.priority === "high"
                              ? "coral"
                              : ticket.priority === "normal"
                                ? "amber"
                                : "mint"
                        }
                      >
                        {ticket.priority}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-5">
                      <Badge
                        variant={
                          ticket.status === "resolved" || ticket.status === "closed"
                            ? "mint"
                            : ticket.status === "in_progress"
                              ? "aubergine"
                              : "neutral"
                        }
                        withDot
                      >
                        {ticket.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <Link to="/tickets">
                        <Button variant="ghost" size="sm">
                          Manage
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
