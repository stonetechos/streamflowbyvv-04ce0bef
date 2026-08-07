/**
 * Connection recovery hook — Sprint H6.
 *
 * Watches the two things a browser will actually tell us — reachability and
 * page visibility — and turns them into one honest recovery phase. It never
 * claims recovery: the caller reports back when a fresh snapshot has landed.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { nextRecoveryPhase, type RecoveryPhase } from "@/domain";

export interface ConnectionRecoveryModel {
  readonly phase: RecoveryPhase;
  readonly isOnline: boolean;
  readonly isVisible: boolean;
  /** Call when a fresh snapshot has been adopted after an interruption. */
  markRecovered(): void;
}

export interface UseConnectionRecoveryInput {
  readonly enabled: boolean;
  /** Re-read the room; invoked once per interruption that ends. */
  onResume?(): void;
  onInterrupted?(): void;
}

function readOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine !== false;
}

function readVisible(): boolean {
  return typeof document === "undefined" ? true : document.visibilityState !== "hidden";
}

export function useConnectionRecovery({
  enabled,
  onResume,
  onInterrupted,
}: UseConnectionRecoveryInput): ConnectionRecoveryModel {
  const [isOnline, setIsOnline] = useState(readOnline);
  const [isVisible, setIsVisible] = useState(readVisible);
  const [wasInterrupted, setWasInterrupted] = useState(false);
  const [hasFreshSnapshot, setHasFreshSnapshot] = useState(true);
  const resumeRef = useRef(onResume);
  const interruptedRef = useRef(onInterrupted);
  resumeRef.current = onResume;
  interruptedRef.current = onInterrupted;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const interrupt = () => {
      setWasInterrupted(true);
      setHasFreshSnapshot(false);
      interruptedRef.current?.();
    };
    const resume = () => {
      setWasInterrupted((current) => {
        if (current) resumeRef.current?.();
        return current;
      });
    };

    const onOffline = () => {
      setIsOnline(false);
      interrupt();
    };
    const onOnline = () => {
      setIsOnline(true);
      resume();
    };
    const onVisibility = () => {
      const visible = readVisible();
      setIsVisible(visible);
      if (visible) resume();
      else interrupt();
    };

    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled]);

  const markRecovered = useCallback(() => {
    setHasFreshSnapshot(true);
    window.setTimeout(() => setWasInterrupted(false), 2_500);
  }, []);

  return {
    phase: nextRecoveryPhase({ isOnline, isDocumentVisible: isVisible, wasInterrupted, hasFreshSnapshot }),
    isOnline,
    isVisible,
    markRecovered,
  };
}
