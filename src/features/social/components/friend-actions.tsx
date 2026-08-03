/**
 * Friend actions — Milestone F.0.
 *
 * One control cluster that renders whatever the viewer's standing with a
 * person allows, and nothing else. The standing itself is decided by
 * `SocialService.classify`; this component never infers it from the presence
 * or absence of data.
 */
import { ActionButton } from "@/design-system/components";
import { useTranslation } from "@/foundation/localization";
import type { Relationship } from "@/domain";

export interface FriendActionsProps {
  readonly relationship: Relationship;
  readonly busy?: boolean;
  /** Compact rows drop secondary actions to keep the target sizes generous. */
  readonly compact?: boolean;
  onSendRequest(): void;
  onAccept(friendshipId: string): void;
  onDecline(friendshipId: string): void;
  onCancel(friendshipId: string): void;
  onRemove?(friendshipId: string): void;
  onBlock?(): void;
  onUnblock?(): void;
}

export function FriendActions({
  relationship,
  busy = false,
  compact = false,
  onSendRequest,
  onAccept,
  onDecline,
  onCancel,
  onRemove,
  onBlock,
  onUnblock,
}: FriendActionsProps) {
  const { t } = useTranslation();
  const size = compact ? "sm" : "md";
  const { kind, friendshipId } = relationship;

  if (kind === "self") return null;

  if (kind === "blocked") {
    return (
      <ActionButton size={size} tone="ghost" loading={busy} onClick={onUnblock}>
        {t("social.action.unblock")}
      </ActionButton>
    );
  }

  // Someone who blocked the viewer is never told so directly; there is simply
  // nothing to do here.
  if (kind === "blocked_by") return null;

  if (kind === "friends") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
          {t("social.status.friends")}
        </span>
        {onRemove && friendshipId ? (
          <ActionButton
            size={size}
            tone="ghost"
            loading={busy}
            onClick={() => onRemove(friendshipId)}
          >
            {t("social.action.remove")}
          </ActionButton>
        ) : null}
      </div>
    );
  }

  if (kind === "incoming_request" && friendshipId) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <ActionButton size={size} loading={busy} onClick={() => onAccept(friendshipId)}>
          {t("social.action.accept")}
        </ActionButton>
        <ActionButton size={size} tone="ghost" disabled={busy} onClick={() => onDecline(friendshipId)}>
          {t("social.action.decline")}
        </ActionButton>
      </div>
    );
  }

  if (kind === "outgoing_request" && friendshipId) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
          {t("social.status.requested")}
        </span>
        <ActionButton size={size} tone="ghost" loading={busy} onClick={() => onCancel(friendshipId)}>
          {t("social.action.cancel_request")}
        </ActionButton>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ActionButton size={size} loading={busy} onClick={onSendRequest}>
        {t("social.action.add_friend")}
      </ActionButton>
      {onBlock && !compact ? (
        <ActionButton size={size} tone="ghost" disabled={busy} onClick={onBlock}>
          {t("social.action.block")}
        </ActionButton>
      ) : null}
    </div>
  );
}
