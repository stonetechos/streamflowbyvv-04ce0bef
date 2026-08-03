import { createFileRoute } from "@tanstack/react-router";

import { useAuth } from "@/features/auth";
import { useTranslation } from "@/foundation/localization";

/**
 * Placeholder protected page — Sprint 1.4 §11.
 *
 * Exists to prove the guard: with no session it never renders, it redirects.
 * Account management itself is a later sprint (Build Rules §1).
 */
export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "Your account — StreamFlow" },
      {
        name: "description",
        content: "Review the StreamFlow account you are signed in with.",
      },
      { property: "og:title", content: "Your account — StreamFlow" },
      { property: "og:description", content: "Review the account you are signed in with." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountPlaceholder,
});

function AccountPlaceholder() {
  const { t } = useTranslation();
  const auth = useAuth();

  return (
    <section className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">{t("auth.account.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("auth.account.subtitle")}</p>
      <p className="mt-4 font-mono text-xs text-muted-foreground">
        {auth.session?.identity.handle ?? "—"}
      </p>
    </section>
  );
}
