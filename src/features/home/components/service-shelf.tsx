/**
 * Service shelf — Milestone H2 (product experience), extended in Sprint K.1.
 *
 * The primary surface of the product: "where do you want to watch?". Choosing
 * a service is the start of the journey — StreamFlow quietly creates the room
 * behind it and takes the person to the waiting room, where the existing
 * orchestration takes over unchanged.
 *
 * Sprint K.1 adds the provider *session*: each tile now says whether this
 * person has connected the service, when they last used it, and — honestly —
 * that synchronization is manual today and native control is a future
 * capability. The first time a service is chosen, StreamFlow explains that the
 * member signs in with the provider themselves. No credential is ever asked
 * for, stored, or brokered.
 *
 * Presentation only. It reads the adjudicated catalog and never judges a
 * provider itself.
 */
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SectionHeader } from "@/design-system/components";
import { providerSessionStatusKey } from "@/domain";
import { useProviderCatalog, useProviderSessions } from "@/features/providers";
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
  const { t, formatDate } = useTranslation();
  const navigate = useNavigate();
  const catalog = useProviderCatalog(profileId);
  const [choosingKey, setChoosingKey] = useState<string | null>(null);
  const [pendingConnect, setPendingConnect] = useState<ServiceCardView | null>(null);

  const cards = useMemo(
    () => buildServiceShelf(catalog.status === "ready" ? catalog.options : [], t),
    [catalog.options, catalog.status, t],
  );

  // One independent session per service, derived in Domain.
  const sources = useMemo(
    () =>
      cards.map((card) => ({
        key: card.key,
        providerId: card.providerId,
        name: card.name,
        isSelectable: card.isChoosable,
        supportsDeepLink: card.supportsDeepLink,
      })),
    [cards],
  );
  const providerSessions = useProviderSessions(profileId, sources);

  async function startRoom(card: ServiceCardView) {
    setChoosingKey(card.key);
    // Remember only that the provider has been connected and last used.
    providerSessions.connect(card.key);
    const roomId = await home.createRoom(t("home.services.room_name", { service: card.name }));
    setChoosingKey(null);
    if (roomId) void navigate({ to: "/rooms/$roomId", params: { roomId } });
  }

  function onChoose(card: ServiceCardView) {
    if (!card.isChoosable || choosingKey) return;
    const session = providerSessions.session(card.key);
    // First time with this service: explain the sign-in, then continue.
    if (session?.status !== "connected") {
      setPendingConnect(card);
      return;
    }
    void startRoom(card);
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
          const session = providerSessions.session(card.key);
          const isConnected = session?.status === "connected";
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
                onClick={() => onChoose(card)}
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

                  <span className="flex flex-wrap gap-1">
                    <span
                      className={cn(
                        "inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[0.625rem] font-medium uppercase tracking-wider",
                        STATUS_BADGE[card.status],
                      )}
                    >
                      {t(serviceStatusLabelKey(card.status))}
                    </span>

                    {session && session.status !== "unavailable" ? (
                      <span
                        className={cn(
                          "inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[0.625rem] font-medium uppercase tracking-wider",
                          isConnected
                            ? "border-success/40 bg-success/10 text-success"
                            : "border-border bg-muted text-muted-foreground",
                        )}
                      >
                        {t(providerSessionStatusKey(session.status))}
                      </span>
                    ) : null}

                    {session?.supportsManualSync ? (
                      <span className="inline-flex w-fit items-center rounded-full border border-info/40 bg-info/10 px-2 py-0.5 text-[0.625rem] font-medium uppercase tracking-wider text-info">
                        {t("provider.capability.manual_sync")}
                      </span>
                    ) : null}

                    {session?.hasFutureControl ? (
                      <span className="inline-flex w-fit items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground">
                        {t("provider.capability.future_control")}
                      </span>
                    ) : null}
                  </span>

                  {session?.lastUsedAt ? (
                    <span className="text-[0.6875rem] text-muted-foreground">
                      {t("provider.session.last_used", {
                        when: formatDate(new Date(session.lastUsedAt)),
                      })}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-muted-foreground">{t("home.services.footnote")}</p>

      <Dialog
        open={pendingConnect !== null}
        onOpenChange={(open) => {
          if (!open) setPendingConnect(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("provider.connect.title", { service: pendingConnect?.name ?? "" })}
            </DialogTitle>
            <DialogDescription>{t("provider.connect.description")}</DialogDescription>
          </DialogHeader>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>{t("provider.connect.point_sign_in")}</li>
            <li>{t("provider.connect.point_no_credentials")}</li>
            <li>{t("provider.connect.point_manual_sync")}</li>
          </ul>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingConnect(null)}>
              {t("provider.connect.cancel")}
            </Button>
            <Button
              onClick={() => {
                const card = pendingConnect;
                setPendingConnect(null);
                if (card) void startRoom(card);
              }}
            >
              {t("provider.connect.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
