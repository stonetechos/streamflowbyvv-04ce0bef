/**
 * Po social reactions — Milestone F.0.
 *
 * Po stays decorative (Po Rule). This module gives the social surfaces one
 * honest way to say "something nice just happened", and Po answers with a
 * short-lived mood from the existing vocabulary. No new moods, no speech, no
 * intelligence, no tools: a reaction only chooses an animation for a few
 * seconds and then Po settles back to calm.
 */
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

import type { PoMood } from "./components/po-companion";

/** The social moments Po is allowed to notice in Milestone F.0. */
export type PoSocialMoment =
  | "friend_request_sent"
  | "friend_accepted"
  | "invite_sent"
  | "invite_accepted"
  | "room_created";

/** Each moment maps to an existing mood; none of them imply understanding. */
const MOMENT_MOOD: Record<PoSocialMoment, PoMood> = {
  friend_request_sent: "delighted",
  friend_accepted: "celebrating",
  invite_sent: "excited",
  invite_accepted: "delighted",
  room_created: "excited",
};

/** Long enough to be seen, short enough never to feel like a state. */
const REACTION_MS = 2600;

export interface PoReactionContextValue {
  /** The mood to hand to `<PoCompanion>`; `calm` when nothing is happening. */
  readonly mood: PoMood;
  readonly moment: PoSocialMoment | null;
  react(moment: PoSocialMoment): void;
}

const PoReactionContext = createContext<PoReactionContextValue | null>(null);

export function PoReactionProvider({ children }: { children: ReactNode }) {
  const [moment, setMoment] = useState<PoSocialMoment | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const react = useCallback(
    (next: PoSocialMoment) => {
      clear();
      setMoment(next);
      timer.current = setTimeout(() => {
        setMoment(null);
        timer.current = null;
      }, REACTION_MS);
    },
    [clear],
  );

  useEffect(() => clear, [clear]);

  const value = useMemo<PoReactionContextValue>(
    () => ({ mood: moment ? MOMENT_MOOD[moment] : "calm", moment, react }),
    [moment, react],
  );

  return <PoReactionContext value={value}>{children}</PoReactionContext>;
}

/**
 * Safe outside the provider: Po reacting is a decoration, so a surface that
 * renders without one simply gets a companion that stays calm.
 */
export function usePoReaction(): PoReactionContextValue {
  const context = use(PoReactionContext);
  return context ?? FALLBACK;
}

const FALLBACK: PoReactionContextValue = Object.freeze({
  mood: "calm" as PoMood,
  moment: null,
  react: () => {},
});
