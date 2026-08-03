/**
 * Friends rail — UX Simplification Pass.
 *
 * A row of faces, nothing more. Tapping one opens their profile; the full
 * social surface lives on its own screen.
 */
import { Link } from "@tanstack/react-router";

import {
  Avatar,
  EmptyState,
  SectionHeader,
  type AvatarPreset,
} from "@/design-system/components";
import { useTranslation } from "@/foundation/localization";

import type { SocialModel } from "@/features/social";

export function FriendsRail({ social }: { social: SocialModel }) {
  const { t } = useTranslation();
  if (!social.isAvailable) return null;

  const friends = social.overview.friends.slice(0, 8);

  return (
    <section className="space-y-4" aria-labelledby="home-friends-heading">
      <SectionHeader
        title={t("home.friends.title")}
        action={
          <Link
            to="/people"
            className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            {t("social.action.see_all")}
          </Link>
        }
      />

      {friends.length === 0 ? (
        <EmptyState
          title={t("home.friends.empty.title")}
          description={t("home.friends.empty.description")}
          action={
            <Link
              to="/people"
              className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {t("social.action.find_people")}
            </Link>
          }
        />
      ) : (
        <ul className="-mx-4 flex gap-5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          {friends.map((person) => (
            <li key={person.profileId} className="shrink-0">
              <Link
                to="/people/$profileId"
                params={{ profileId: person.profileId }}
                className="flex w-16 flex-col items-center gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Avatar
                  name={person.displayName}
                  {...(person.avatarPreset
                    ? { preset: person.avatarPreset as AvatarPreset }
                    : null)}
                  size="md"
                />

                <span className="w-full truncate text-center text-xs font-medium">
                  {person.displayName}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
