/**
 * Service shelf — Milestone H2 (product experience).
 *
 * The primary surface of the product: "where do you want to watch?". Choosing
 * a service is the start of the journey — StreamFlow quietly creates the room
 * behind it and takes the person to the waiting room, where the existing
 * orchestration takes over unchanged.
 *
 * Presentation only. It reads the adjudicated catalog and never judges a
 * provider itself.
 */
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { SectionHeader } from "@/design-system/components";
import { useProviderCatalog } from "@/features/providers";
import { useTranslation } from "@/foundation/localization";
import { cn } from "@/lib/utils";

import { buildServiceShelf, serviceStatusLabelKey, type ServiceCardView } from "../service-shelf";
import { ServiceLogo } from "./service-logo";
import type { HomeModel } from "../use-home";

const ACCENT_TILE: Record<ServiceCardView["accent"], string> = {
  primary: "from-primary/70 to-primary/25 text-primary-foreground",
  info: "from-info/70 to-info/25 text-info-foreground",
  success: "from-success/70 to-success/25 text-success-foreground",
  warning: "from-warning/70 to-warning/25 text-warning-foreground",
  accent: "from-accent to-accent/40 text-accent-foreground",
};

/** Badge tone per adjudicated status. Tokens only; never a raw colour. */
const STATUS_BADGE: Record<ServiceCardView["status"], string> = {
  supported: "border-success/40 bg-success/10 text-success",
  manual_sync: "border-info/40 bg-info/10 text-info",
  unverified: "border-warning/40 bg-warning/10 text-warning",
  unavailable: "border-border bg-muted text-muted-foreground",
  coming_soon: "border-border bg-muted text-muted-foreground",
};

export interface ServiceShelfProps {
  readonly home: HomeModel;
  readonly profileId: string | null;
}

export function ServiceShelf({ home, profileId }: ServiceShelfProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const catalog = useProviderCatalog(profileId);
  const [choosingKey, setChoosingKey] = useState<string | null>(null);

  const cards = useMemo(
    () => buildServiceShelf(catalog.status === "ready" ? catalog.options : [], t),
    [catalog.options, catalog.status, t],
  );

  async function onChoose(card: ServiceCardView) {
    if (!card.isChoosable || choosingKey) return;
    setChoosingKey(card.key);
    const roomId = await home.createRoom(t("home.services.room_name", { service: card.name }));
    setChoosingKey(null);
    if (roomId) void navigate({ to: "/rooms/$roomId", params: { roomId } });
  }

  return (
    <section className="space-y-4" aria-labelledby="services-heading">
      <SectionHeader
        title={t("home.services.title")}
        description={t("home.services.description")}
      />

      <ul
        className={cn(
          "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3",
          "sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-5",
        )}
      >
        {cards.map((card, index) => {
          const busy = choosingKey === card.key;
          return (
            <li
              key={card.key}
              className="sf-rail-enter w-40 shrink-0 snap-start sm:w-auto"
              style={{ ["--sf-rail-index" as string]: Math.min(index, 8) }}
            >
              <button
                type="button"
                aria-disabled={!card.isChoosable}
                disabled={!card.isChoosable || busy}
                onClick={() => void onChoose(card)}
                className={cn(
                  "group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-left text-card-foreground shadow-e1",
                  "will-change-transform focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  "transition-[transform,box-shadow] duration-normal ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  card.isChoosable
                    ? "hover:-translate-y-1 hover:shadow-e3 active:scale-[0.98] active:shadow-e1 motion-reduce:transform-none motion-reduce:transition-none"
                    : "opacity-70",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex aspect-[16/10] w-full items-center justify-center overflow-hidden bg-gradient-to-br p-[12%]",
                    ACCENT_TILE[card.accent],
                  )}
                >
                  {busy ? (
                    <span className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <ServiceLogo
                      brandKey={card.key}
                      name={card.name}
                      className="h-full w-full transition-transform duration-normal ease-standard group-hover:scale-[1.04] motion-reduce:transform-none motion-reduce:transition-none"
                    />
                  )}
                </span>

                <span className="flex flex-1 flex-col gap-2 p-3">
                  <span className="truncate font-display text-sm font-semibold">{card.name}</span>
                  <span
                    className={cn(
                      "inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[0.625rem] font-medium uppercase tracking-wider",
                      STATUS_BADGE[card.status],
                    )}
                  >
                    {t(serviceStatusLabelKey(card.status))}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-muted-foreground">{t("home.services.footnote")}</p>
    </section>
  );
}
