/**
 * NotificationService — Foundation §3, Sprint 1.6.
 *
 * Decides whether a notification may be delivered, and on which channel. The
 * catalog publishes no notification event, so this service emits none: it is a
 * pure policy surface over ADR-007 channels, quiet hours, and the §19 daily
 * email cap. Delivery belongs to an Infrastructure adapter.
 */
import { domainError } from "@/domain/errors/domain-errors";
import type {
  DeliveryStatus,
  NotificationChannel,
  NotificationType,
} from "@/domain/shared/domain-enums";
import { RATE_LIMITS } from "@/shared/constants/system-constants";

import type { DomainServiceContext } from "./service-context";

export interface NotificationPreferences {
  readonly inAppEnabled: boolean;
  readonly emailEnabled: boolean;
  readonly typeSettings: Readonly<Partial<Record<NotificationType, boolean>>>;
  /** `HH:mm` in `quietHoursTimezone`; both null when quiet hours are off. */
  readonly quietHoursStart: string | null;
  readonly quietHoursEnd: string | null;
}

export interface NotificationRequest {
  readonly recipientProfileId: string;
  readonly type: NotificationType;
  readonly titleKey: string;
  readonly bodyKey: string;
  readonly preferences: NotificationPreferences;
  /** Emails already sent to this recipient in the current day. */
  readonly emailsSentToday?: number;
}

export interface NotificationDecision {
  readonly channels: readonly NotificationChannel[];
  readonly suppressed: boolean;
  readonly deliveryStatus: DeliveryStatus;
}

export interface NotificationService {
  /** ADR-007: `push` is reserved and never selected by a v1 code path. */
  resolveChannels(request: NotificationRequest): NotificationDecision;
  isWithinQuietHours(preferences: NotificationPreferences, now?: Date): boolean;
  assertEmailQuota(emailsSentToday: number, recipientProfileId: string): void;
}

function minutesOfDay(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

export function createNotificationService(context: DomainServiceContext): NotificationService {
  const { clock } = context;

  const isWithinQuietHours = (preferences: NotificationPreferences, now = clock.now()): boolean => {
    const { quietHoursStart, quietHoursEnd } = preferences;
    if (!quietHoursStart || !quietHoursEnd) return false;
    const current = now.getUTCHours() * 60 + now.getUTCMinutes();
    const start = minutesOfDay(quietHoursStart);
    const end = minutesOfDay(quietHoursEnd);
    return start <= end ? current >= start && current < end : current >= start || current < end;
  };

  const assertEmailQuota = (emailsSentToday: number, recipientProfileId: string): void => {
    if (emailsSentToday >= RATE_LIMITS.NOTIFICATION_EMAILS_PER_DAY) {
      throw domainError("RATE_LIMITED", {
        operation: "NotificationService.assertEmailQuota",
        aggregateId: recipientProfileId,
      });
    }
  };

  return {
    isWithinQuietHours,
    assertEmailQuota,

    resolveChannels(request) {
      const { preferences, type } = request;
      const typeAllowed = preferences.typeSettings[type] ?? true;
      if (!typeAllowed) {
        return { channels: [], suppressed: true, deliveryStatus: "suppressed" };
      }

      const channels: NotificationChannel[] = [];
      if (preferences.inAppEnabled) channels.push("in_app");
      if (
        preferences.emailEnabled &&
        !isWithinQuietHours(preferences) &&
        (request.emailsSentToday ?? 0) < RATE_LIMITS.NOTIFICATION_EMAILS_PER_DAY
      ) {
        channels.push("email");
      }

      return channels.length === 0
        ? { channels, suppressed: true, deliveryStatus: "suppressed" }
        : { channels, suppressed: false, deliveryStatus: "queued" };
    },
  };
}
