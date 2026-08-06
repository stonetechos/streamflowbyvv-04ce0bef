/**
 * Source picker — Sprint H1, rewritten for the H2 provider handoff.
 *
 * The host tells the room what it is watching. For a service StreamFlow may
 * embed, that is a link and we play it together. For Netflix, StreamFlow can
 * open the public page and nothing more, so the host chooses there and comes
 * back with the title link — an assisted handoff, described as exactly that.
 *
 * No page is scraped, no private player API is used, and no account detail is
 * ever asked for or stored.
 */
import { useEffect, useState, type FormEvent } from "react";

import { ActionButton, Surface, TextField } from "@/design-system/components";
import {
  NETFLIX_BROWSE_URL,
  parseWatchSource,
  watchSourceCapability,
  type WatchProviderCapability,
} from "@/domain";
import { useTranslation } from "@/foundation/localization";

export interface SourcePickerProps {
  readonly provider: WatchProviderCapability;
  readonly currentUrl: string;
  readonly currentTitle: string;
  readonly isSaving: boolean;
  readonly error: string | null;
  onSubmit(url: string, title: string): void;
}

const PLACEHOLDER: Readonly<Record<string, string>> = {
  netflix: "https://www.netflix.com/title/81234567",
  youtube: "https://www.youtube.com/watch?v=...",
  local: "https://example.com/clip.mp4",
};

export function SourcePicker({
  provider,
  currentUrl,
  currentTitle,
  isSaving,
  error,
  onSubmit,
}: SourcePickerProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState(currentUrl);
  const [title, setTitle] = useState(currentTitle);
  const [handedOff, setHandedOff] = useState(false);

  useEffect(() => {
    setValue(currentUrl);
  }, [currentUrl, provider.providerId]);
  useEffect(() => {
    setTitle(currentTitle);
  }, [currentTitle]);

  const parsed = parseWatchSource(value);
  const capability = watchSourceCapability(parsed);
  const showPreview = value.trim().length > 0;
  const isNetflix = provider.providerId === "netflix";

  const openProvider = () => {
    const target = parsed?.kind === "netflix" ? parsed.url : NETFLIX_BROWSE_URL;
    setHandedOff(true);
    window.open(target, "_blank", "noopener,noreferrer");
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(value, title);
  };

  return (
    <Surface tone="card" padding="md" className="flex flex-col gap-3" data-sf-source-picker={provider.providerId}>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold">
          {t("theater.source.heading", { provider: provider.displayName })}
        </p>
        {provider.requiresOwnSubscription ? (
          <p className="text-xs text-muted-foreground">
            {t("theater.source.subscription", { provider: provider.displayName })}
          </p>
        ) : null}
      </div>

      {isNetflix ? (
        <div className="flex flex-col gap-2 rounded-xl border border-border/60 p-3">
          <p className="text-xs text-muted-foreground">{t("theater.netflix.instruction")}</p>
          <ActionButton tone="secondary" size="sm" onClick={openProvider} data-sf-open-netflix>
            {t("theater.netflix.open")}
          </ActionButton>
          {handedOff ? (
            <p className="text-xs text-muted-foreground" data-sf-netflix-returned>
              {t("theater.netflix.returned")}
            </p>
          ) : null}
        </div>
      ) : null}

      <form className="flex flex-col gap-3" onSubmit={submit}>
        <TextField
          label={isNetflix ? t("theater.netflix.paste_label") : t("theater.source.label")}
          description={
            isNetflix ? t("theater.netflix.paste_description") : t("theater.source.description")
          }
          placeholder={PLACEHOLDER[provider.providerId] ?? PLACEHOLDER.youtube}
          value={value}
          error={error}
          onChange={(event) => setValue(event.target.value)}
        />
        <TextField
          label={t("theater.source.title_label")}
          description={t("theater.source.title_description")}
          placeholder={t("theater.source.title_placeholder")}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <ActionButton
          type="submit"
          size="sm"
          loading={isSaving}
          disabled={value.trim().length === 0}
        >
          {t("theater.source.save")}
        </ActionButton>
      </form>

      {showPreview ? (
        <div
          className="rounded-xl border border-border/60 p-3 text-xs"
          data-sf-source-verdict={parsed?.kind ?? "unrecognized"}
        >
          {!parsed ? (
            <p className="text-muted-foreground">{t("theater.source.unrecognized")}</p>
          ) : (
            <>
              <p className="font-semibold">
                {capability.allowsEmbeddedPlayback
                  ? t("theater.source.playable", { provider: capability.displayName })
                  : t("theater.source.coordinate_only", { provider: capability.displayName })}
              </p>
              <ul className="mt-1 space-y-1 text-muted-foreground">
                {capability.limitations.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : null}
    </Surface>
  );
}
