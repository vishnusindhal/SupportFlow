import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authApi } from "../api/auth";
import { setAccessToken } from "../api/client";
import type { Session } from "../types";

interface AuthContextType {
  session: Session | null;
  isLoading: boolean;
  signIn: (session: Session) => void;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const signIn = useCallback((newSession: Session) => {
    setAccessToken(newSession.accessToken);
    setSession(newSession);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      setAccessToken(null);
      setSession(null);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const res = await authApi.refresh();
      signIn({
        accessToken: res.access_token,
        user: res.user,
        organization: res.organization,
        membership: res.membership,
      });
    } catch {
      setSession(null);
      setAccessToken(null);
    } finally {
      setIsLoading(false);
    }
  }, [signIn]);

  useEffect(() => {
    // Attempt silent session recovery via cookie on initial load
    void refreshSession();
  }, [refreshSession]);

  const value = useMemo(
    () => ({
      session,
      isLoading,
      signIn,
      signOut,
      refreshSession,
    }),
    [session, isLoading, signIn, signOut, refreshSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
