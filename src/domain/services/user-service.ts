/**
 * UserService — Foundation §3, Sprint 1.6.
 *
 * Profile, preference and blocking orchestration. Emits the catalog's identity
 * events (§2) and nothing else. Roles are never touched here: authorization is
 * read through the roles table (ADR-009, Sprint 1.4 AuthorizationService).
 */
import { domainError } from "@/domain/errors/domain-errors";
import type { CatalogEvent } from "@/domain/events/event-bus";
import type { ProfileStatus } from "@/domain/shared/domain-enums";

import type { DomainServiceContext, Intent } from "./service-context";

export interface UserService {
  recordSignUp(
    input: { profileId: string; code: string; locale: string; signupMethod: string },
    intent: Intent,
  ): Promise<CatalogEvent<"SignedUp">>;
  updateProfile(
    input: { profileId: string; changedFields: readonly string[] },
    intent: Intent,
  ): Promise<CatalogEvent<"ProfileUpdated">>;
  updatePreferences(
    input: { profileId: string; preferenceTable: string; changedFields: readonly string[] },
    intent: Intent,
  ): Promise<CatalogEvent<"PreferencesUpdated">>;
  blockUser(
    input: {
      blockerProfileId: string;
      blockedProfileId: string;
      reason: string;
      sharesActiveRoom?: boolean;
    },
    intent: Intent,
  ): Promise<CatalogEvent<"UserBlocked">>;
  unblockUser(
    input: { blockerProfileId: string; blockedProfileId: string },
    intent: Intent,
  ): Promise<CatalogEvent<"UserUnblocked">>;
  requestAccountDeletion(
    profileId: string,
    intent: Intent,
  ): Promise<CatalogEvent<"AccountDeletionRequested">>;
  canParticipate(status: ProfileStatus): boolean;
}

export function createUserService(context: DomainServiceContext): UserService {
  const { events, clock } = context;

  return {
    canParticipate: (status) => status === "active",

    recordSignUp: (input, intent) =>
      events.publish("SignedUp", input.profileId, { ...input }, intent),

    updateProfile(input, intent) {
      if (input.changedFields.length === 0) {
        throw domainError("INVALID_INPUT", {
          operation: "UserService.updateProfile",
          aggregateId: input.profileId,
        });
      }
      return events.publish(
        "ProfileUpdated",
        input.profileId,
        { profileId: input.profileId, changedFields: [...input.changedFields] },
        intent,
      );
    },

    updatePreferences: (input, intent) =>
      events.publish(
        "PreferencesUpdated",
        input.profileId,
        { ...input, changedFields: [...input.changedFields] },
        intent,
      ),

    blockUser({ sharesActiveRoom = false, ...input }, intent) {
      // ADR-011: blocking is honoured immediately, including inside a live room.
      void sharesActiveRoom;
      return events.publish("UserBlocked", input.blockerProfileId, { ...input }, intent);
    },

    unblockUser: (input, intent) =>
      events.publish("UserUnblocked", input.blockerProfileId, { ...input }, intent),

    requestAccountDeletion: (profileId, intent) =>
      events.publish(
        "AccountDeletionRequested",
        profileId,
        { profileId, requestedAt: clock.now().toISOString() },
        intent,
      ),
  };
}
