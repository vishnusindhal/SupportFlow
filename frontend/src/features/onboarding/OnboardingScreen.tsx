import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onboardingApi } from "../../api/onboarding";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import type { CompanyConfigResponse, TemplateSummary } from "../../types";
import { Building2, Sparkles, Check, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";

export function OnboardingScreen() {
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [existingConfig, setExistingConfig] = useState<CompanyConfigResponse | null>(null);

  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [companyName, setCompanyName] = useState("");
  const [timezone, setTimezone] = useState("UTC");

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      try {
        const [status, tmpls] = await Promise.all([
          onboardingApi.getStatus(),
          onboardingApi.getTemplates(),
        ]);
        setTemplates(tmpls);
        if (tmpls.length > 0) {
          setSelectedTemplateId(tmpls[0].id);
        }

        if (status.is_completed) {
          setAlreadyCompleted(true);
          try {
            const config = await onboardingApi.getCurrentConfig();
            setExistingConfig(config);
            setCompanyName(config.company_profile.company_name ?? "");
            setTimezone(config.company_profile.timezone ?? "UTC");
          } catch {
            // ignore
          }
        } else if (status.company_profile) {
          if (status.company_profile.company_name) {
            setCompanyName(status.company_profile.company_name);
          }
          if (status.company_profile.timezone) {
            setTimezone(status.company_profile.timezone);
          }
        }
      } catch {
        setErrorMessage("Unable to load onboarding templates from backend.");
      } finally {
        setIsLoading(false);
      }
    }

    void init();
  }, []);

  async function handleSaveProfileAndContinue() {
    if (!companyName.trim()) {
      setErrorMessage("Please enter your company or store name.");
      return;
    }
    setErrorMessage("");
    setIsLoading(true);
    try {
      await onboardingApi.saveProfile({
        company_name: companyName.trim(),
        timezone,
      });
      setStep(2);
    } catch {
      setErrorMessage("Could not save company profile. Check backend connection.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCompleteSetup() {
    if (!selectedTemplateId) {
      setErrorMessage("Please choose an industry template.");
      return;
    }
    setErrorMessage("");
    setIsLoading(true);
    try {
      await onboardingApi.complete(selectedTemplateId);
      setSuccessMessage("Onboarding completed successfully! Your workspace is ready.");
      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (err: unknown) {
      const errResp = err as { response?: { data?: { detail?: string } } };
      setErrorMessage(
        errResp.response?.data?.detail ?? "Onboarding could not be completed. Check backend logs."
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (alreadyCompleted && existingConfig) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-mint-light text-mint-dark flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-charcoal">Workspace Already Configured</h1>
          <p className="text-sm text-slate-text">
            Your organization has already completed onboarding. An immutable configuration snapshot is active.
          </p>
        </div>

        <Card>
          <CardHeader
            title="Active Configuration Snapshot"
            description={`Template Version ${existingConfig.template_version} · Snapshot ID: ${existingConfig.id.slice(0, 8)}...`}
            action={<Badge variant="mint" withDot>Active & Protected</Badge>}
          />
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-text">Company Name:</span>
                <p className="font-semibold text-charcoal mt-0.5">
                  {existingConfig.company_profile.company_name ?? "Northstar Store"}
                </p>
              </div>
              <div>
                <span className="text-slate-text">Timezone:</span>
                <p className="font-semibold text-charcoal mt-0.5">
                  {existingConfig.company_profile.timezone ?? "UTC"}
                </p>
              </div>
              <div>
                <span className="text-slate-text">Assistant Name:</span>
                <p className="font-semibold text-charcoal mt-0.5">
                  {existingConfig.config.assistant?.name ?? "Support Assistant"}
                </p>
              </div>
              <div>
                <span className="text-slate-text">Supported Intents:</span>
                <p className="font-semibold text-charcoal mt-0.5">
                  {existingConfig.config.intents?.length ?? 5} intents configured
                </p>
              </div>
            </div>

            <div className="p-3 bg-ivory rounded-lg border border-warm-border text-xs text-slate-text">
              <strong className="text-charcoal font-semibold">Immutable Tenant Snapshot:</strong> SupportFlow takes an immutable snapshot of industry templates upon completion so that future upstream changes do not alter your support workflows unexpectedly.
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="primary" size="md" onClick={() => navigate("/")}>
                Go to Dashboard
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header & Stepper */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal tracking-tight">
            Configure Your SupportFlow Workspace
          </h1>
          <p className="text-xs sm:text-sm text-slate-text mt-1">
            Set up your organization profile and select an industry template to configure your AI support assistant.
          </p>
        </div>

        {/* Stepper Pills */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { num: 1, label: "Company Profile" },
            { num: 2, label: "Industry Template" },
            { num: 3, label: "Review & Snapshot" },
          ].map((s) => (
            <div
              key={s.num}
              className={`p-2.5 rounded-lg border text-center transition-all ${
                step === s.num
                  ? "bg-white border-coral shadow-xs"
                  : step > s.num
                  ? "bg-mint-light/60 border-mint-dark/30 text-mint-dark"
                  : "bg-ivory-dark/40 border-warm-border text-slate-text"
              }`}
            >
              <div className="text-[11px] font-bold">
                {step > s.num ? (
                  <span className="inline-flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-mint-dark" /> Step {s.num}
                  </span>
                ) : (
                  `Step ${s.num}`
                )}
              </div>
              <div className="text-xs font-semibold text-charcoal truncate mt-0.5">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Error or Success Alert */}
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-status-error font-medium">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="p-3 bg-mint-light border border-mint rounded-lg text-xs text-mint-dark font-medium">
          {successMessage}
        </div>
      )}

      {/* STEP 1: Company Profile */}
      {step === 1 && (
        <Card>
          <CardHeader
            title="Step 1: Your Support Profile"
            description="Enter the name and operational timezone for your customer support assistant."
          />
          <CardBody className="space-y-4">
            <Input
              label="Company or Store Name"
              required
              placeholder="e.g. Northstar Store, Acme Goods"
              leftIcon={<Building2 className="w-4 h-4" />}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              helperText="This name will be referenced in support greetings and customer emails."
            />

            <Select
              label="Primary Timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              helperText="Used for business hour evaluations and timestamped transcripts."
              options={[
                { value: "UTC", label: "UTC (Coordinated Universal Time)" },
                { value: "America/New_York", label: "America/New_York (Eastern Time)" },
                { value: "America/Chicago", label: "America/Chicago (Central Time)" },
                { value: "America/Los_Angeles", label: "America/Los_Angeles (Pacific Time)" },
                { value: "Europe/London", label: "Europe/London (GMT/BST)" },
                { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
                { value: "Asia/Tokyo", label: "Asia/Tokyo (JST)" },
              ]}
            />

            <div className="pt-2 flex justify-end">
              <Button
                variant="primary"
                size="md"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
                onClick={handleSaveProfileAndContinue}
              >
                Continue to Template Selection
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* STEP 2: Choose Template */}
      {step === 2 && (
        <Card>
          <CardHeader
            title="Step 2: Choose an Industry Template"
            description="Industry templates provide tested intents, entity regex patterns, and default business rules."
          />
          <CardBody className="space-y-4">
            <div className="space-y-3">
              {templates.map((tmpl) => {
                const isSelected = selectedTemplateId === tmpl.id;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => setSelectedTemplateId(tmpl.id)}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start justify-between gap-4 ${
                      isSelected
                        ? "border-coral bg-coral-light/20 shadow-xs"
                        : "border-warm-border hover:border-slate-text/40 bg-white"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-charcoal">{tmpl.display_name}</h3>
                        <Badge variant="aubergine">v{tmpl.version}</Badge>
                        <Badge variant="mint">Active Template</Badge>
                      </div>
                      <p className="text-xs text-slate-text">
                        Preconfigured for order tracking, cancellations, returns, and human agent handoff.
                      </p>
                      <div className="pt-2 flex flex-wrap gap-1.5 text-[11px] font-medium text-slate-text">
                        <span className="px-2 py-0.5 rounded bg-ivory border border-warm-border">
                          Intents: Shipping, Returns, Cancellation
                        </span>
                        <span className="px-2 py-0.5 rounded bg-ivory border border-warm-border font-mono">
                          Entity: order_id
                        </span>
                        <span className="px-2 py-0.5 rounded bg-ivory border border-warm-border">
                          Flow: Northstar Flow v1
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 mt-1">
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                          isSelected ? "border-coral bg-coral text-white" : "border-warm-border"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex items-center justify-between">
              <Button variant="ghost" size="md" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                variant="primary"
                size="md"
                rightIcon={<ArrowRight className="w-4 h-4" />}
                onClick={() => setStep(3)}
              >
                Review & Confirm
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* STEP 3: Review & Snapshot */}
      {step === 3 && (
        <Card>
          <CardHeader
            title="Step 3: Review & Finalize Configuration"
            description="Confirm your settings to create your organization's permanent configuration snapshot."
          />
          <CardBody className="space-y-4">
            <div className="p-4 bg-ivory rounded-xl border border-warm-border space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-text">Company Name:</span>
                <span className="font-bold text-charcoal">{companyName}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-text">Operating Timezone:</span>
                <span className="font-bold text-charcoal">{timezone}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-text">Selected Industry Template:</span>
                <span className="font-bold text-charcoal">
                  {templates.find((t) => t.id === selectedTemplateId)?.display_name ?? "Selected Template"}
                </span>
              </div>
            </div>

            <div className="p-3 bg-mint-light/60 border border-mint/40 rounded-lg text-xs text-mint-dark flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-mint-dark shrink-0 mt-0.5" />
              <div>
                <strong>Immutable Snapshot Guarantee:</strong> Completing onboarding permanently isolates your workspace configuration so that updates to global templates never disrupt your live customer support workflows.
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <Button variant="ghost" size="md" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                variant="primary"
                size="md"
                isLoading={isLoading}
                leftIcon={<Sparkles className="w-4 h-4" />}
                onClick={handleCompleteSetup}
              >
                Confirm Setup & Create Snapshot
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
