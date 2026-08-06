/**
 * Share intake — Milestone L (Share-to-StreamFlow).
 *
 * The entry point of the primary journey. Something was shared from a
 * provider's own application; this hook places it and, when it can, turns it
 * into a room.
 *
 * It owns no rule. Parsing belongs to `parseSharedContent` (Domain), the
 * provider verdict belongs to `ProviderCatalogService`, room creation belongs
 * to `RoomFlowService`, and attaching the provider and title to the room
 * belongs to `RoomSetupService`. Nothing is duplicated here and nothing new is
 * decided — the shared content simply becomes the room's context.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ROOM_FLOW_SERVICE,
  ROOM_SETUP_SERVICE,
  isServiceBound,
  parseSharedContent,
  resolveService,
  type SharedContent,
  type SharedContentPayload,
  type SharedContentRefusal,
} from "@/domain";
import { useProviderCatalog } from "@/features/providers";
import { useTranslation } from "@/foundation/localization";
import { logger } from "@/foundation/logging";

const MODULE = "share";

/**
 * Catalog keys a shared brand may legitimately appear under. Presentation-only
 * aliasing; the catalog remains the authority on whether it can be chosen.
 */
const CATALOG_ALIASES: Readonly<Record<string, readonly string[]>> = {
  netflix: ["netflix"],
  prime_video: ["prime_video", "amazon_prime_video"],
  disney_hotstar: ["disney_hotstar", "disney_plus", "hotstar", "jiohotstar"],
};

export type ShareIntakeStatus =
  "parsing" | "unsupported" | "provider_unavailable" | "creating" | "created" | "error";

export interface ShareIntakeModel {
  readonly status: ShareIntakeStatus;
  readonly content: SharedContent | null;
  readonly refusal: SharedContentRefusal | null;
  readonly providerId: string | null;
  readonly providerName: string | null;
  readonly roomId: string | null;
  readonly error: unknown;
  /** Re-attempts room creation after a failure. */
  retry(): void;
}

export interface UseShareIntakeInput {
  readonly payload: SharedContentPayload;
  readonly profileId: string | null;
}

export function useShareIntake({ payload, profileId }: UseShareIntakeInput): ShareIntakeModel {
  const { t } = useTranslation();
  const catalog = useProviderCatalog(profileId);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const started = useRef(false);

  const parsed = useMemo(
    () => parseSharedContent({ ...payload }),
    [payload.url, payload.text, payload.title], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const content = parsed.ok ? parsed.content : null;

  // Which adjudicated option, if any, matches the shared brand.
  const option = useMemo(() => {
    if (!content || catalog.status !== "ready") return null;
    const keys = CATALOG_ALIASES[content.providerKey] ?? [content.providerKey];
    return catalog.options.find((entry) => keys.includes(entry.key)) ?? null;
  }, [catalog.options, catalog.status, content]);

  const providerName = useMemo(() => {
    if (!content) return null;
    if (!option) return content.providerKey;
    const name = t(option.nameKey);
    return name === option.nameKey ? content.providerKey : name;
  }, [content, option, t]);

  const create = useCallback(async () => {
    if (!content || !option || !profileId) return;
    if (!isServiceBound(ROOM_FLOW_SERVICE) || !isServiceBound(ROOM_SETUP_SERVICE)) return;
    const rooms = resolveService(ROOM_FLOW_SERVICE);
    const setup = resolveService(ROOM_SETUP_SERVICE);
    const intent = { correlationId: crypto.randomUUID(), actorProfileId: profileId };

    try {
      const name =
        content.seriesTitle ??
        content.title ??
        t("share.room.default_name", { service: providerName ?? content.providerKey });
      const { room } = await rooms.createRoom(
        { hostProfileId: profileId, name: name.slice(0, 80), visibility: "private" },
        intent,
      );
      // The shared title becomes the room's context — same service the host
      // would use from the lobby, no second path.
      await setup.selectProvider(
        {
          roomId: room.id,
          providerId: option.id,
          actorProfileId: profileId,
          contentReference: content.reference,
        },
        intent,
      );
      setRoomId(room.id);
    } catch (cause) {
      logger.warn("Share intake room creation failed", { module: MODULE, error: cause });
      setError(cause);
    }
  }, [content, option, profileId, providerName, t]);

  useEffect(() => {
    if (started.current) return;
    if (!content || !profileId || catalog.status !== "ready" || !option?.isSelectable) return;
    started.current = true;
    void create();
  }, [catalog.status, content, create, option, profileId, attempt]);

  const retry = useCallback(() => {
    started.current = false;
    setError(null);
    setAttempt((value) => value + 1);
  }, []);

  const status: ShareIntakeStatus = (() => {
    if (!parsed.ok) return "unsupported";
    if (error) return "error";
    if (roomId) return "created";
    if (catalog.status === "loading") return "parsing";
    if (!option || !option.isSelectable) return "provider_unavailable";
    return "creating";
  })();

  return {
    status,
    content,
    refusal: parsed.ok ? null : parsed.reason,
    providerId: option?.id ?? null,
    providerName,
    roomId,
    error,
    retry,
  };
}
