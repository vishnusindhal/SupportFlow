import { useAuth } from "../../auth/AuthProvider";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { ShieldCheck, LogOut, Lock } from "lucide-react";

export function SettingsScreen() {
  const { session, signOut } = useAuth();

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal tracking-tight">Organization & Workspace Settings</h1>
          <p className="text-xs sm:text-sm text-slate-text mt-0.5">
            Manage your workspace configuration and security credentials.
          </p>
        </div>
        <Badge variant="mint" withDot>
          Tenant ID: {session?.organization?.id?.slice(0, 8)}...
        </Badge>
      </div>

      {/* Organization Details */}
      <Card>
        <CardHeader
          title="Organization Details"
          description="Your multi-tenant workspace identity."
        />
        <CardBody className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-ivory rounded-lg border border-warm-border">
              <span className="text-slate-text block">Organization Name:</span>
              <span className="font-bold text-charcoal mt-1 text-sm block">
                {session?.organization?.name}
              </span>
            </div>
            <div className="p-3 bg-ivory rounded-lg border border-warm-border">
              <span className="text-slate-text block">Workspace Slug:</span>
              <span className="font-mono font-semibold text-charcoal mt-1 text-sm block">
                {session?.organization?.slug}
              </span>
            </div>
            <div className="p-3 bg-ivory rounded-lg border border-warm-border">
              <span className="text-slate-text block">Organization UUID:</span>
              <span className="font-mono text-slate-text mt-1 text-[11px] block truncate">
                {session?.organization?.id}
              </span>
            </div>
            <div className="p-3 bg-ivory rounded-lg border border-warm-border">
              <span className="text-slate-text block">Database Boundary:</span>
              <span className="font-semibold text-mint-dark mt-1 text-xs block flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Row-Level organization_id filtering active
              </span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* User & Role Details */}
      <Card>
        <CardHeader
          title="Active Member Profile"
          description="Your identity and access permissions within this workspace."
        />
        <CardBody className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-aubergine text-white flex items-center justify-center font-bold text-base">
              {session?.user?.display_name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-sm font-bold text-charcoal">{session?.user?.display_name}</h3>
              <p className="text-xs text-slate-text">{session?.user?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="coral">{session?.membership?.role} role</Badge>
                <Badge variant="neutral">{session?.membership?.status}</Badge>
              </div>
            </div>
          </div>

          <div className="p-4 bg-ivory rounded-xl border border-warm-border text-xs text-slate-text space-y-2">
            <div className="font-semibold text-charcoal flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-coral" />
              Security Architecture
            </div>
            <p className="leading-relaxed">
              Passwords are protected with Argon2id hashing. Access tokens are short-lived JWTs, and refresh tokens rotate on every invocation using HttpOnly secure cookies. The client browser is never allowed to override tenant scope.
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              variant="outline"
              size="md"
              onClick={() => void signOut()}
              leftIcon={<LogOut className="w-4 h-4 text-status-error" />}
            >
              Sign Out of SupportFlow
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
