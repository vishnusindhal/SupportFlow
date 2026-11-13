import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type Session = { accessToken: string; email: string; organizationId: string };
const SessionContext = createContext<{ session: Session | null; signIn: (session: Session) => void; signOut: () => void } | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const value = useMemo(() => ({ session, signIn: setSession, signOut: () => setSession(null) }), [session]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useAuth() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

