/**
 * recent_partners projection subscriber — Sprint 1.9.
 *
 * `RoomEnded` carries the full participant list (Catalog §3), which is the
 * only documented moment a watch session is known to have happened together.
 * Each ordered pair is upserted once; the projection itself is idempotent, so
 * a replayed event advances the timestamp without double-counting.
 */
import type { CatalogEvent, EventBus, Unsubscribe } from "@/domain/events";
import type { PartnerObservation, RecentPartnersProjection } from "@/repository";

import { createOrderedDispatcher, createReplayGuard, eventKey, type OrderedDispatcher } from "./event-dispatch";
import { payloadStrings } from "./event-serializer";

/** Expands a completed session into directed partner pairings. Pure. */
export function toPartnerObservations(event: CatalogEvent): readonly PartnerObservation[] {
  if (event.eventName !== "RoomEnded") return [];
  const participants = [...new Set(payloadStrings(event, "participantProfileIds"))];
  const watchedAt = event.occurredAt;

  const observations: PartnerObservation[] = [];
  for (const profileId of participants) {
    for (const partnerProfileId of participants) {
      if (profileId === partnerProfileId) continue;
      observations.push({ profileId, partnerProfileId, watchedAt });
    }
  }
  return observations;
}

export interface RecentPartnersSubscriberOptions {
  readonly bus: EventBus;
  readonly projection: RecentPartnersProjection;
  readonly dispatcher?: OrderedDispatcher;
}

export function createRecentPartnersSubscriber(
  options: RecentPartnersSubscriberOptions,
): Unsubscribe {
  const dispatcher = options.dispatcher ?? createOrderedDispatcher("events.recent_partners");
  const guard = createReplayGuard();

  return options.bus.subscribe("RoomEnded", (event) => {
    const observations = toPartnerObservations(event as CatalogEvent);
    if (observations.length === 0) return;
    if (!guard.admit(`partners:${eventKey(event as CatalogEvent)}`)) return;

    dispatcher.enqueue(event.aggregateId, async () => {
      for (const observation of observations) {
        await options.projection.touch(observation);
      }
    });
  });
}
