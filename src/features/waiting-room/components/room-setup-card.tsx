/**
 * Room setup card — Sprint 2.2.
 *
 * The host's corner of the lobby: pick a provider, set the countdown length.
 * Guests see the same information read-only, so nobody is surprised by what
 * the room is about to do. Nothing here starts anything.
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProviderGrid } from "@/features/providers";
import { useTranslation } from "@/foundation/localization";

import type { RoomSetupModel } from "../use-room-setup";
import { CountdownDurationField } from "./countdown-duration-field";

export interface RoomSetupCardProps {
  readonly setup: RoomSetupModel;
  readonly isHost: boolean;
  readonly selectedProviderId: string | null;
  readonly countdownSeconds: number;
}

export function RoomSetupCard({
  setup,
  isHost,
  selectedProviderId,
  countdownSeconds,
}: RoomSetupCardProps) {
  const { t } = useTranslation();
  const selected = setup.catalog.options.find((option) => option.id === selectedProviderId) ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("room.setup.title")}</CardTitle>
        <CardDescription>
          {t(isHost ? "room.setup.description.host" : "room.setup.description.guest")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-sm">
            <span className="text-muted-foreground">{t("room.setup.selected.label")} </span>
            <span className="font-medium">
              {selected ? t(selected.nameKey) : t("room.setup.selected.none")}
            </span>
          </p>
        </div>

        {isHost ? (
          <>
            <ProviderGrid
              status={setup.catalog.status}
              options={setup.catalog.options}
              selectedProviderId={selectedProviderId}
              pendingProviderId={setup.pendingProviderId}
              canSelect={setup.isAvailable}
              canFavorite
              onSelect={setup.selectProvider}
              onToggleFavorite={setup.catalog.toggleFavorite}
            />

            <CountdownDurationField
              seconds={countdownSeconds}
              disabled={!setup.isAvailable}
              isSaving={setup.pending === "countdown"}
              onCommit={setup.setCountdownSeconds}
            />

            {setup.error ? (
              <p role="alert" className="text-sm text-destructive">
                {t(setup.error.messageKey)}
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("room.setup.countdown.readonly", { seconds: String(countdownSeconds) })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
