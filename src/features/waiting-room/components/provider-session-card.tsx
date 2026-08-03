/**
 * Provider session card — Sprint K.1.
 *
 * What this room is watching, on what, with whom, and — stated plainly — how
 * playback is kept together. It claims nothing StreamFlow cannot do: the
 * playback mode comes from `ProviderControl`, which in the web application
 * reports manual synchronization and no remote control at all.
 *
 * Presentation only: every value is read, none is decided here.
 */
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseContentReference, selectProviderControl } from "@/domain";
import { useTranslation } from "@/foundation/localization";

import type { RoomSummaryView } from "../waiting-room.types";

export interface ProviderSessionCardProps {
  readonly room: RoomSummaryView;
  /** Display name of the chosen provider, when one is known. */
  readonly providerName: string | null;
  /** Display name of the host, resolved by the roster. */
  readonly hostLabel: string | null;
  readonly supportsDeepLink: boolean;
}

export function ProviderSessionCard({
  room,
  providerName,
  hostLabel,
  supportsDeepLink,
}: ProviderSessionCardProps) {
  const { t } = useTranslation();

  const reference = parseContentReference(room.contentReference);
  const control = selectProviderControl({
    isSelectable: room.providerId !== null,
    canDeepLink: supportsDeepLink,
  });

  const title = reference?.title ?? null;
  const episodeLabel =
    reference?.seasonNumber !== null && reference?.seasonNumber !== undefined
      ? t("room.provider.episode_value", {
          season: reference.seasonNumber,
          episode: reference.episodeNumber ?? 0,
        })
      : null;

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">{t("room.provider.title")}</CardTitle>
          <Badge variant="outline">{t(`room.status.${room.status}`)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("room.provider.service")}
            </dt>
            <dd className="mt-1 text-base">{providerName ?? t("room.provider.none")}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("room.provider.selected_title")}
            </dt>
            <dd className="mt-1 text-base">
              {title ?? t("room.provider.title_unknown")}
              {episodeLabel ? (
                <span className="ml-2 text-sm text-muted-foreground">{episodeLabel}</span>
              ) : null}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("room.provider.host")}
            </dt>
            <dd className="mt-1 text-base">{hostLabel ?? t("room.provider.host_unknown")}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("room.provider.playback_mode")}
            </dt>
            <dd className="mt-1 flex flex-wrap gap-2">
              <Badge variant="secondary">{t(control.playbackModeKey)}</Badge>
              {control.capabilities.remoteControl === "planned" ? (
                <Badge variant="outline">{t("provider.capability.future_control")}</Badge>
              ) : null}
            </dd>
          </div>
        </dl>
        <p className="text-xs text-muted-foreground">{t("room.provider.manual_note")}</p>
      </CardContent>
    </Card>
  );
}
