/**
 * Providers rail — Milestone E.
 *
 * The services this person can use, presented on the home screen as a compact
 * rail. Every capability label and every compliance verdict comes from the
 * catalog service through `useProviderCatalog`; nothing is judged here.
 */
import { EmptyState, SectionHeader, SkeletonRail, Surface } from "@/design-system/components";
import { useProviderCatalog, selectionClassLabelKey } from "@/features/providers";
import { useTranslation } from "@/foundation/localization";

export function ProvidersSection({ profileId }: { profileId: string | null }) {
  const { t } = useTranslation();
  const catalog = useProviderCatalog(profileId);

  return (
    <section className="space-y-4">
      <SectionHeader
        title={t("home.providers.title")}
        description={t("home.providers.description")}
      />

      {catalog.status === "loading" ? <SkeletonRail tiles={5} /> : null}

      {catalog.status === "ready" && catalog.options.length > 0 ? (
        <ul className="flex snap-x gap-3 overflow-x-auto pb-2">
          {catalog.options.map((option) => (
            <li key={option.id} className="snap-start">
              <Surface
                padding="sm"
                interactive
                className="flex h-full w-44 flex-col justify-between gap-3"
              >
                <p className="font-display text-sm font-semibold">{t(option.nameKey)}</p>
                <span className="inline-flex w-fit items-center rounded-full border border-border px-2.5 py-1 text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground">
                  {t(selectionClassLabelKey(option.selectionClass))}
                </span>
              </Surface>
            </li>
          ))}
        </ul>
      ) : null}

      {catalog.status === "ready" && catalog.options.length === 0 ? (
        <EmptyState
          title={t("home.providers.empty.title")}
          description={t("home.providers.empty.description")}
        />
      ) : null}

      {catalog.status === "unavailable" || catalog.status === "error" ? (
        <EmptyState
          title={t("home.providers.unavailable.title")}
          description={t("home.providers.unavailable.description")}
        />
      ) : null}
    </section>
  );
}
