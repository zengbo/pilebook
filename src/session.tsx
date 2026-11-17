import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "./api";
import type { Business, User } from "./types";

type SessionValue = {
  user: User | null;
  business: Business | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setSession: (user: User | null, business: Business | null) => void;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await api<{ user: User | null; business: Business | null }>("/api/auth/me");
    setUser(data.user);
    setBusiness(data.business);
  }, []);

  useEffect(() => {
    refresh()
      .catch(() => {
        setUser(null);
        setBusiness(null);
      })
      .finally(() => setLoading(false));
  }, [refresh]);

  const value = useMemo<SessionValue>(
    () => ({
      user,
      business,
      loading,
      refresh,
      setSession: (nextUser, nextBusiness) => {
        setUser(nextUser);
        setBusiness(nextBusiness);
      },
    }),
    [user, business, loading, refresh],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("Session missing");
  return value;
}
