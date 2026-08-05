/**
 * Reaction bursts — Watch Party Engine v2.0.
 *
 * A tap sends a small feeling into the room. Purely presentational: bursts are
 * ephemeral, are never stored, and carry no meaning to any provider.
 */
import { useCallback, useEffect, useRef, useState } from "react";

export const WATCH_PARTY_REACTIONS = ["❤️", "😂", "😮", "🔥", "👏"] as const;
export type WatchPartyReaction = (typeof WATCH_PARTY_REACTIONS)[number];

interface Burst {
  readonly id: number;
  readonly emoji: string;
  readonly left: number;
  readonly drift: string;
}

export interface ReactionBurstsModel {
  readonly bursts: readonly Burst[];
  send(emoji: string): void;
}

export function useReactionBursts(): ReactionBurstsModel {
  const [bursts, setBursts] = useState<readonly Burst[]>([]);
  const nextId = useRef(0);
  const timers = useRef<number[]>([]);

  useEffect(
    () => () => {
      for (const timer of timers.current) window.clearTimeout(timer);
    },
    [],
  );

  const send = useCallback((emoji: string) => {
    const id = (nextId.current += 1);
    const burst: Burst = {
      id,
      emoji,
      left: 20 + Math.random() * 60,
      drift: `${Math.round(Math.random() * 40 - 20)}px`,
    };
    setBursts((current) => [...current, burst]);
    const timer = window.setTimeout(() => {
      setBursts((current) => current.filter((item) => item.id !== id));
    }, 1900);
    timers.current.push(timer);
  }, []);

  return { bursts, send };
}

export function ReactionLayer({ bursts }: { readonly bursts: readonly Burst[] }) {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 bottom-24 z-40 h-40">
      {bursts.map((burst) => (
        <span
          key={burst.id}
          className="sf-reaction absolute bottom-0 text-3xl"
          style={{ left: `${burst.left}%`, ["--sf-reaction-drift" as string]: burst.drift }}
        >
          {burst.emoji}
        </span>
      ))}
    </div>
  );
}
