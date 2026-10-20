import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { notify } from "@/components/layout/Toasty";
import { authRequest } from "@/lib/auth";
import { useAuth } from "@/components/auth/ProtectedRoute";

// Keep these configurable without changing the timer logic.
const INACTIVITY_WARNING_MS = 12 * 60 * 1000;
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
const WARNING_DURATION_MS = INACTIVITY_TIMEOUT_MS - INACTIVITY_WARNING_MS;

export function SessionActivityMonitor({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const warningToastId = useRef<string | number | undefined>(undefined);
  const warningTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const endingSession = useRef(false);

  const clearTimers = useCallback(() => {
    if (warningTimer.current) clearTimeout(warningTimer.current);
    if (logoutTimer.current) clearTimeout(logoutTimer.current);
    warningTimer.current = undefined;
    logoutTimer.current = undefined;
  }, []);

  const dismissWarning = useCallback(() => {
    if (warningToastId.current !== undefined) {
      toast.dismiss(warningToastId.current);
      warningToastId.current = undefined;
    }
  }, []);

  const logoutForInactivity = useCallback(async () => {
    if (endingSession.current) return;
    endingSession.current = true;
    clearTimers();
    dismissWarning();

    // Invalidate the server-side refresh session and clear its HTTP-only cookies.
    try {
      await authRequest("/api/auth/logout", { method: "POST" });
    } catch {
      // The access token may already have expired; still clear local auth state.
    } finally {
      await refresh();
      navigate("/login?reason=session-expired", { replace: true });
    }
  }, [clearTimers, dismissWarning, navigate, refresh]);

  const resetInactivityTimer = useCallback(() => {
    if (endingSession.current) return;
    clearTimers();
    dismissWarning();

    warningTimer.current = setTimeout(() => {
      warningToastId.current = notify.warning(
        "You’ve been inactive for a while. Are you still there?",
        {
          duration: WARNING_DURATION_MS,
          action: {
            label: "I'm still here",
            onClick: () => resetInactivityTimer(),
          },
        },
      );
      logoutTimer.current = setTimeout(() => {
        void logoutForInactivity();
      }, WARNING_DURATION_MS);
    }, INACTIVITY_WARNING_MS);
  }, [clearTimers, dismissWarning, logoutForInactivity]);

  useEffect(() => {
    endingSession.current = false;
    resetInactivityTimer();

    // Reset on every pointer movement so the inactivity window is measured
    // from the most recent user input, not a throttled approximation.
    const onPointerMove = () => resetInactivityTimer();
    const onActivity = () => resetInactivityTimer();
    const events: Array<[keyof WindowEventMap, EventListener]> = [
      ["keydown", onActivity],
      ["mousedown", onActivity],
      ["click", onActivity],
      ["scroll", onActivity],
      ["input", onActivity],
      ["change", onActivity],
      ["touchstart", onActivity],
      ["pointermove", onPointerMove],
    ];

    events.forEach(([event, handler]) =>
      window.addEventListener(event, handler, { passive: true }),
    );

    return () => {
      events.forEach(([event, handler]) =>
        window.removeEventListener(event, handler),
      );
      clearTimers();
      dismissWarning();
    };
  }, [clearTimers, dismissWarning, resetInactivityTimer]);

  return <>{children}</>;
}
