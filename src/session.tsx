import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ApiClientError, api, getMe, type User } from "./api";

interface Session {
  user: User | null;
  unlocked: boolean;
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
  const [code, setCode] = useState<Session["code"]>("loading");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const me = await getMe();
      if ("code" in me && me.code === "not_provisioned") {
        setUser(null);
        setUnlocked(false);
        setCode("not_provisioned");
        return;
      }
      if ("code" in me && me.code === "disabled") {
        setUser(null);
        setUnlocked(false);
        setCode("disabled");
        return;
      }
      setUser(me.user);
      setUnlocked(me.unlocked);
      setCode("ok");
    } catch (err) {
      setError(err instanceof Error ? err.message : "无法连接");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const doUnlock = useCallback(async (totp: string) => {
    await api.unlock(totp);
    setUnlocked(true);
  }, []);

  const doLock = useCallback(async () => {
    await api.lock();
    setUnlocked(false);
  }, []);

  const value = useMemo(
    () => ({ user, unlocked, code, error, refresh, doUnlock, doLock }),
    [user, unlocked, code, error, refresh, doUnlock, doLock],
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
