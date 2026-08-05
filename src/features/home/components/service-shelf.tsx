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
import { useProviderCatalog, useProviderSessions } from "@/features/providers";
import { useTranslation } from "@/foundation/localization";
import { cn } from "@/lib/utils";

import { buildServiceShelf, type ServiceCardView } from "../service-shelf";
import { ServiceLogo } from "./service-logo";
import type { HomeModel } from "../use-home";

/**
 * Sprint 85 — brand colour lives in CSS (`[data-sf-brand]` in styles.css), not
 * here. The tile only declares which brand it is.
 */


export interface ServiceShelfProps {
  readonly home: HomeModel;
  readonly profileId: string | null;
}

export function ServiceShelf({ home, profileId }: ServiceShelfProps) {
  const { t } = useTranslation();
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
    const roomId = await home.createRoom(
      t("home.services.room_name", { service: card.name }),
      card.providerId,
    );
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
    <section
      className="space-y-4"
      aria-labelledby="services-heading"
      data-sf-shelf={catalog.status}
      data-sf-shelf-count={cards.length}
    >
      <SectionHeader title={t("home.services.title")} />

      <ul
        className={cn(
          "-mx-4 flex snap-x snap-mandatory scroll-pl-4 gap-3 overflow-x-auto px-4 pb-3",
          "sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-6",
        )}
      >
        {cards.map((card, index) => {
          const busy = choosingKey === card.key;
          const session = providerSessions.session(card.key);
          const isConnected = session?.status === "connected";
          return (
            <li
              key={card.key}
              className="sf-rail-enter w-36 shrink-0 snap-start sm:w-auto"
              style={{ ["--sf-rail-index" as string]: Math.min(index, 8) }}
            >
              <button
                type="button"
                data-sf-service={card.key}
                data-sf-service-busy={busy ? "true" : "false"}
                aria-disabled={!card.isChoosable}
                disabled={!card.isChoosable || busy}
                onClick={() => onChoose(card)}
                className={cn(
                  "group flex h-full w-full flex-col gap-2 text-left",
                  "rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  !card.isChoosable && "opacity-60",
                )}
              >
                <span
                  data-sf-brand={card.key}
                  className={cn(
                    "sf-brand-tile relative flex aspect-[3/2] w-full items-center justify-center overflow-hidden rounded-2xl p-[14%] shadow-e1",
                    "will-change-transform transition-[transform,box-shadow] duration-normal ease-standard",
                    card.isChoosable &&
                      "group-hover:-translate-y-1 group-hover:shadow-e3 group-active:scale-[0.98] group-active:shadow-e1 motion-reduce:transform-none motion-reduce:transition-none",
                  )}
                >
                  {busy ? (
                    <span className="relative z-10 size-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <ServiceLogo
                      brandKey={card.key}
                      name={card.name}
                      className="relative z-10 h-full w-full"
                    />
                  )}
                </span>

                <span className="flex items-center gap-1.5 px-0.5">
                  {isConnected ? (
                    <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-success" />
                  ) : null}
                  <span className="truncate text-xs font-medium text-muted-foreground">
                    {card.name}
                  </span>
                </span>
              </button>

            </li>
          );
        })}
      </ul>

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
