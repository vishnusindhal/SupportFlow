import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "../auth/AuthProvider";
import ProtectedRoute from "../auth/ProtectedRoute";

function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  async function signInToDemo() {
    const base = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
    const credentials = {
      organization_name: "Northstar Store",
      organization_slug: "northstar-demo",
      email: "demo@northstar.example",
      display_name: "Demo Owner",
      password: "correct horse battery",
    };
    try {
      let response = await fetch(`${base}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(credentials),
      });
      if (response.status === 409) {
        response = await fetch(`${base}/api/v1/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email: credentials.email, password: credentials.password }),
        });
      }
      if (!response.ok) {
        setMessage("Demo sign-in failed. Check that the backend is running.");
        return;
      }
      const body = await response.json();
      signIn({
        accessToken: body.access_token,
        email: body.user.email,
        organizationId: body.membership.organization_id,
      });
      navigate("/");
    } catch {
      setMessage("Demo sign-in failed. Check that the backend is running.");
    }
  }
  return <main className="card"><h1>SupportFlow</h1><p>Sign in to your organization workspace.</p><button onClick={signInToDemo}>Sign in to demo</button>{message && <p role="alert">{message}</p>}</main>;
}

function Shell() {
  const { signOut, session } = useAuth();
  return <main><header><strong>SupportFlow</strong><nav><Link to="/">Dashboard</Link><Link to="/onboarding">Onboarding</Link><Link to="/knowledge">Knowledge base</Link><Link to="/chat">Chat preview</Link><Link to="/rules">Rules</Link><button onClick={signOut}>Sign out</button></nav></header><section className="card"><h1>Welcome</h1><p>{session?.email} · organization {session?.organizationId}</p><p>Configure your industry template before adding knowledge.</p></section></main>;
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

function ChatPreview() {
  const { session } = useAuth();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<{ answer: string; sources: { chunk_id: string; document_name: string; excerpt: string }[] } | null>(null);
  const [message, setMessage] = useState("");
  async function ask() {
    const response = await fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/api/v1/chat/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.accessToken}` },
      body: JSON.stringify({ content: question }),
    });
    if (response.ok) { setAnswer(await response.json()); setMessage(""); }
    else setMessage("Chat is unavailable. Check the backend and Gemini configuration.");
  }
  return <section className="card"><h1>Chat preview</h1><p>Ask a question grounded in your company knowledge.</p><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask a support question" /><button onClick={ask}>Ask assistant</button>{answer && <><h2>Answer</h2><p>{answer.answer}</p><h2>Sources</h2>{answer.sources.map((source) => <article key={source.chunk_id}><strong>{source.document_name}</strong><p>{source.excerpt}</p></article>)}</>}{message && <p role="alert">{message}</p>}</section>;
}

function KnowledgeBase() {
  const { session } = useAuth();
  const [documents, setDocuments] = useState<{ id: string; original_filename: string; status: string; error_code?: string }[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ chunk_id: string; content: string; score: number; metadata: { source_filename?: string } }[]>([]);
  const [message, setMessage] = useState("");
  const base = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
  const headers = { Authorization: `Bearer ${session?.accessToken}` };

  async function loadDocuments() {
    const response = await fetch(`${base}/api/v1/knowledge/documents`, { headers });
    if (response.ok) setDocuments(await response.json());
  }
  useEffect(() => { void loadDocuments(); }, []);

  async function upload() {
    if (!file) return;
    const body = new FormData();
    body.append("file", file);
    const response = await fetch(`${base}/api/v1/knowledge/documents`, { method: "POST", headers, body });
    if (response.ok) { setFile(null); setMessage("Document processed."); await loadDocuments(); }
    else setMessage("Upload failed. Use a valid PDF, DOCX, or TXT file.");
  }
  async function retrieve() {
    const response = await fetch(`${base}/api/v1/knowledge/retrieve`, {
      method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ query }),
    });
    if (response.ok) setResults(await response.json());
    else setMessage("Retrieval failed. Check that the backend and database are running.");
  }
  return <section className="card"><h1>Knowledge base</h1><p>Upload private company content for tenant-scoped retrieval.</p><input type="file" accept=".pdf,.docx,.txt" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /><button onClick={upload}>Upload and process</button><h2>Documents</h2>{documents.map((document) => <p key={document.id}>{document.original_filename} — {document.status}{document.error_code && ` (${document.error_code})`}</p>)}<h2>Test retrieval</h2><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ask about your documents" /><button onClick={retrieve}>Retrieve</button>{results.map((result) => <article key={result.chunk_id}><strong>{result.metadata.source_filename}</strong><p>{result.content}</p></article>)}{message && <p role="status">{message}</p>}</section>;
}

function Rules() {
  const { session } = useAuth();
  const base = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
  const headers = { Authorization: `Bearer ${session?.accessToken}` };
  const [rules, setRules] = useState<{ id: string; name: string; priority: number; enabled: boolean; action: { type: string; message?: string } }[]>([]);
  const [name, setName] = useState("Escalate order requests");
  const [message, setMessage] = useState("A support agent will help you.");
  const [status, setStatus] = useState("");

  async function load() {
    const response = await fetch(`${base}/api/v1/rules`, { headers });
    if (response.ok) setRules(await response.json());
  }
  useEffect(() => { void load(); }, []);
  async function create() {
    const response = await fetch(`${base}/api/v1/rules`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        conditions: [{ field: "intent", operator: "equals", value: "order_status" }],
        logic: "all",
        action: { type: "escalate", message },
        priority: 10,
        enabled: true,
      }),
    });
    if (response.ok) { setStatus("Rule created."); await load(); }
    else setStatus("Rule could not be created.");
  }
  async function disable(id: string) {
    const response = await fetch(`${base}/api/v1/rules/${id}`, { method: "DELETE", headers });
    if (response.ok) { setStatus("Rule disabled."); await load(); }
  }
  return <section className="card"><h1>Business rules</h1><p>Rules run deterministically before Gemini.</p><label>Rule name<input value={name} onChange={(event) => setName(event.target.value)} /></label><label>Escalation message<input value={message} onChange={(event) => setMessage(event.target.value)} /></label><p>When intent equals <strong>order_status</strong>, escalate.</p><button onClick={create}>Create escalation rule</button><h2>Configured rules</h2>{rules.map((rule) => <p key={rule.id}>{rule.name} — priority {rule.priority} — {rule.enabled ? "enabled" : "disabled"} {rule.enabled && <button onClick={() => disable(rule.id)}>Disable</button>}</p>)}{status && <p role="status">{status}</p>}</section>;
}

export default function App() {
  return <AuthProvider><Routes><Route path="/login" element={<Login />} /><Route element={<ProtectedRoute />}><Route path="/" element={<Shell />} /><Route path="/onboarding" element={<Onboarding />} /><Route path="/knowledge" element={<KnowledgeBase />} /><Route path="/chat" element={<ChatPreview />} /><Route path="/rules" element={<Rules />} /></Route><Route path="*" element={<Navigate to="/" replace />} /></Routes></AuthProvider>;
}
