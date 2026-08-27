import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ApiClientError, api, getMe, type User } from "./api";

interface Session {
  user: User | null;
  unlocked: boolean;
  unlockExpiresAt: number | null;
  code: "ok" | "not_provisioned" | "disabled" | "loading";
  error: string;
  refresh: () => Promise<void>;
  doUnlock: (code: string) => Promise<void>;
  doLock: () => Promise<void>;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [unlockExpiresAt, setUnlockExpiresAt] = useState<number | null>(null);
  const [code, setCode] = useState<Session["code"]>("loading");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const me = await getMe();
      if ("code" in me && me.code === "not_provisioned") {
        setUser(null);
        setUnlocked(false);
        setUnlockExpiresAt(null);
        setCode("not_provisioned");
        return;
      }
      if ("code" in me && me.code === "disabled") {
        setUser(null);
        setUnlocked(false);
        setUnlockExpiresAt(null);
        setCode("disabled");
        return;
      }
      setUser(me.user);
      setUnlocked(me.unlocked);
      setUnlockExpiresAt(me.unlockExpiresAt);
      setCode("ok");
    } catch (err) {
      setError(err instanceof Error ? err.message : "无法连接");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const doUnlock = useCallback(async (totp: string) => {
    const result = await api.unlock(totp);
    setUnlocked(true);
    setUnlockExpiresAt(result.unlockExpiresAt);
  }, []);

  const doLock = useCallback(async () => {
    await api.lock();
    setUnlocked(false);
    setUnlockExpiresAt(null);
  }, []);

  const value = useMemo(
    () => ({ user, unlocked, unlockExpiresAt, code, error, refresh, doUnlock, doLock }),
    [user, unlocked, unlockExpiresAt, code, error, refresh, doUnlock, doLock],
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
