/**
 * Room chat hook — Sprint H1.
 *
 * History on entry, live arrivals after that, and an optimistic send that is
 * replaced by the durable row (or rolled back when the write is refused).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  CHAT_MESSAGE_MAX_LENGTH,
  decodeCoordination,
  encodeCoordination,
  type CoordinationKind,
  WATCH_CHAT_SERVICE,
  isServiceBound,
  resolveService,
  type RoomMessage,
} from "@/domain";
import { logger } from "@/foundation/logging";

const MODULE = "theater-chat";

export interface ChatLine {
  readonly id: string;
  readonly profileId: string;
  readonly body: string;
  readonly createdAt: string;
  readonly isViewer: boolean;
  readonly isPending: boolean;
}

/**
 * Sprint H5 — a durable room event addressed to people. It rides the room
 * message channel, is filtered out of chat, and never mutates playback state.
 */
export interface RoomEventLine {
  readonly id: string;
  readonly kind: CoordinationKind;
  readonly profileId: string;
  readonly createdAt: string;
}

export interface RoomChatModel {
  readonly isAvailable: boolean;
  readonly isLoading: boolean;
  readonly isLive: boolean;
  readonly lines: readonly ChatLine[];
  /** Coordination requests, newest last. Chat and events never mix. */
  readonly events: readonly RoomEventLine[];
  readonly maxLength: number;
  readonly error: "empty" | "too_long" | "failed" | null;
  send(body: string): void;
  /** Broadcasts a coordination request; returns false when unavailable. */
  sendCoordination(kind: CoordinationKind, body: string): boolean;
}

export interface UseRoomChatInput {
  readonly roomId: string;
  readonly profileId: string | null;
  readonly enabled: boolean;
}

function toLine(message: RoomMessage, viewerProfileId: string | null): ChatLine {
  return {
    id: message.id,
    profileId: message.profileId,
    body: message.body,
    createdAt: message.createdAt,
    isViewer: message.profileId === viewerProfileId,
    isPending: false,
  };
}

function merge(lines: readonly ChatLine[], next: ChatLine): readonly ChatLine[] {
  if (lines.some((line) => line.id === next.id)) return lines;
  return [...lines, next];
}

export function useRoomChat({ roomId, profileId, enabled }: UseRoomChatInput): RoomChatModel {
  const service = useMemo(
    () => (isServiceBound(WATCH_CHAT_SERVICE) ? resolveService(WATCH_CHAT_SERVICE) : null),
    [],
  );
  const isAvailable = service?.isAvailable() ?? false;

  const [lines, setLines] = useState<readonly ChatLine[]>([]);
  const [events, setEvents] = useState<readonly RoomEventLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState<RoomChatModel["error"]>(null);
  const viewerRef = useRef(profileId);
  viewerRef.current = profileId;

  useEffect(() => {
    if (!service || !enabled) return;
    let cancelled = false;
    let detach: (() => void) | null = null;

    setIsLoading(true);
    void service
      .history(roomId)
      .then((history) => {
        if (cancelled) return;
        setLines(
          history
            .filter((message) => decodeCoordination(message.metadata) === null)
            .map((message) => toLine(message, viewerRef.current)),
        );
        setEvents(
          history.flatMap((message) => {
            const kind = decodeCoordination(message.metadata);
            return kind
              ? [
                  {
                    id: message.id,
                    kind,
                    profileId: message.profileId,
                    createdAt: message.createdAt,
                  },
                ]
              : [];
          }),
        );
      })
      .catch((cause: unknown) => {
        logger.warn("history_failed", { module: MODULE, roomId, error: String(cause) });
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    void service
      .subscribe(roomId, (message) => {
        const kind = decodeCoordination(message.metadata);
        if (kind) {
          setEvents((current) =>
            current.some((event) => event.id === message.id)
              ? current
              : [
                  ...current.slice(-49),
                  {
                    id: message.id,
                    kind,
                    profileId: message.profileId,
                    createdAt: message.createdAt,
                  },
                ],
          );
          return;
        }
        setLines((current) => merge(current, toLine(message, viewerRef.current)));
      })
      .then((unsubscribe) => {
        if (cancelled) {
          unsubscribe();
          return;
        }
        detach = unsubscribe;
        setIsLive(true);
      })
      .catch(() => setIsLive(false));

    return () => {
      cancelled = true;
      detach?.();
      setIsLive(false);
    };
  }, [service, enabled, roomId]);

  const send = useCallback(
    (body: string) => {
      if (!service || !profileId) return;
      const rejection = service.validate(body);
      if (rejection) {
        setError(rejection);
        return;
      }
      setError(null);

      const optimisticId = `pending:${Date.now()}:${Math.random().toString(36).slice(2)}`;
      const optimistic: ChatLine = {
        id: optimisticId,
        profileId,
        body: body.trim(),
        createdAt: new Date().toISOString(),
        isViewer: true,
        isPending: true,
      };
      setLines((current) => [...current, optimistic]);

      void service
        .send(roomId, profileId, body)
        .then((saved) => {
          setLines((current) => {
            const without = current.filter((line) => line.id !== optimisticId);
            return merge(without, toLine(saved, profileId));
          });
        })
        .catch((cause: unknown) => {
          logger.warn("send_failed", { module: MODULE, roomId, error: String(cause) });
          setLines((current) => current.filter((line) => line.id !== optimisticId));
          setError("failed");
        });
    },
    [service, profileId, roomId],
  );

  const sendCoordination = useCallback(
    (kind: CoordinationKind, body: string) => {
      if (!service || !profileId) return false;
      void service.sendEvent(roomId, profileId, body, encodeCoordination(kind)).catch(() => {
        logger.warn("coordination_failed", { module: MODULE, roomId, kind });
      });
      return true;
    },
    [service, profileId, roomId],
  );

  return {
    isAvailable,
    isLoading,
    isLive,
    lines,
    events,
    maxLength: CHAT_MESSAGE_MAX_LENGTH,
    error,
    send,
    sendCoordination,
  };
}
