/**
 * Provider bar — Sprint H2.
 *
 * The row of services a room can watch through. Every chip states what the
 * service actually allows, read from the capability model — never from a
 * hand-written label. Choosing a provider does not claim StreamFlow can
 * control it; the chip says exactly how far coordination goes.
 */
import { WATCH_PROVIDERS, type WatchProviderCapability } from "@/domain";
import { useTranslation } from "@/foundation/localization";
import { cn } from "@/lib/utils";

export interface ProviderBarProps {
  readonly activeProviderId: string | null;
  readonly isHost: boolean;
  /**
   * Exactly what this room may offer. A provider-scoped room passes one
   * service; an open room passes the whole registry. The bar never widens
   * what it was given (product correction pass).
   */
  readonly providers?: readonly WatchProviderCapability[];
  readonly isScoped?: boolean;
  onSelect(provider: WatchProviderCapability): void;
}

const MODE_KEYS: Readonly<Record<string, string>> = {
  automatic: "theater.capability.automatic",
  assisted: "theater.capability.assisted",
  manual: "theater.capability.manual",
  "launch-only": "theater.capability.launch_only",
  unavailable: "theater.capability.unavailable",
};

export function providerModeKey(mode: string): string {
  return MODE_KEYS[mode] ?? "theater.capability.unavailable";
}

export function ProviderBar({
  activeProviderId,
  isHost,
  providers = WATCH_PROVIDERS,
  isScoped = false,
  onSelect,
}: ProviderBarProps) {
  const { t } = useTranslation();

  return (
    <div
      className="flex flex-col gap-2"
      data-sf-provider-bar
      data-sf-provider-scope={isScoped ? "scoped" : "open"}
      data-sf-provider-count={providers.length}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t(isScoped ? "theater.provider.scoped_title" : "theater.provider.title")}
      </p>
      <ul className="flex flex-wrap gap-2">
        {providers.map((provider) => {
          const isActive = provider.providerId === activeProviderId;
          return (
            <li key={provider.providerId}>
              <button
                type="button"
                disabled={!isHost}
                aria-pressed={isActive}
                data-sf-provider={provider.providerId}
                data-sf-provider-mode={provider.playbackControlMode}
                onClick={() => onSelect(provider)}
                className={cn(
                  "flex flex-col items-start gap-0.5 rounded-2xl border px-4 py-2 text-left transition-colors",
                  "disabled:cursor-default disabled:opacity-80",
                  isActive
                    ? "border-primary bg-primary/10"
                    : "border-border/60 hover:border-primary/50",
                )}
              >
                <span className="text-sm font-semibold">{provider.displayName}</span>
                <span className="text-[11px] text-muted-foreground">
                  {t(providerModeKey(provider.playbackControlMode))}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {isScoped ? (
        <p className="text-xs text-muted-foreground" data-sf-provider-scope-note>
          {t("theater.provider.scoped_note", { provider: providers[0]?.displayName ?? "" })}
        </p>
      ) : null}
      {!isHost ? (
        <p className="text-xs text-muted-foreground">{t("theater.provider.host_chooses")}</p>
      ) : null}
    </div>
  );
}
