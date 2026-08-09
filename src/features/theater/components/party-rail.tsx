/**
 * Party rail — the row of faces under the controls.
 *
 * A single line of avatars: who is in the room right now, with the host marked
 * and each person's own declarations shown as small dots. The trailing "+"
 * is the room's invite affordance, kept where a person looks when they notice
 * the room is quiet.
 *
 * Nothing here is inferred from a provider player.
 */
import { Plus } from "lucide-react";

import { Avatar } from "@/design-system/components";
import type { PresenceFreshness } from "@/domain";
import { useTranslation } from "@/foundation/localization";
import { cn } from "@/lib/utils";

export interface PartyFace {
  readonly profileId: string;
  readonly name: string;
  readonly isHost: boolean;
  readonly isReady: boolean;
  readonly hasLaunched: boolean;
  readonly freshness: PresenceFreshness;
  readonly isSpeaking: boolean;
}

export interface PartyRailProps {
  readonly faces: readonly PartyFace[];
  readonly canInvite: boolean;
  onInvite(): void;
}

const FRESHNESS_DOT: Record<PresenceFreshness, string> = {
  live: "bg-success",
  stale: "bg-warning",
  offline: "bg-muted-foreground",
};

export function PartyRail({ faces, canInvite, onInvite }: PartyRailProps) {
  const { t } = useTranslation();

  return (
    <div
      className="flex items-center gap-2 overflow-x-auto pb-1"
      data-sf-party-rail={faces.length}
      aria-label={t("party.rail.label")}
      role="group"
    >
      {faces.map((face) => (
        <span
          key={face.profileId}
          className="relative shrink-0"
          title={face.name}
          data-sf-party-face={face.profileId}
          data-sf-party-face-ready={face.isReady ? "yes" : "no"}
          data-sf-party-face-launched={face.hasLaunched ? "yes" : "no"}
        >
          <Avatar
            name={face.name}
            size="sm"
            className={cn(
              "ring-2 ring-offset-2 ring-offset-background",
              face.isSpeaking
                ? "ring-primary"
                : face.isHost
                  ? "ring-warning/70"
                  : "ring-transparent",
            )}
          />
          <span className="sr-only">
            {face.isHost ? t("party.rail.host_of", { name: face.name }) : face.name}
          </span>
          <span
            aria-hidden="true"
            className={cn(
              "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background",
              FRESHNESS_DOT[face.freshness],
            )}
          />
          {face.hasLaunched ? (
            <span
              aria-hidden="true"
              className="absolute -top-0.5 -right-0.5 size-2 rounded-full border-2 border-background bg-primary"
            />
          ) : null}
        </span>
      ))}

      <button
        type="button"
        onClick={onInvite}
        disabled={!canInvite}
        aria-label={t("party.rail.invite")}
        title={t("party.rail.invite")}
        data-sf-party-invite
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed border-border bg-muted/40 text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50"
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
