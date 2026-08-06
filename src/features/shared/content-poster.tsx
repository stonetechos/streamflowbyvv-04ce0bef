/**
 * Content poster — Milestone L.
 *
 * One picture for "what are we watching". Artwork is shown only when the host
 * supplied a public https address; StreamFlow never fetches, proxies, or
 * scrapes provider imagery. When there is none — which is the normal case for
 * a share sheet — the provider's own brand mark stands in, so the surface is
 * never empty and never invents a poster.
 *
 * Presentation only.
 */
import { useEffect, useState } from "react";

import { ServiceLogo } from "@/features/home/components/service-logo";
import { cn } from "@/lib/utils";

export interface ContentPosterProps {
  /** Public https artwork supplied by the host; null falls back to branding. */
  readonly artworkUrl: string | null;
  /** Brand key used for the fallback mark, e.g. `netflix`. */
  readonly brandKey: string | null;
  readonly name: string;
  readonly className?: string;
  readonly alt?: string;
}

export function ContentPoster({ artworkUrl, brandKey, name, className, alt }: ContentPosterProps) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [artworkUrl]);

  const showArtwork = artworkUrl !== null && !failed;

  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden rounded-xl border border-border bg-muted",
        className,
      )}
    >
      {showArtwork ? (
        <img
          src={artworkUrl}
          alt={alt ?? name}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          aria-hidden="true"
          data-sf-brand={brandKey ?? "local_file"}
          className="sf-brand-tile relative flex h-full w-full items-center justify-center p-[14%]"
        >
          <ServiceLogo
            brandKey={brandKey ?? "local_file"}
            name={name}
            className="relative z-10 h-full w-full"
          />
        </span>
      )}
    </div>
  );
}
