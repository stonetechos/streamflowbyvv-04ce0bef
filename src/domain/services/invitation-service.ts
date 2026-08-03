/**
 * InvitationService — Foundation §3, Sprint 1.6.
 *
 * Invite lifecycle rules. Expiry comes from Foundation §14.2; ADR-006 fixes an
 * email invite as a `link` invite delivered by email, so no email channel
 * exists here. ADR-011: a block is honoured before an invite is ever created.
 */
import { domainError } from "@/domain/errors/domain-errors";
import type { CatalogEvent } from "@/domain/events/event-bus";
import type { InviteChannel, InviteStatus } from "@/domain/shared/domain-enums";
import { INVITATION } from "@/shared/constants/system-constants";

import type { DomainServiceContext, Intent } from "./service-context";

export interface CreateInviteInput {
  readonly inviteId: string;
  readonly code: string;
  readonly roomId: string;
  readonly channel: InviteChannel;
  /** ADR-011: caller supplies the block verdict; the service refuses on true. */
  readonly isBlocked?: boolean;
}

export interface InvitationService {
  createInvite(input: CreateInviteInput, intent: Intent): Promise<CatalogEvent<"InviteCreated">>;
  markDelivered(
    input: { roomId: string; inviteId: string; channel: InviteChannel; deliveryStatus: string },
    intent: Intent,
  ): Promise<CatalogEvent<"InviteDelivered">>;
  accept(
    input: {
      inviteId: string;
      roomId: string;
      profileId: string;
      status: InviteStatus;
      expiresAt: string;
    },
    intent: Intent,
  ): Promise<CatalogEvent<"InviteAccepted">>;
  decline(
    input: { inviteId: string; roomId: string; profileId: string; status: InviteStatus },
    intent: Intent,
  ): Promise<CatalogEvent<"InviteDeclined">>;
  expire(
    input: { inviteId: string; roomId: string },
    intent: Intent,
  ): Promise<CatalogEvent<"InviteExpired">>;
  revoke(
    input: { inviteId: string; roomId: string; revokedByProfileId: string },
    intent: Intent,
  ): Promise<CatalogEvent<"InviteRevoked">>;
  /** Foundation §14.2 — 24 hours from issue. */
  expiryFor(issuedAt: Date): Date;
  isExpired(expiresAt: string, now?: Date): boolean;
}

export function createInvitationService(context: DomainServiceContext): InvitationService {
  const { events, clock } = context;

  const expiryFor = (issuedAt: Date): Date =>
    new Date(issuedAt.getTime() + INVITATION.INVITE_EXPIRY_MS);

  const isExpired = (expiresAt: string, now = clock.now()): boolean =>
    Date.parse(expiresAt) <= now.getTime();

  return {
    expiryFor,
    isExpired,

    createInvite({ isBlocked = false, ...input }, intent) {
      if (isBlocked) {
        throw domainError("COMPLIANCE_ACTION_BLOCKED", {
          operation: "InvitationService.createInvite",
          aggregateId: input.roomId,
        });
      }
      return events.publish(
        "InviteCreated",
        input.roomId,
        { ...input, expiresAt: expiryFor(clock.now()).toISOString() },
        intent,
      );
    },

    markDelivered: ({ roomId, ...input }, intent) =>
      events.publish("InviteDelivered", roomId, { ...input }, intent),

    accept({ status, expiresAt, ...input }, intent) {
      if (status !== "pending") {
        throw domainError("INVITE_NOT_PENDING", {
          operation: "InvitationService.accept",
          aggregateId: input.roomId,
        });
      }
      if (isExpired(expiresAt)) {
        throw domainError("INVITE_EXPIRED", {
          operation: "InvitationService.accept",
          aggregateId: input.roomId,
        });
      }
      return events.publish("InviteAccepted", input.roomId, { ...input }, intent);
    },

    decline({ status, ...input }, intent) {
      if (status !== "pending") {
        throw domainError("INVITE_NOT_PENDING", {
          operation: "InvitationService.decline",
          aggregateId: input.roomId,
        });
      }
      return events.publish("InviteDeclined", input.roomId, { ...input }, intent);
    },

    expire: (input, intent) => events.publish("InviteExpired", input.roomId, { ...input }, intent),

    revoke: (input, intent) => events.publish("InviteRevoked", input.roomId, { ...input }, intent),
  };
}
