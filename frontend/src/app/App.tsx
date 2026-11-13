import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "../auth/AuthProvider";
import ProtectedRoute from "../auth/ProtectedRoute";

function Login() {
  const { signIn } = useAuth();
  return <main className="card"><h1>SupportFlow</h1><p>Sign in to your organization workspace.</p><button onClick={() => signIn({ accessToken: "local-demo", email: "demo@northstar.test", organizationId: "demo" })}>Sign in to demo</button></main>;
}

function Shell() {
  const { signOut, session } = useAuth();
  return <main><header><strong>SupportFlow</strong><nav><Link to="/">Dashboard</Link><Link to="/onboarding">Onboarding</Link><Link to="/knowledge">Knowledge base</Link><Link to="/chat">Chat preview</Link><button onClick={signOut}>Sign out</button></nav></header><section className="card"><h1>Welcome</h1><p>{session?.email} · organization {session?.organizationId}</p><p>Configure your industry template before adding knowledge.</p></section></main>;
}

function Onboarding() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<{ id: string; display_name: string; version: number }[]>([]);
  const [selected, setSelected] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [message, setMessage] = useState("");
  const token = session?.accessToken;

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/api/v1/templates`)
      .then((response) => response.json())
      .then(setTemplates)
      .catch(() => setMessage("Unable to load templates."));
  }, []);

  async function complete() {
    if (!token || !selected || !companyName.trim()) {
      setMessage("Choose a template and enter a company name.");
      return;
    }
    const base = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
    const profile = await fetch(`${base}/api/v1/onboarding/profile`, {
      method: "PUT", headers, body: JSON.stringify({ company_name: companyName, timezone: "UTC" }),
    });
    if (!profile.ok) { setMessage("Profile could not be saved."); return; }
    const response = await fetch(`${base}/api/v1/onboarding/complete`, {
      method: "POST", headers, body: JSON.stringify({ template_id: selected }),
    });
    if (response.ok) navigate("/");
    else setMessage("Onboarding could not be completed.");
  }

  return <section className="card"><h1>Set up your workspace</h1><label>Company name<input value={companyName} onChange={(event) => setCompanyName(event.target.value)} /></label><h2>Choose an industry template</h2>{templates.map((template) => <label className="choice" key={template.id}><input type="radio" name="template" value={template.id} checked={selected === template.id} onChange={() => setSelected(template.id)} />{template.display_name} (v{template.version})</label>)}<button onClick={complete}>Confirm setup</button>{message && <p role="alert">{message}</p>}</section>;
}

function Placeholder({ title, text }: { title: string; text: string }) {
  return <section className="card"><h1>{title}</h1><p>{text}</p></section>;
}

export default function App() {
  return <AuthProvider><Routes><Route path="/login" element={<Login />} /><Route element={<ProtectedRoute />}><Route path="/" element={<Shell />} /><Route path="/onboarding" element={<Onboarding />} /><Route path="/knowledge" element={<Placeholder title="Knowledge base" text="Upload and processing status will be implemented in V3." />} /><Route path="/chat" element={<Placeholder title="Chat preview" text="Grounded answers and sources will be implemented in V4." />} /></Route><Route path="*" element={<Navigate to="/" replace />} /></Routes></AuthProvider>;
}
