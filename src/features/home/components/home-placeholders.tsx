/**
 * Home placeholders — Milestone E.
 *
 * Two spaces the product has promised but not yet built: friends, and
 * scheduled watch parties. They are shown as reserved, clearly labelled
 * "coming soon" panels rather than fake data or hidden gaps, so the layout
 * people learn today is the layout they keep (MVP §5, v1.1 tier).
 */
import { Surface } from "@/design-system/components";
import { useTranslation } from "@/foundation/localization";

function Panel({
  title,
  description,
  badge,
  children,
}: {
  title: string;
  description: string;
  badge: string;
  children: React.ReactNode;
}) {
  return (
    <Surface padding="md" as="section" className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
        <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-widest text-muted-foreground">
          {badge}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-4 flex-1">{children}</div>
    </Surface>
  );
}

export function FriendsPlaceholder() {
  const { t } = useTranslation();

  return (
    <Panel
      title={t("home.friends.title")}
      description={t("home.friends.description")}
      badge={t("common.badge.coming_soon")}
    >
      <ul aria-hidden="true" className="space-y-3">
        {[0, 1, 2].map((row) => (
          <li key={row} className="flex items-center gap-3 opacity-45">
            <span className="size-9 shrink-0 rounded-full bg-muted" />
            <span className="h-3 w-32 rounded-full bg-muted" />
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function UpcomingPartiesPlaceholder() {
  const { t } = useTranslation();

  return (
    <Panel
      title={t("home.upcoming.title")}
      description={t("home.upcoming.description")}
      badge={t("common.badge.coming_soon")}
    >
      <div
        aria-hidden="true"
        className="grid grid-cols-4 gap-2 opacity-45 sm:grid-cols-7"
        role="presentation"
      >
        {Array.from({ length: 7 }, (_, index) => (
          <span key={index} className="h-14 rounded-xl border border-dashed border-border" />
        ))}
      </div>
    </Panel>
  );
}
