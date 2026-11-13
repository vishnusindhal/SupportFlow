import { Link, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "../auth/AuthProvider";
import ProtectedRoute from "../auth/ProtectedRoute";

function Login() {
  const { signIn } = useAuth();
  return <main className="card"><h1>SupportFlow</h1><p>Sign in to your organization workspace.</p><button onClick={() => signIn({ accessToken: "local-demo", email: "demo@northstar.test", organizationId: "demo" })}>Sign in to demo</button></main>;
}

function Shell() {
  const { signOut, session } = useAuth();
  return <main><header><strong>SupportFlow</strong><nav><Link to="/">Dashboard</Link><Link to="/knowledge">Knowledge base</Link><Link to="/chat">Chat preview</Link><button onClick={signOut}>Sign out</button></nav></header><section className="card"><h1>Welcome</h1><p>{session?.email} · organization {session?.organizationId}</p><p>V0/V1 foundation is ready. Knowledge ingestion and grounded chat arrive in later versions.</p></section></main>;
}

function Placeholder({ title, text }: { title: string; text: string }) {
  return <section className="card"><h1>{title}</h1><p>{text}</p></section>;
}

export default function App() {
  return <AuthProvider><Routes><Route path="/login" element={<Login />} /><Route element={<ProtectedRoute />}><Route path="/" element={<Shell />} /><Route path="/knowledge" element={<Placeholder title="Knowledge base" text="Upload and processing status will be implemented in V3." />} /><Route path="/chat" element={<Placeholder title="Chat preview" text="Grounded answers and sources will be implemented in V4." />} /></Route><Route path="*" element={<Navigate to="/" replace />} /></Routes></AuthProvider>;
}

