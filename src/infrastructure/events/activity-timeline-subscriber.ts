/**
 * activity_timeline projection subscriber — Sprint 1.9.
 *
 * Translates the documented source events (Catalog §3, §4, §7 consumer
 * columns) into per-profile timeline rows. Nothing else in the system writes
 * this read model, and it never derives a rendered string: only a
 * localization key plus identifiers (Foundation §13).
 */
import type { CatalogEvent, EventBus, Unsubscribe } from "@/domain/events";
import type {
  ActivityTimelineEntry,
  ActivityTimelineProjection,
  ActivityType,
} from "@/repository";

import { createOrderedDispatcher, createReplayGuard, eventKey, type OrderedDispatcher } from "./event-dispatch";
import { payloadString, payloadStrings } from "./event-serializer";

const SUMMARY_KEYS: Readonly<Record<ActivityType, string>> = Object.freeze({
  room_created: "activity.room_created",
  room_joined: "activity.room_joined",
  room_ended: "activity.room_ended",
  invite_sent: "activity.invite_sent",
  invite_accepted: "activity.invite_accepted",
  voice_joined: "activity.voice_joined",
});

function entry(
  event: CatalogEvent,
  profileId: string,
  activityType: ActivityType,
  relatedRoomId: string | null,
): ActivityTimelineEntry {
  return {
    profileId,
    activityType,
    relatedRoomId,
    summaryKey: SUMMARY_KEYS[activityType],
    payload: {
      eventName: event.eventName,
      correlationId: event.correlationId,
      sequence: event.sequence,
    },
    occurredAt: event.occurredAt,
  };
}

/** Maps one envelope to zero or more timeline rows. Pure. */
export function toActivityEntries(event: CatalogEvent): readonly ActivityTimelineEntry[] {
  const roomId = payloadString(event, "roomId") ?? (event.aggregateType === "room" ? event.aggregateId : null);

  switch (event.eventName) {
    case "RoomCreated": {
      const host = payloadString(event, "hostProfileId");
      return host ? [entry(event, host, "room_created", roomId)] : [];
    }
    case "MemberJoined": {
      const profileId = payloadString(event, "profileId");
      return profileId ? [entry(event, profileId, "room_joined", roomId)] : [];
    }
    case "RoomEnded": {
      return payloadStrings(event, "participantProfileIds").map((profileId) =>
        entry(event, profileId, "room_ended", roomId),
      );
    }
    case "InviteCreated": {
      // The inviter is the actor; a system-issued invite has no timeline owner.
      return event.actorProfileId
        ? [entry(event, event.actorProfileId, "invite_sent", roomId)]
        : [];
    }
    case "InviteAccepted": {
      const profileId = payloadString(event, "profileId");
      return profileId ? [entry(event, profileId, "invite_accepted", roomId)] : [];
    }
    case "VoiceParticipantJoined": {
      const profileId = payloadString(event, "profileId");
      return profileId ? [entry(event, profileId, "voice_joined", roomId)] : [];
    }
    default:
      return [];
  }
}

export interface ActivityTimelineSubscriberOptions {
  readonly bus: EventBus;
  readonly projection: ActivityTimelineProjection;
  readonly dispatcher?: OrderedDispatcher;
}

export function createActivityTimelineSubscriber(
  options: ActivityTimelineSubscriberOptions,
): Unsubscribe {
  const dispatcher = options.dispatcher ?? createOrderedDispatcher("events.activity_timeline");
  const guard = createReplayGuard();

  return options.bus.subscribeAll((event: CatalogEvent) => {
    const entries = toActivityEntries(event);
    if (entries.length === 0) return;
    if (!guard.admit(`activity:${eventKey(event)}`)) return;

    dispatcher.enqueue(event.aggregateId, async () => {
      for (const item of entries) {
        await options.projection.record(item);
      }
    });
  });
}
