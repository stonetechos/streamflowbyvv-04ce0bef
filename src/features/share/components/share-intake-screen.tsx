/**
 * Share intake screen — Milestone L.
 *
 * What StreamFlow received from the share sheet, shown plainly while the room
 * is prepared. It promises nothing: if the service cannot be placed, or cannot
 * be used here, the screen says so and offers the honest way forward instead
 * of pretending a room was created.
 */
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

import { ActionButton, Surface } from "@/design-system/components";
import { Badge } from "@/components/ui/badge";
import { PoCompanion } from "@/features/po";
import { ContentPoster } from "@/features/shared/content-poster";
import { refusalMessageKey } from "@/features/shared/refusal-message";
import { useTranslation } from "@/foundation/localization";

import { useShareIntake } from "../use-share-intake";
import type { SharedContentPayload } from "@/domain";

export interface ShareIntakeScreenProps {
  readonly payload: SharedContentPayload;
  readonly profileId: string | null;
}

export function ShareIntakeScreen({ payload, profileId }: ShareIntakeScreenProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const intake = useShareIntake({ payload, profileId });

  // The room exists: the journey continues in the waiting room, unchanged.
  const roomId = intake.roomId;
  useEffect(() => {
    if (roomId) void navigate({ to: "/rooms/$roomId", params: { roomId } });
  }, [navigate, roomId]);

  const content = intake.content;
  const episodeLabel =
    content?.seasonNumber !== null && content?.seasonNumber !== undefined
      ? t("room.provider.episode_value", {
          season: content.seasonNumber,
          episode: content.episodeNumber ?? 0,
        })
      : null;

  const statusLine = (() => {
    switch (intake.status) {
      case "parsing":
        return t("share.status.reading");
      case "creating":
        return t("share.status.creating");
      case "created":
        return t("share.status.created");
      case "provider_unavailable":
        return t("share.status.provider_unavailable", {
          service: intake.providerName ?? t("room.provider.none"),
        });
      case "unsupported":
        return t(`share.refusal.${intake.refusal ?? "no_input"}`);
      case "error":
        return t(refusalMessageKey(intake.error));
    }
  })();

  const isWorking = intake.status === "parsing" || intake.status === "creating";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 pb-28 sm:px-6 md:pb-12">
      <Surface tone="glass" padding="lg" className="space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {t("share.eyebrow")}
            </p>
            <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              {content?.title ?? t("share.title_unknown")}
            </h1>
            {content?.seriesTitle ? (
              <p className="mt-1 text-sm text-muted-foreground">{content.seriesTitle}</p>
            ) : null}
          </div>
          <PoCompanion
            mood={intake.status === "error" ? "calm" : "happy"}
            className="h-16 w-24 shrink-0 sm:h-20 sm:w-28"
          />
        </header>

        <div className="flex flex-col gap-5 sm:flex-row">
          <ContentPoster
            artworkUrl={content?.artworkUrl ?? null}
            brandKey={content?.providerKey ?? null}
            name={intake.providerName ?? t("share.title_unknown")}
            className="aspect-[16/10] w-full sm:w-56"
          />

          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {intake.providerName ? <Badge variant="outline">{intake.providerName}</Badge> : null}
              {episodeLabel ? <Badge variant="outline">{episodeLabel}</Badge> : null}
              {content ? (
                <Badge variant="outline">{t(`share.kind.${content.contentKind}`)}</Badge>
              ) : null}
            </div>

            <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
              {isWorking ? (
                <span className="mr-2 inline-block size-3 animate-spin rounded-full border-2 border-current border-t-transparent align-[-1px]" />
              ) : null}
              {statusLine}
            </p>

            {content ? (
              <p className="break-all font-mono text-[0.6875rem] text-muted-foreground">
                {content.sharedUrl}
              </p>
            ) : null}

            {/* Stated once, everywhere: StreamFlow coordinates people, not players. */}
            <p className="text-xs text-muted-foreground">{t("share.manual_note")}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {intake.status === "error" ? (
            <ActionButton size="sm" onClick={intake.retry}>
              {t("common.action.retry")}
            </ActionButton>
          ) : null}
          <ActionButton size="sm" tone="ghost" onClick={() => void navigate({ to: "/home" })}>
            {t("common.action.go_home")}
          </ActionButton>
        </div>
      </Surface>
    </div>
  );
}
