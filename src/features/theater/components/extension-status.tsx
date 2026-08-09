/**
 * Extension status — Sprint H13.
 *
 * One honest line about whether StreamFlow can actually drive this device's
 * Netflix player. It never claims control the bridge has not confirmed.
 */
import { Surface } from "@/design-system/components";
import type { ExtensionLinkStatus, ExtensionPlayerState } from "@/domain";
import { useTranslation } from "@/foundation/localization";

export interface ExtensionStatusProps {
  readonly status: ExtensionLinkStatus;
  readonly hasPlayerTab: boolean;
  readonly isControllable: boolean;
  readonly state: ExtensionPlayerState | null;
  readonly providerName: string;
}

export function ExtensionStatus({
  status,
  hasPlayerTab,
  isControllable,
  state,
  providerName,
}: ExtensionStatusProps) {
  const { t } = useTranslation();

  const label = isControllable
    ? t("theater.extension.connected", { provider: providerName })
    : status === "connected" || status === "installed"
      ? hasPlayerTab
        ? t("theater.extension.waiting", { provider: providerName })
        : t("theater.extension.no_tab", { provider: providerName })
      : t("theater.extension.missing", { provider: providerName });

  return (
    <Surface tone="glass" className="flex items-center gap-3 px-4 py-3">
      <span
        aria-hidden
        className={`h-2 w-2 shrink-0 rounded-full ${
          isControllable ? "bg-primary animate-pulse" : "bg-muted-foreground/50"
        }`}
      />
      <div className="min-w-0">
        <p className="text-sm">{label}</p>
        {isControllable && state?.title ? (
          <p className="text-muted-foreground truncate text-xs">
            {state.title}
            {state.episode ? ` · ${state.episode}` : ""}
          </p>
        ) : status === "missing" ? (
          <p className="text-muted-foreground text-xs">{t("theater.extension.hint")}</p>
        ) : null}
      </div>
    </Surface>
  );
}
