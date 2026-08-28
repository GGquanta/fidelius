import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ApiClientError, api, getMe, type User } from "./api";

interface Session {
  user: User | null;
  unlocked: boolean;
  unlockExpiresAt: number | null;
  recoveryRemaining: number;
  code: "ok" | "not_provisioned" | "disabled" | "loading";
  error: string;
  refresh: () => Promise<void>;
  doUnlock: (input: { code?: string; recoveryCode?: string }) => Promise<void>;
  doLock: () => Promise<void>;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [unlockExpiresAt, setUnlockExpiresAt] = useState<number | null>(null);
  const [recoveryRemaining, setRecoveryRemaining] = useState(0);
  const [code, setCode] = useState<Session["code"]>("loading");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const me = await getMe();
      if ("code" in me && me.code === "not_provisioned") {
        setUser(null);
        setUnlocked(false);
        setUnlockExpiresAt(null);
        setRecoveryRemaining(0);
        setCode("not_provisioned");
        return;
      }
      if ("code" in me && me.code === "disabled") {
        setUser(null);
        setUnlocked(false);
        setUnlockExpiresAt(null);
        setRecoveryRemaining(0);
        setCode("disabled");
        return;
      }
      setUser(me.user);
      setUnlocked(me.unlocked);
      setUnlockExpiresAt(me.unlockExpiresAt);
      setRecoveryRemaining(me.recoveryRemaining);
      setCode("ok");
    } catch (err) {
      setError(err instanceof Error ? err.message : "无法连接");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const doUnlock = useCallback(async (input: { code?: string; recoveryCode?: string }) => {
    const result = await api.unlock(input);
    setUnlocked(true);
    setUnlockExpiresAt(result.unlockExpiresAt);
    if (input.recoveryCode) {
      setRecoveryRemaining((count) => Math.max(0, count - 1));
    }
  }, []);

  const doLock = useCallback(async () => {
    await api.lock();
    setUnlocked(false);
    setUnlockExpiresAt(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      unlocked,
      unlockExpiresAt,
      recoveryRemaining,
      code,
      error,
      refresh,
      doUnlock,
      doLock,
    }),
    [user, unlocked, unlockExpiresAt, recoveryRemaining, code, error, refresh, doUnlock, doLock],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const value = useContext(SessionContext);
  if (!value) throw new Error("session missing");
  return value;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return "操作失败";
}
