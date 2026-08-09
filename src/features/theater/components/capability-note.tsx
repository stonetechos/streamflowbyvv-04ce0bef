/**
 * Capability note — Sprint H11.1.
 *
 * What a room can and cannot do belongs on the screen, not only in a document.
 * Every line is read from the capability record, so the room can never claim a
 * power the provider does not grant.
 */
import { Surface } from "@/design-system/components";
import type { WatchProviderCapability } from "@/domain";
import { useTranslation } from "@/foundation/localization";

import { providerModeKey } from "./provider-bar";

export interface CapabilityNoteProps {
  readonly capability: WatchProviderCapability;
  /** Compact form sits inside the stage; full form sits under it. */
  readonly variant?: "compact" | "full";
}

export function CapabilityNote({ capability, variant = "full" }: CapabilityNoteProps) {
  const { t } = useTranslation();

  const can: readonly string[] = [
    t("theater.capability.can.coordinate"),
    capability.allowsEmbeddedPlayback
      ? t("theater.capability.can.embed")
      : t("theater.capability.can.countdown"),
  ];

  const cannot: readonly string[] = [
    ...(capability.playbackControlMode === "automatic"
      ? []
      : [t("theater.capability.cannot.control", { provider: capability.displayName })]),
    ...(capability.requiresOwnSubscription
      ? [t("theater.capability.cannot.subscription", { provider: capability.displayName })]
      : []),
    ...(capability.allowsFullscreenFromRoom ? [] : [t("theater.capability.cannot.fullscreen")]),
  ];

  if (variant === "compact") {
    return (
      <p
        className="text-xs text-muted-foreground"
        data-sf-capability-note="compact"
        data-sf-capability-mode={capability.playbackControlMode}
      >
        {cannot[0] ?? t(providerModeKey(capability.playbackControlMode))}
      </p>
    );
  }

  return (
    <Surface
      tone="muted"
      padding="md"
      className="flex flex-col gap-2"
      data-sf-capability-note="full"
      data-sf-capability-provider={capability.providerId}
      data-sf-capability-mode={capability.playbackControlMode}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t("theater.capability.title", { provider: capability.displayName })}
      </p>
      <ul className="space-y-1 text-xs text-foreground/90" data-sf-capability-can>
        {can.map((line) => (
          <li key={line}>✓ {line}</li>
        ))}
      </ul>
      {cannot.length > 0 ? (
        <ul className="space-y-1 text-xs text-muted-foreground" data-sf-capability-cannot>
          {cannot.map((line) => (
            <li key={line}>✕ {line}</li>
          ))}
        </ul>
      ) : null}
      {capability.limitations.length > 0 ? (
        <ul className="space-y-1 text-xs text-muted-foreground" data-sf-capability-limits>
          {capability.limitations.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
    </Surface>
  );
}
