import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../api/auth";
import { useAuth } from "../../auth/AuthProvider";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Card } from "../../components/ui/Card";
import { Shield, Sparkles, CheckCircle2, Lock, Mail, Building, User } from "lucide-react";

export function LoginScreen() {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"demo" | "login" | "register">("demo");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form state
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  async function handleDemoSignIn() {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const auth = await authApi.signInToDemo();
      signIn({
        accessToken: auth.access_token,
        user: auth.user,
        organization: auth.organization,
        membership: auth.membership,
      });
      navigate("/");
    } catch {
      setErrorMessage("Demo sign-in failed. Please ensure the backend server is running on port 8000.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    try {
      const auth = await authApi.login({
        email: loginEmail,
        password: loginPassword,
      });
      signIn({
        accessToken: auth.access_token,
        user: auth.user,
        organization: auth.organization,
        membership: auth.membership,
      });
      navigate("/");
    } catch {
      setErrorMessage("Invalid credentials. Please verify your email and password.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    try {
      const auth = await authApi.register({
        organization_name: orgName,
        organization_slug: orgSlug || orgName.toLowerCase().replace(/[^a-z0-9]/g, "-"),
        display_name: displayName,
        email: regEmail,
        password: regPassword,
      });
      signIn({
        accessToken: auth.access_token,
        user: auth.user,
        organization: auth.organization,
        membership: auth.membership,
      });
      navigate("/onboarding");
    } catch {
      setErrorMessage("Registration failed. That organization slug or email may already be in use.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ivory flex">
      {/* Left Brand Panel (Deep Aubergine) */}
      <div className="hidden lg:flex lg:w-1/2 bg-aubergine p-12 text-white flex-col justify-between relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-aubergine-light/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-coral/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-coral flex items-center justify-center font-bold text-white text-xl shadow-md">
              S
            </div>
            <span className="text-xl font-bold tracking-tight text-white">SupportFlow AI</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-aubergine-light text-lavender text-xs font-medium border border-aubergine-muted">
            <Shield className="w-3.5 h-3.5 text-mint" />
            <span>Multi-Tenant & Controlled AI Architecture</span>
          </div>
        </div>

        {/* Value Proposition */}
        <div className="relative z-10 max-w-md space-y-6">
          <h1 className="text-3xl font-semibold leading-tight text-white tracking-tight">
            Intelligent customer support with deterministic business guardrails.
          </h1>
          <p className="text-sm text-lavender/80 leading-relaxed">
            SupportFlow gives non-technical business owners complete control over their support
            agent. Grounded in private knowledge, guided by deterministic conversation flows, and
            shielded by strict company rules.
          </p>

          <div className="space-y-3 pt-2">
            {[
              "Strict tenant-isolated data boundary",
              "Private document ingestion with hybrid retrieval",
              "Deterministic rules run before LLM generation",
              "Grounded Gemini answers with source citations",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2.5 text-xs text-lavender">
                <CheckCircle2 className="w-4 h-4 text-mint shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-xs text-lavender/50">
          <span>Enterprise-ready customer support platform.</span>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile Brand Header */}
          <div className="lg:hidden flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-coral flex items-center justify-center font-bold text-white text-lg">
              S
            </div>
            <span className="text-lg font-bold text-charcoal">SupportFlow AI</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-charcoal tracking-tight">Welcome to SupportFlow</h2>
            <p className="text-xs text-slate-text mt-1">
              Sign in to manage your AI customer support assistant.
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex rounded-lg bg-ivory-dark/60 p-1 border border-warm-border text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setActiveTab("demo");
                setErrorMessage("");
              }}
              className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === "demo" ? "bg-white text-charcoal shadow-xs font-semibold" : "text-slate-text hover:text-charcoal"
              }`}
            >
              Demo Workspace
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("login");
                setErrorMessage("");
              }}
              className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === "login" ? "bg-white text-charcoal shadow-xs font-semibold" : "text-slate-text hover:text-charcoal"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("register");
                setErrorMessage("");
              }}
              className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === "register" ? "bg-white text-charcoal shadow-xs font-semibold" : "text-slate-text hover:text-charcoal"
              }`}
            >
              New Organization
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-status-error">
              {errorMessage}
            </div>
          )}

          {/* TAB 1: Demo Sign In */}
          {activeTab === "demo" && (
            <Card className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-coral-light text-coral flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-charcoal">One-Click Demo Access</h3>
                  <p className="text-xs text-slate-text mt-0.5 leading-relaxed">
                    Instantly signs you into the pre-configured <strong>Northstar Store</strong>{" "}
                    demonstration workspace with e-commerce templates and grounded support data.
                  </p>
                </div>
              </div>

              <div className="bg-ivory rounded-lg p-3 border border-warm-border text-xs space-y-1 font-mono text-slate-text">
                <div>Organization: <span className="text-charcoal font-semibold">Northstar Store</span></div>
                <div>Email: <span className="text-charcoal">demo@northstar.example</span></div>
                <div>Role: <span className="text-charcoal">Owner</span></div>
              </div>

              <Button
                variant="primary"
                size="md"
                className="w-full"
                isLoading={isLoading}
                onClick={handleDemoSignIn}
              >
                Sign In to Demo Workspace
              </Button>
            </Card>
          )}

          {/* TAB 2: Custom Login */}
          {activeTab === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                label="Email address"
                type="email"
                required
                placeholder="name@company.com"
                leftIcon={<Mail className="w-4 h-4" />}
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
              <Input
                label="Password"
                required
                isPassword
                placeholder="••••••••••••"
                leftIcon={<Lock className="w-4 h-4" />}
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
              <Button variant="primary" size="md" className="w-full" isLoading={isLoading} type="submit">
                Sign In
              </Button>
            </form>
          )}

          {/* TAB 3: New Organization */}
          {activeTab === "register" && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <Input
                label="Organization Name"
                required
                placeholder="Acme Commerce"
                leftIcon={<Building className="w-4 h-4" />}
                value={orgName}
                onChange={(e) => {
                  setOrgName(e.target.value);
                  if (!orgSlug) {
                    setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"));
                  }
                }}
              />
              <Input
                label="Workspace Slug"
                required
                placeholder="acme-commerce"
                helperText="Unique identifier for your workspace"
                value={orgSlug}
                onChange={(e) => setOrgSlug(e.target.value)}
              />
              <Input
                label="Your Full Name"
                required
                placeholder="Jane Doe"
                leftIcon={<User className="w-4 h-4" />}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <Input
                label="Work Email"
                type="email"
                required
                placeholder="jane@acme.com"
                leftIcon={<Mail className="w-4 h-4" />}
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
              />
              <Input
                label="Password"
                required
                isPassword
                placeholder="Minimum 8 characters"
                leftIcon={<Lock className="w-4 h-4" />}
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
              />
              <Button variant="primary" size="md" className="w-full" isLoading={isLoading} type="submit">
                Create Organization & Continue
              </Button>
            </form>
          )}

          {/* Privacy & Tenant notice */}
          <p className="text-center text-[11px] text-slate-text">
            Protected by Argon2id password hashing and tenant-scoped session tokens.
          </p>
        </div>
      </div>
    </div>
  );
}
