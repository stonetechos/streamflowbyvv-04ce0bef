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

import { recordAppSelection, sinceAppOpen, trackEvent } from "@/features/analytics";
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
import { useHomepageLayout } from "../use-homepage-layout";
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

  const allCards = useMemo(
    () => buildServiceShelf(catalog.status === "ready" ? catalog.options : [], t),
    [catalog.options, catalog.status, t],
  );

  // Sprint H9 — the arrangement is this person's, and it changes what is on
  // the shelf and in what order. It never changes what a provider can do.
  const arrangement = useHomepageLayout(allCards, profileId);
  const cards = arrangement.visible;
  const hiddenCards = arrangement.hidden;
  const editing = arrangement.isEditing;

  // One independent session per service, derived in Domain.
  const sources = useMemo(
    () =>
      allCards.map((card) => ({
        key: card.key,
        providerId: card.providerId,
        name: card.name,
        isSelectable: card.isChoosable,
        supportsDeepLink: card.supportsDeepLink,
      })),
    [allCards],
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
    if (roomId) {
      trackEvent(
        "room_created",
        {},
        { role: "host", providerId: card.providerId, roomKey: roomId },
      );
      const position = cards.findIndex((entry) => entry.key === card.key);
      const pinned = arrangement.isPinned(card.key);
      recordAppSelection({ fromFavorite: pinned, elapsedMs: sinceAppOpen() });
      if (pinned || position < arrangement.pinnedCount) {
        trackEvent("favorites_used_for_selection", { provider: card.key });
      }
      void navigate({ to: "/rooms/$roomId", params: { roomId } });
    }
  }

  function onChoose(card: ServiceCardView) {
    if (editing || !card.isChoosable || choosingKey) return;
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
      <div className="flex items-end justify-between gap-3">
        <SectionHeader title={t("home.services.title")} />
        <div className="flex items-center gap-1">
          {editing && arrangement.isCustomized ? (
            <button
              type="button"
              onClick={() => arrangement.reset()}
              className="min-h-9 rounded-lg px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("home.services.arrange.reset")}
            </button>
          ) : null}
          <button
            type="button"
            aria-pressed={editing}
            onClick={() => arrangement.setEditing(!editing)}
            className="min-h-9 rounded-lg px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {editing ? t("home.services.arrange.done") : t("home.services.arrange.action")}
          </button>
        </div>
      </div>

      {editing ? (
        <p className="text-xs text-muted-foreground">{t("home.services.arrange.hint")}</p>
      ) : null}

      <ul
        className={cn(
          "-mx-4 flex snap-x snap-mandatory scroll-pl-4 items-stretch gap-3 overflow-x-auto px-4 pb-3",
          // Sprint H9.1 — auto rows sized to content and stretched items: a
          // tile that grows for its arrange controls grows its whole row, so
          // nothing can reach into the row below.
          "sm:mx-0 sm:grid sm:auto-rows-auto sm:grid-cols-4 sm:items-stretch sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-6",
        )}
      >
        {cards.map((card, index) => {
          const busy = choosingKey === card.key;
          const session = providerSessions.session(card.key);
          const isConnected = session?.status === "connected";
          return (
            <li
              key={card.key}
              data-sf-service-tile={card.key}
              className="sf-rail-enter flex h-full w-36 min-w-0 shrink-0 flex-col snap-start sm:w-auto"
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
                  "group flex w-full grow flex-col gap-2 text-left",
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
                    <span
                      aria-hidden="true"
                      className="size-1.5 shrink-0 rounded-full bg-success"
                    />
                  ) : null}
                  <span className="truncate text-xs font-medium text-muted-foreground">
                    {card.name}
                  </span>
                </span>
              </button>

              {editing ? (
                <div
                  data-sf-arrange-controls={card.key}
                  className="mt-2 flex flex-wrap items-center justify-between gap-1"
                >
                  <div className="flex items-center gap-1">
                    <ArrangeButton
                      label={t("home.services.arrange.move_earlier", { service: card.name })}
                      disabled={index === 0}
                      onClick={() => arrangement.shift(card.key, -1)}
                    >
                      ←
                    </ArrangeButton>
                    <ArrangeButton
                      label={t("home.services.arrange.move_later", { service: card.name })}
                      disabled={index === cards.length - 1}
                      onClick={() => arrangement.shift(card.key, 1)}
                    >
                      →
                    </ArrangeButton>
                  </div>
                  <div className="flex items-center gap-1">
                    <ArrangeButton
                      label={
                        arrangement.isPinned(card.key)
                          ? t("home.services.arrange.unpin", { service: card.name })
                          : t("home.services.arrange.pin", { service: card.name })
                      }
                      pressed={arrangement.isPinned(card.key)}
                      onClick={() =>
                        arrangement.isPinned(card.key)
                          ? arrangement.unpin(card.key)
                          : arrangement.pin(card.key)
                      }
                    >
                      ★
                    </ArrangeButton>
                    <ArrangeButton
                      label={t("home.services.arrange.hide", { service: card.name })}
                      onClick={() => arrangement.hide(card.key)}
                    >
                      ×
                    </ArrangeButton>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {editing && hiddenCards.length > 0 ? (
        <div className="space-y-2 rounded-2xl border border-border bg-muted/40 p-3">
          <p className="text-xs font-medium text-muted-foreground">
            {t("home.services.arrange.hidden_title")}
          </p>
          <ul className="flex flex-wrap gap-2">
            {hiddenCards.map((card) => (
              <li key={card.key}>
                <button
                  type="button"
                  onClick={() => arrangement.unhide(card.key)}
                  className="min-h-9 rounded-full border border-border px-3 text-xs font-medium transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {t("home.services.arrange.unhide", { service: card.name })}
                </button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">{t("home.services.arrange.hidden_note")}</p>
        </div>
      ) : null}

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
            <DialogDescription>
              {t("provider.connect.description", { service: pendingConnect?.name ?? "" })}
            </DialogDescription>
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

/** A small square control used only while the shelf is being arranged. */
function ArrangeButton({
  label,
  onClick,
  disabled = false,
  pressed,
  children,
}: {
  readonly label: string;
  readonly onClick: () => void;
  readonly disabled?: boolean;
  readonly pressed?: boolean;
  readonly children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg border border-border text-xs",
        "transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        pressed && "border-primary text-primary",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      <span aria-hidden="true">{children}</span>
    </button>
  );
}
