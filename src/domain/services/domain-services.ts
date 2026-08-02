/**
 * Domain service tokens and composition — Sprint 1.6 §3.
 *
 * Dependency injection only: no service is a module-level singleton, every
 * service is constructed by a factory bound to a token and resolved through the
 * registry (Foundation §2, Build Rules §17).
 */
import { createEventBus, type EventBus } from "@/domain/events/event-bus";
import { systemClock, type Clock } from "@/domain/events/event.types";

import {
  createRoomFlowService,
  resolveRoomFlowDependencies,
  type RoomFlowService,
} from "../rooms/room-flow-service";
import {
  createRoomReadModel,
  resolveRoomReadModelDependencies,
  ROOM_READ_MODEL,
} from "../rooms/room-read-model";
import {
  bindService,
  createServiceToken,
  isServiceBound,
  resolveService,
} from "../service-registry";
import { createAnalyticsService, type AnalyticsService } from "./analytics-service";
import { createComplianceService, type ComplianceService } from "./compliance-service";
import {
  createFeatureFlagDomainService,
  type FeatureFlagDomainService,
} from "./feature-flag-service";
import { createInvitationService, type InvitationService } from "./invitation-service";
import {
  createLocalizationDomainService,
  type LocalizationDomainService,
} from "./localization-service";
import { createNotificationService, type NotificationService } from "./notification-service";
import { createPlaybackService, type PlaybackService } from "./playback-service";
import { createPresenceService, type PresenceService } from "./presence-service";
import { createProviderService, type ProviderService } from "./provider-service";
import { createRoomService, type RoomService } from "./room-service";
import type { DomainServiceContext } from "./service-context";
import { createSyncService, type SyncService } from "./sync-service";
import { createUserService, type UserService } from "./user-service";
import { createVoiceService, type VoiceService } from "./voice-service";

export const CLOCK = createServiceToken<Clock>("Clock");
export const EVENT_BUS = createServiceToken<EventBus>("EventBus");

export const ROOM_SERVICE = createServiceToken<RoomService>("RoomService");
/** Sprint 1.8 — room business flow, wired to the room repositories. */
export const ROOM_FLOW_SERVICE = createServiceToken<RoomFlowService>("RoomFlowService");
export const PLAYBACK_SERVICE = createServiceToken<PlaybackService>("PlaybackService");
export const SYNC_SERVICE = createServiceToken<SyncService>("SyncService");
export const VOICE_SERVICE = createServiceToken<VoiceService>("VoiceService");
export const INVITATION_SERVICE = createServiceToken<InvitationService>("InvitationService");
export const PRESENCE_SERVICE = createServiceToken<PresenceService>("PresenceService");
export const NOTIFICATION_SERVICE = createServiceToken<NotificationService>("NotificationService");
export const ANALYTICS_SERVICE = createServiceToken<AnalyticsService>("AnalyticsService");
export const USER_SERVICE = createServiceToken<UserService>("UserService");
export const PROVIDER_SERVICE = createServiceToken<ProviderService>("ProviderService");
export const FEATURE_FLAG_SERVICE =
  createServiceToken<FeatureFlagDomainService>("FeatureFlagDomainService");
export const LOCALIZATION_SERVICE =
  createServiceToken<LocalizationDomainService>("LocalizationDomainService");
export const COMPLIANCE_SERVICE = createServiceToken<ComplianceService>("ComplianceService");

export interface DomainServiceOptions {
  readonly clock?: Clock;
  readonly eventBus?: EventBus;
}

function context(): DomainServiceContext {
  return { events: resolveService(EVENT_BUS), clock: resolveService(CLOCK) };
}

/** Idempotent: safe to call from any entry point, binds each token once. */
export function registerDomainServices(options: DomainServiceOptions = {}): void {
  if (!isServiceBound(CLOCK)) {
    bindService(CLOCK, () => options.clock ?? systemClock);
  }
  if (!isServiceBound(EVENT_BUS)) {
    bindService(
      EVENT_BUS,
      () => options.eventBus ?? createEventBus({ clock: resolveService(CLOCK) }),
    );
  }

  const bindings: readonly [
    ReturnType<typeof createServiceToken<never>> | { key: symbol; name: string },
    () => unknown,
  ][] = [
    [ROOM_SERVICE, () => createRoomService(context())],
    [
      ROOM_FLOW_SERVICE,
      () =>
        createRoomFlowService(
          // Repositories resolve here, at first use, so an unconfigured backend
          // still boots and only a real call reports unavailability.
          resolveRoomFlowDependencies({
            roomService: resolveService(ROOM_SERVICE),
            invitationService: resolveService(INVITATION_SERVICE),
            complianceService: resolveService(COMPLIANCE_SERVICE),
            clock: resolveService(CLOCK),
          }),
        ),
    ],
    [ROOM_READ_MODEL, () => createRoomReadModel(resolveRoomReadModelDependencies())],
    [PLAYBACK_SERVICE, () => createPlaybackService(context())],
    [SYNC_SERVICE, () => createSyncService(context())],
    [VOICE_SERVICE, () => createVoiceService(context())],
    [INVITATION_SERVICE, () => createInvitationService(context())],
    [PRESENCE_SERVICE, () => createPresenceService(context())],
    [NOTIFICATION_SERVICE, () => createNotificationService(context())],
    [ANALYTICS_SERVICE, () => createAnalyticsService(context())],
    [USER_SERVICE, () => createUserService(context())],
    [PROVIDER_SERVICE, () => createProviderService(context())],
    [FEATURE_FLAG_SERVICE, () => createFeatureFlagDomainService(context())],
    [LOCALIZATION_SERVICE, () => createLocalizationDomainService(context())],
    [COMPLIANCE_SERVICE, () => createComplianceService(context())],
  ];

  for (const [token, factory] of bindings) {
    const typed = token as { key: symbol; name: string };
    if (!isServiceBound(typed)) bindService(typed, factory);
  }
}
