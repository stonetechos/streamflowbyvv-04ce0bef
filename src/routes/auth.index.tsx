import { createFileRoute } from "@tanstack/react-router";

import { useAuth } from "@/features/auth";
import { useTranslation } from "@/foundation/localization";

/**
 * Placeholder sign-in surface — Sprint 1.4 §11.
 *
 * The form is deliberately absent: no identity adapter is bound, and a form
 * that cannot authenticate is a lie (Build Rules §1, §28). This page states the
 * architectural status and exercises the auth state machine end to end.
 */
export const Route = createFileRoute("/auth/")({
  component: SignInPlaceholder,
});

function SignInPlaceholder() {
  const { t } = useTranslation();
  const auth = useAuth();

  return (
    <section className="mx-auto flex min-h-[60dvh] max-w-md flex-col justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t("auth.sign_in.title")}</h1>
      <p className="text-sm text-muted-foreground">{t("auth.sign_in.subtitle")}</p>

      <div className="rounded-lg border border-border p-4">
        <p className="text-sm">{t("error.auth.provider_unavailable")}</p>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <dt>{t("auth.status.session")}</dt>
          <dd className="font-mono">{auth.status}</dd>
          <dt>{t("auth.status.adapter")}</dt>
          <dd className="font-mono">{String(auth.isConfigured)}</dd>
        </dl>
      </div>
    </section>
  );
}
