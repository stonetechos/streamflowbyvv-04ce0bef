/**
 * RoomSetupService — Sprint 2.2.
 *
 * The host's pre-viewing decisions: which provider the room will use, what is
 * being watched, and how long the shared countdown will be. It sequences
 * existing services against the room repository and owns no rule of its own:
 *
 * - selectability and the compliance verdict come from `ProviderCatalogService`
 *   and `ComplianceService` (Foundation §11 — no second path, no fast path);
 * - the sync mode comes from `ProviderService` (ADR-003);
 * - the countdown envelope comes from `system-constants` (Build Rules §10).
 *
 * It schedules nothing. Sprint 2.2 stores the chosen duration; the countdown
 * engine that acts on it is Sprint 2.3.
 */
import {
  normalizeCountdownSeconds,
  isCountdownSecondsValid,
} from "@/domain/countdown/countdown.types";
import { domainError } from "@/domain/errors/domain-errors";
import {
  PROVIDER_SELECT_RULE_KEY,
  type ProviderCatalogService,
} from "@/domain/providers/provider-catalog-service";
import type { ProviderPreferenceService } from "@/domain/providers/provider-preference-service";
import {
  serializeContentReference,
  type ContentReference,
} from "@/domain/providers/content-reference";
import { createServiceToken } from "@/domain/service-registry";
import type { ComplianceService } from "@/domain/services/compliance-service";
import type { RoomService } from "@/domain/services/room-service";
import type { Intent } from "@/domain/services/service-context";
import type { Clock } from "@/domain/events/event.types";
import {
  ROOM_REPOSITORY,
  isRepositoryBound,
  resolveRepository,
  type RoomRepository,
} from "@/repository";

import type { MetadataBag, Room } from "./room.types";

/** Where the host's chosen countdown length lives until Sprint 2.3 reads it. */
export const COUNTDOWN_SECONDS_METADATA_KEY = "countdown_seconds";

export interface SelectProviderRequest {
  readonly roomId: string;
  readonly providerId: string;
  readonly actorProfileId: string;
  /** Optional at selection time; the host may pick the title afterwards. */
  readonly contentReference?: ContentReference | null;
}

export interface SelectProviderResult {
  readonly room: Room;
  readonly syncMode: string;
  readonly complianceVerdict: string;
}

export interface RoomSetupService {
  isAvailable(): boolean;
  /** Refuses an unselectable or compliance-blocked provider outright. */
  selectProvider(
    request: SelectProviderRequest,
    intent: Intent,
  ): Promise<SelectProviderResult>;
  /** Persists the countdown length. Clamped, never scheduled. */
  setCountdownSeconds(
    roomId: string,
    seconds: number,
    actorProfileId: string,
  ): Promise<Room>;
  /** Reads the stored length, falling back to the specified default. */
  readCountdownSeconds(metadata: MetadataBag): number;
}

export interface RoomSetupDependencies {
  readonly rooms: RoomRepository | null;
  readonly catalog: ProviderCatalogService;
  readonly preferences: ProviderPreferenceService;
  readonly compliance: ComplianceService;
  readonly roomService: RoomService;
  readonly clock: Clock;
}

function requireRooms(rooms: RoomRepository | null, operation: string): RoomRepository {
  if (!rooms) {
    throw domainError("SERVICE_UNAVAILABLE", { operation: `RoomSetupService.${operation}` });
  }
  return rooms;
}

export function createRoomSetupService(deps: RoomSetupDependencies): RoomSetupService {
  const { rooms, catalog, preferences, compliance, roomService, clock } = deps;

  const readCountdownSeconds = (metadata: MetadataBag): number => {
    const raw = metadata[COUNTDOWN_SECONDS_METADATA_KEY];
    return normalizeCountdownSeconds(typeof raw === "number" ? raw : Number.NaN);
  };

  return {
    isAvailable: () => rooms !== null && catalog.isAvailable(),

    async selectProvider(request, intent) {
      const store = requireRooms(rooms, "selectProvider");
      const room = await store.findById(request.roomId);
      if (!room) throw domainError("ROOM_NOT_FOUND", {
          operation: "RoomSetupService.selectProvider",
          aggregateId: request.roomId,
        });
      if (room.hostProfileId !== request.actorProfileId) {
        throw domainError("ROOM_FORBIDDEN", {
          operation: "RoomSetupService.selectProvider",
          aggregateId: request.roomId,
        });
      }

      const snapshot = await catalog.load({ profileId: request.actorProfileId });
      const option = catalog.find(snapshot, request.providerId);
      if (!option) {
        throw domainError("PROVIDER_CAPABILITY_UNSUPPORTED", {
          operation: "RoomSetupService.selectProvider:unknown",
          aggregateId: request.providerId,
        });
      }

      // The verdict is issued (and recorded) here, not merely inspected:
      // every provider-touching path goes through Compliance (Build Rules §19).
      const { verdict } = await compliance.issueVerdict(
        {
          providerId: option.provider.id,
          regionCode: snapshot.regionCode,
          attemptedAction: PROVIDER_SELECT_RULE_KEY,
          origin: "RoomSetupService.selectProvider",
          rules: option.capabilities.length
            ? [
                {
                  ruleId: option.complianceRuleId,
                  providerId: option.provider.id,
                  scope: "global",
                  regionCode: null,
                  action: option.complianceAction,
                },
              ]
            : [],
        },
        intent,
      );
      compliance.assertAllowed(verdict, option.provider.id);
      if (!option.isSelectable) {
        throw domainError("PROVIDER_CAPABILITY_UNSUPPORTED", {
          operation: "RoomSetupService.selectProvider:not_selectable",
          aggregateId: option.provider.id,
        });
      }

      const updated = await store.update(room.id, {
        providerId: option.provider.id,
        ...(request.contentReference !== undefined
          ? {
              contentReference: request.contentReference
                ? serializeContentReference(request.contentReference)
                : null,
            }
          : {}),
      });

      await roomService.selectProvider(
        {
          roomId: room.id,
          providerId: option.provider.id,
          syncMode: option.syncMode,
          complianceVerdict: verdict.action,
        },
        intent,
      );
      await preferences.markUsed(request.actorProfileId, option.provider.id, clock.now());

      return { room: updated, syncMode: option.syncMode, complianceVerdict: verdict.action };
    },

    async setCountdownSeconds(roomId, seconds, actorProfileId) {
      const store = requireRooms(rooms, "setCountdownSeconds");
      const room = await store.findById(roomId);
      if (!room) throw domainError("ROOM_NOT_FOUND", {
          operation: "RoomSetupService.setCountdownSeconds",
          aggregateId: roomId,
        });
      if (room.hostProfileId !== actorProfileId) {
        throw domainError("ROOM_FORBIDDEN", {
          operation: "RoomSetupService.setCountdownSeconds",
          aggregateId: roomId,
        });
      }

      const normalized = isCountdownSecondsValid(seconds)
        ? seconds
        : normalizeCountdownSeconds(seconds);

      return store.update(roomId, {
        metadata: { ...room.metadata, [COUNTDOWN_SECONDS_METADATA_KEY]: normalized },
      });
    },

    readCountdownSeconds,
  };
}

export function resolveRoomSetupDependencies(input: {
  readonly catalog: ProviderCatalogService;
  readonly preferences: ProviderPreferenceService;
  readonly compliance: ComplianceService;
  readonly roomService: RoomService;
  readonly clock: Clock;
}): RoomSetupDependencies {
  return {
    rooms: isRepositoryBound(ROOM_REPOSITORY) ? resolveRepository(ROOM_REPOSITORY) : null,
    ...input,
  };
}

export const ROOM_SETUP_SERVICE = createServiceToken<RoomSetupService>("RoomSetupService");
