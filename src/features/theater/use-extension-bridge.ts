/**
 * Extension bridge hook — Sprint H13.
 *
 * The page half of the Netflix companion extension. It performs the handshake,
 * keeps the newest player report, and exposes the same transport verbs the
 * in-app players expose, so the existing room runtime drives Netflix with the
 * commands it already knows. No sync rule lives here.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  EXTENSION_APP_SOURCE,
  EXTENSION_HANDSHAKE_TIMEOUT_MS,
  EXTENSION_PROTOCOL_VERSION,
  isBridgeControllable,
  isExtensionMessage,
  type ExtensionCommand,
  type ExtensionLinkStatus,
  type ExtensionPlayerState,
} from "@/domain";

export interface ExtensionBridgeModel {
  readonly status: ExtensionLinkStatus;
  readonly version: string | null;
  readonly hasPlayerTab: boolean;
  readonly state: ExtensionPlayerState | null;
  /** True only while a fresh player report backs the claim. */
  readonly isControllable: boolean;
  positionMs(): number | null;
  play(positionMs: number): void;
  pause(positionMs: number): void;
  seekTo(positionMs: number): void;
  setRate(rate: number): void;
}

export interface UseExtensionBridgeInput {
  /** The provider the room is on, so the bridge only claims what it drives. */
  readonly providerId: string | null;
  readonly enabled: boolean;
}

function post(command: { readonly kind: string } & Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  window.postMessage(
    { source: EXTENSION_APP_SOURCE, v: EXTENSION_PROTOCOL_VERSION, ...command },
    window.location.origin,
  );
}

export function useExtensionBridge({
  providerId,
  enabled,
}: UseExtensionBridgeInput): ExtensionBridgeModel {
  const [status, setStatus] = useState<ExtensionLinkStatus>("checking");
  const [version, setVersion] = useState<string | null>(null);
  const [hasPlayerTab, setHasPlayerTab] = useState(false);
  const [state, setState] = useState<ExtensionPlayerState | null>(null);
  const stateRef = useRef<ExtensionPlayerState | null>(null);
  stateRef.current = state;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (!isExtensionMessage(event.data)) return;
      const message = event.data;

      if (message.kind === "installed") {
        setVersion(message.version);
        setStatus((current) => (current === "connected" ? current : "installed"));
        return;
      }
      if (message.kind === "gone") {
        setStatus("missing");
        setHasPlayerTab(false);
        setState(null);
        return;
      }
      if (message.kind === "ready" || message.kind === "state") {
        setStatus("connected");
        setHasPlayerTab(message.hasPlayerTab);
        setState(message.state ?? null);
      }
    };

    window.addEventListener("message", onMessage);
    post({ kind: "hello" });
    const timeout = window.setTimeout(() => {
      setStatus((current) => (current === "checking" ? "missing" : current));
    }, EXTENSION_HANDSHAKE_TIMEOUT_MS);
    // A tab opened later still gets picked up without a page reload.
    const poll = window.setInterval(() => post({ kind: "hello" }), 5_000);

    return () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(timeout);
      window.clearInterval(poll);
    };
  }, [enabled]);

  const isControllable = useMemo(
    () => enabled && isBridgeControllable({ status, providerId, state, nowMs: Date.now() }),
    [enabled, status, providerId, state],
  );

  const send = useCallback(
    (command: ExtensionCommand) => {
      if (!isControllable) return;
      post({ kind: "command", id: `${Date.now()}`, command });
    },
    [isControllable],
  );

  return {
    status,
    version,
    hasPlayerTab,
    state,
    isControllable,
    /** Projected from the last report, so a 500ms cadence still reads smoothly. */
    positionMs: () => {
      const current = stateRef.current;
      if (!current) return null;
      if (current.paused) return current.positionMs;
      const elapsed = Math.max(0, Date.now() - current.observedAtMs);
      return current.positionMs + elapsed * (current.rate || 1);
    },
    play: (positionMs) => send({ kind: "play", positionMs: Math.round(positionMs) }),
    pause: (positionMs) => send({ kind: "pause", positionMs: Math.round(positionMs) }),
    seekTo: (positionMs) => send({ kind: "seek", positionMs: Math.round(positionMs) }),
    setRate: (rate) => send({ kind: "rate", rate }),
  };
}
