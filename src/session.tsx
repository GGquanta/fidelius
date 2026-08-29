import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ApiClientError, api, getMe, type User } from "./api";
import { useSettings } from "./settings-context";
import { idleRemainingSeconds, shouldLockOnHide } from "./settings";
import { useToast } from "./ui";

interface Session {
  user: User | null;
  unlocked: boolean;
  unlockExpiresAt: number | null;
  idleRemaining: number | null;
  recoveryRemaining: number;
  code: "ok" | "not_provisioned" | "disabled" | "loading";
  error: string;
  refresh: () => Promise<void>;
  doUnlock: (input: { code?: string; recoveryCode?: string }) => Promise<void>;
  doLock: () => Promise<void>;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const toast = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [unlockExpiresAt, setUnlockExpiresAt] = useState<number | null>(null);
  const [idleRemaining, setIdleRemaining] = useState<number | null>(null);
  const [recoveryRemaining, setRecoveryRemaining] = useState(0);
  const [code, setCode] = useState<Session["code"]>("loading");
  const [error, setError] = useState("");
  const sealing = useRef(false);
  const lockInFlight = useRef(false);
  const unlockedRef = useRef(false);
  const countdownStartedAt = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const me = await getMe();
      if ("code" in me && me.code === "not_provisioned") {
        setUser(null);
        unlockedRef.current = false;
        setUnlocked(false);
        setUnlockExpiresAt(null);
        setRecoveryRemaining(0);
        setCode("not_provisioned");
        return;
      }
      if ("code" in me && me.code === "disabled") {
        setUser(null);
        unlockedRef.current = false;
        setUnlocked(false);
        setUnlockExpiresAt(null);
        setRecoveryRemaining(0);
        setCode("disabled");
        return;
      }
      setUser(me.user);
      unlockedRef.current = me.unlocked;
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
    countdownStartedAt.current = Date.now();
    unlockedRef.current = true;
    setUnlocked(true);
    setUnlockExpiresAt(result.unlockExpiresAt);
    if (input.recoveryCode) {
      setRecoveryRemaining((count) => Math.max(0, count - 1));
    }
  }, []);

  const doLock = useCallback(async () => {
    if (lockInFlight.current) return;
    lockInFlight.current = true;
    try {
      await api.lock();
      unlockedRef.current = false;
      setUnlocked(false);
      setUnlockExpiresAt(null);
      setIdleRemaining(null);
    } finally {
      lockInFlight.current = false;
    }
  }, []);

  const seal = useCallback(
    async (reason: "timer" | "hide") => {
      if (sealing.current || lockInFlight.current || !unlockedRef.current) return;
      sealing.current = true;
      try {
        await doLock();
        if (reason === "timer") toast("已自动封存");
      } finally {
        sealing.current = false;
      }
    },
    [doLock, toast],
  );

  useEffect(() => {
    if (!unlocked || !settings.autoLockEnabled) {
      countdownStartedAt.current = 0;
      setIdleRemaining(null);
      return;
    }
    if (countdownStartedAt.current === 0) {
      countdownStartedAt.current = Date.now();
    }
    const tick = () => {
      const left = idleRemainingSeconds(countdownStartedAt.current, Date.now(), settings.autoLockSeconds);
      if (left <= 0) {
        setIdleRemaining(0);
        void seal("timer");
        return;
      }
      setIdleRemaining(left);
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [unlocked, settings.autoLockEnabled, settings.autoLockSeconds, seal]);

  useEffect(() => {
    if (!unlocked || !settings.lockOnHide) return;
    function maybeSeal(blurred: boolean) {
      if (shouldLockOnHide(document.visibilityState, blurred, true)) void seal("hide");
    }
    maybeSeal(!document.hasFocus());
    function onVisibility() {
      maybeSeal(false);
    }
    function onBlur() {
      maybeSeal(true);
    }
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
    };
  }, [unlocked, settings.lockOnHide, seal]);

  const value = useMemo(
    () => ({
      user,
      unlocked,
      unlockExpiresAt,
      idleRemaining,
      recoveryRemaining,
      code,
      error,
      refresh,
      doUnlock,
      doLock,
    }),
    [user, unlocked, unlockExpiresAt, idleRemaining, recoveryRemaining, code, error, refresh, doUnlock, doLock],
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
