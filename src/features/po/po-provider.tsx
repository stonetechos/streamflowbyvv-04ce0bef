/**
 * Po provider — Milestone H1 §1.
 *
 * The seam between the application and Po's brain. It owns the session: who is
 * speaking, the conversation so far, what is executing, what Po is waiting to
 * be told, and whether the last run was abandoned. It decides nothing about
 * intent, plans, or tools — every one of those answers comes from the brain,
 * unchanged (Milestone H1: connect, do not extend).
 *
 * Three things are published outward on mount so the brain's tools can reach
 * live application state without importing React:
 *   - the actor (who is signed in),
 *   - the navigator (how a screen is opened),
 *   - the tool catalog itself, registered exactly once.
 *
 * Cancellation is generational rather than abortive: a run in flight cannot be
 * un-called, so its result is discarded instead of being spoken. That keeps a
 * cancelled turn silent without pretending the tool never ran.
 */
import { useRouter } from "@tanstack/react-router";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "@/features/auth";
import { logger } from "@/foundation/logging";

import {
  EMPTY_BRAIN_STATE,
  handlePoUtterance,
  resetPoBrain,
  type PoBrainState,
} from "./brain/po-brain";
import type {
  PoMessage,
  PoOutcome,
  PoPendingQuestion,
  PoStepOutcome,
  PoTurn,
} from "./brain/po-brain.types";
import { setPoActor, setPoNavigator } from "./brain/po-runtime";
import { registerPoBrainTools } from "./brain/tool-catalog";
import { listPoTools } from "./tool-registry";
import type { PoSessionStatus, PoUtterance } from "./po.types";

const MODULE = "po-provider";

export interface PoContextValue {
  readonly status: PoSessionStatus;
  /** True only when Po has at least one registered tool it may call. */
  readonly isAvailable: boolean;
  /** True while an utterance is being understood, planned, or executed. */
  readonly isBusy: boolean;
  /** The conversation as the brain models it: user and Po turns, in order. */
  readonly turns: readonly PoTurn[];
  /** The single question Po is waiting on, if any. */
  readonly pending: PoPendingQuestion | null;
  /** True when the open question is a yes/no on an action Po has planned. */
  readonly awaitingConfirmation: boolean;
  /** Steps of the most recent run, for the execution progress surface. */
  readonly steps: readonly PoStepOutcome[];
  readonly lastOutcome: PoOutcome | null;
  readonly lastUtterance: PoUtterance | null;
  submitUtterance: (text: string, source?: PoUtterance["source"]) => Promise<void>;
  /** Abandons the turn in flight and clears anything Po was waiting on. */
  cancel: () => void;
  reset: () => void;
}

const PoContext = createContext<PoContextValue | null>(null);

const CANCELLED_MESSAGE: PoMessage = { key: "po.done.cancelled" };

export function PoProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const router = useRouter();

  const [brain, setBrain] = useState<PoBrainState>(EMPTY_BRAIN_STATE);
  const [status, setStatus] = useState<PoSessionStatus>("idle");
  const [steps, setSteps] = useState<readonly PoStepOutcome[]>([]);
  const [lastOutcome, setLastOutcome] = useState<PoOutcome | null>(null);
  const [lastUtterance, setLastUtterance] = useState<PoUtterance | null>(null);

  // Bumped on every cancel and every new turn, so a stale run cannot speak.
  const generation = useRef(0);
  const brainRef = useRef(brain);
  brainRef.current = brain;

  // Registration is idempotent, so remounts and hot reload are harmless.
  const [toolCount] = useState(() => {
    registerPoBrainTools();
    return listPoTools().length;
  });

  const identity = auth.session?.identity ?? null;

  useEffect(() => {
    setPoActor({
      profileId: identity?.profileId ?? null,
      displayName: identity?.displayName ?? "",
    });
  }, [identity?.profileId, identity?.displayName]);

  useEffect(() => {
    setPoNavigator((to) => {
      void router.navigate({ to } as never);
    });
  }, [router]);

  const submitUtterance = useCallback(
    async (text: string, source: PoUtterance["source"] = "text") => {
      const said = text.trim();
      if (said.length === 0) return;

      const turn = generation.current + 1;
      generation.current = turn;

      setLastUtterance({ text: said, source, receivedAt: new Date().toISOString() });
      setStatus("planning");
      setSteps([]);

      try {
        const result = await handlePoUtterance(brainRef.current, said);
        // A cancel (or a newer utterance) landed while this was running.
        if (generation.current !== turn) return;

        setBrain(result.state);
        setSteps(result.outcome.steps);
        setLastOutcome(result.outcome);
        setStatus(result.outcome.status === "asked" ? "awaiting_confirmation" : "idle");
      } catch (cause) {
        if (generation.current !== turn) return;
        logger.error("Po turn failed", { module: MODULE, cause });
        setStatus("idle");
        setLastOutcome({ status: "failed", message: { key: "po.fail.generic" }, steps: [] });
      }
    },
    [],
  );

  const cancel = useCallback(() => {
    generation.current += 1;
    setBrain((current) => ({ ...resetPoBrain(), conversation: current.conversation }));
    setStatus("idle");
    setSteps([]);
    setLastOutcome({ status: "cancelled", message: CANCELLED_MESSAGE, steps: [] });
  }, []);

  const reset = useCallback(() => {
    generation.current += 1;
    setBrain(resetPoBrain());
    setStatus("idle");
    setSteps([]);
    setLastOutcome(null);
    setLastUtterance(null);
  }, []);

  const value = useMemo<PoContextValue>(
    () => ({
      status,
      isAvailable: toolCount > 0,
      isBusy: status === "planning" || status === "executing",
      turns: brain.conversation.turns,
      pending: brain.conversation.pending,
      awaitingConfirmation: brain.conversation.pending?.kind === "confirmation",
      steps,
      lastOutcome,
      lastUtterance,
      submitUtterance,
      cancel,
      reset,
    }),
    [
      status,
      toolCount,
      brain.conversation.turns,
      brain.conversation.pending,
      steps,
      lastOutcome,
      lastUtterance,
      submitUtterance,
      cancel,
      reset,
    ],
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
