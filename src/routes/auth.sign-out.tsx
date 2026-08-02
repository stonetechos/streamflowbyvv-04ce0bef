import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";

import { useAuth } from "@/features/auth";
import { useTranslation } from "@/foundation/localization";
import { logger } from "@/foundation/logging";

/**
 * Sign-out surface — Sprint 1.4 §11.
 *
 * Sign-out hygiene lives here so every future entry point uses one path:
 * clear session, clear local state, navigate with history replace.
 */
export const Route = createFileRoute("/auth/sign-out")({
  component: SignOutPage,
});

function SignOutPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(null);

  const handleSignOut = useCallback(async (): Promise<void> => {
    try {
      await auth.signOut();
      await navigate({ to: "/", replace: true });
    } catch {
      logger.warn("Sign out unavailable", { module: "auth" });
      setMessage(t("error.auth.provider_unavailable"));
    }
  }, [auth, navigate, t]);

  return (
    <section className="mx-auto flex min-h-[60dvh] max-w-md flex-col justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t("auth.sign_out.title")}</h1>
      <p className="text-sm text-muted-foreground">{t("auth.sign_out.subtitle")}</p>
      <button
        type="button"
        onClick={() => void handleSignOut()}
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {t("auth.action.sign_out")}
      </button>
      {message ? (
        <p role="alert" className="text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}
    </section>
  );
}
