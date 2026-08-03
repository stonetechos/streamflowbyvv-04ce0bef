/**
 * User search hook — Milestone F.0.
 *
 * Debounced directory search with the four states a search must always be able
 * to describe: idle, loading, empty, and failed. The minimum term length and
 * the result cap are domain constants, not numbers invented here.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  MIN_SEARCH_TERM_LENGTH,
  SOCIAL_SERVICE,
  isServiceBound,
  resolveService,
  type DirectoryProfileRecord,
} from "@/domain";
import { logger } from "@/foundation/logging";

const MODULE = "social";
/** Long enough to stop typing, short enough to feel immediate. */
const DEBOUNCE_MS = 280;

export type SearchPhase = "idle" | "loading" | "ready" | "error";

export interface UserSearchModel {
  readonly term: string;
  readonly phase: SearchPhase;
  readonly results: readonly DirectoryProfileRecord[];
  readonly error: unknown;
  /** True when a completed search returned nothing. */
  readonly isEmpty: boolean;
  setTerm(next: string): void;
  clear(): void;
  retry(): void;
}

export function useUserSearch(viewerProfileId: string | null): UserSearchModel {
  const [term, setTermState] = useState("");
  const [phase, setPhase] = useState<SearchPhase>("idle");
  const [results, setResults] = useState<readonly DirectoryProfileRecord[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  /** Guards against a slow earlier search overwriting a newer one. */
  const sequence = useRef(0);

  const social = useMemo(
    () => (isServiceBound(SOCIAL_SERVICE) ? resolveService(SOCIAL_SERVICE) : null),
    [],
  );

  useEffect(() => {
    const trimmed = term.trim();
    if (!social || !viewerProfileId || trimmed.length < MIN_SEARCH_TERM_LENGTH) {
      setPhase("idle");
      setResults([]);
      return;
    }

    const ticket = (sequence.current += 1);
    setPhase("loading");

    const timer = setTimeout(() => {
      social
        .searchProfiles(trimmed, viewerProfileId)
        .then((found) => {
          if (ticket !== sequence.current) return;
          setResults(found);
          setError(null);
          setPhase("ready");
        })
        .catch((cause: unknown) => {
          if (ticket !== sequence.current) return;
          logger.warn("User search failed", { module: MODULE, error: cause });
          setError(cause);
          setPhase("error");
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [attempt, social, term, viewerProfileId]);

  const clear = useCallback(() => {
    sequence.current += 1;
    setTermState("");
    setResults([]);
    setPhase("idle");
    setError(null);
  }, []);

  return {
    term,
    phase,
    results,
    error,
    isEmpty: phase === "ready" && results.length === 0,
    setTerm: setTermState,
    clear,
    retry: () => setAttempt((value) => value + 1),
  };
}
