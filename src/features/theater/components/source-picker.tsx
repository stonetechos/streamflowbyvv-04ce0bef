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
  localFileUrl,
  parseWatchSource,
  providerBrowseUrl,
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
  prime: "https://www.primevideo.com/detail/0ABCDEF",
  hotstar: "https://www.hotstar.com/in/movies/title/1260012345",
  disney: "https://www.disneyplus.com/movies/title/abcdef",
  jiocinema: "https://www.jiocinema.com/movies/title/1234567",
  sonyliv: "https://www.sonyliv.com/movies/title-1234567",
  mxplayer: "https://www.mxplayer.in/movie/watch-title-movie-online-abcdef",
  discovery_plus: "https://www.discoveryplus.in/video/show/episode",
  jiotv: "https://www.jiotv.com/channels/1234",
  zee5: "https://www.zee5.com/movies/details/title/0-0-123456",
  appletv: "https://tv.apple.com/movie/umc.cmc.abcdef",
  hbo_max: "https://www.max.com/movie/abcdef",
  hulu: "https://www.hulu.com/movie/abcdef",
  peacock: "https://www.peacocktv.com/watch/asset/abcdef",
  paramount_plus: "https://www.paramountplus.com/movies/video/abcdef",
  crunchyroll: "https://www.crunchyroll.com/series/ABCDEF",
  google_drive: "https://drive.google.com/file/d/abcdef/view",
  youtube: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  local: "The Grand Budapest Hotel.mp4",
  direct: "https://example.com/clip.mp4",
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

  // A file everyone already owns is named, not linked: the name is the only
  // thing that travels between people.
  const isLocalFile = provider.providerId === "local";
  const reference = isLocalFile ? (value.trim() ? localFileUrl(value) : "") : value;
  const parsed = parseWatchSource(reference);
  const capability = watchSourceCapability(parsed);
  const showPreview = value.trim().length > 0;
  // Every OTT service is chosen the same way: browse there, come back with
  // the public title link. Only a directly reachable file is pasted outright.
  const isHandoff = provider.selectionMode === "browse";
  const browseUrl = providerBrowseUrl(provider.providerId);

  const openProvider = () => {
    const target =
      parsed?.providerId === provider.providerId && parsed.url ? parsed.url : browseUrl;
    if (!target) return;
    setHandedOff(true);
    window.open(target, "_blank", "noopener,noreferrer");
  };

  // A room's choice needs a name people recognise, not just an address.
  const canSubmit = value.trim().length > 0 && title.trim().length > 0;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit(reference, title);
  };


  return (
    <Surface
      tone="card"
      padding="md"
      className="flex flex-col gap-3"
      data-sf-source-picker={provider.providerId}
    >
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

      {isHandoff ? (
        <div className="flex flex-col gap-2 rounded-xl border border-border/60 p-3">
          <p className="text-xs text-muted-foreground">
            {t("theater.provider.instruction", { provider: provider.displayName })}
          </p>
          <ActionButton
            tone="secondary"
            size="sm"
            onClick={openProvider}
            data-sf-open-provider={provider.providerId}
          >
            {t("theater.provider.open", { provider: provider.displayName })}
          </ActionButton>
          {handedOff ? (
            <p className="text-xs text-muted-foreground" data-sf-provider-returned>
              {t("theater.provider.returned")}
            </p>
          ) : null}
        </div>
      ) : null}

      <form className="flex flex-col gap-3" onSubmit={submit}>
        <TextField
          label={
            isHandoff
              ? t("theater.provider.launch_label", { provider: provider.displayName })
              : t("theater.source.label")
          }
          description={
            isHandoff
              ? t("theater.provider.launch_description", { provider: provider.displayName })
              : t("theater.source.description")
          }
          placeholder={PLACEHOLDER[provider.providerId] ?? PLACEHOLDER["direct"]}
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
        <ActionButton type="submit" size="sm" loading={isSaving} disabled={!canSubmit}>
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
