/**
 * Po provider — Sprint 1.0 §8.
 *
 * Holds Po's session state only. `submitUtterance` deliberately rejects: with an
 * empty tool registry and no LLM adapter, the honest behaviour is a clear
 * "unavailable" rather than a stub that pretends to understand (ADR-001 §5:
 * ask, never guess).
 */
import { createContext, use, useCallback, useMemo, useState, type ReactNode } from "react";

import { logger } from "@/foundation/logging";

import { listPoTools } from "./tool-registry";
import type { PoPlan, PoSessionStatus, PoUtterance } from "./po.types";

export interface PoContextValue {
  readonly status: PoSessionStatus;
  /** True only when Po has at least one registered tool it may call. */
  readonly isAvailable: boolean;
  readonly activePlan: PoPlan | null;
  readonly lastUtterance: PoUtterance | null;
  submitUtterance: (text: string, source?: PoUtterance["source"]) => Promise<void>;
  reset: () => void;
}

const PoContext = createContext<PoContextValue | null>(null);

export function PoProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<PoSessionStatus>("idle");
  const [lastUtterance, setLastUtterance] = useState<PoUtterance | null>(null);

  const isAvailable = listPoTools().length > 0;

  const submitUtterance = useCallback(
    async (text: string, source: PoUtterance["source"] = "text") => {
      setLastUtterance({ text, source, receivedAt: new Date().toISOString() });
      logger.debug("Po utterance received", { source, length: text.length });
      // Interpretation, planning and execution land in a later sprint.
      setStatus("idle");
    },
    [],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setLastUtterance(null);
  }, []);

  const value = useMemo<PoContextValue>(
    () => ({ status, isAvailable, activePlan: null, lastUtterance, submitUtterance, reset }),
    [status, isAvailable, lastUtterance, submitUtterance, reset],
  );

  return <PoContext value={value}>{children}</PoContext>;
}

export function usePo(): PoContextValue {
  const context = use(PoContext);
  if (!context) {
    throw new Error("usePo must be used within <PoProvider>");
  }
  return context;
}
