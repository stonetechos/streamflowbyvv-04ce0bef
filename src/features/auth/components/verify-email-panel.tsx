/**
 * Email verification waiting room — Milestone E.
 *
 * The screen a person lands on between creating an account and confirming it.
 * It does one useful thing beyond explaining itself: it re-sends the email,
 * rate-limited on the client by a visible cooldown so the button never becomes
 * a way to flood an inbox.
 */
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { ActionButton } from "@/design-system/components";
import { useTranslation } from "@/foundation/localization";

import { useAuth } from "../auth-provider";
import { useAuthForm } from "../use-auth-form";

const RESEND_COOLDOWN_SECONDS = 45;

export function VerifyEmailPanel({ email }: { email: string }) {
  const { t } = useTranslation();
  const auth = useAuth();
  const form = useAuthForm();
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function resend() {
    await form.submit(() => auth.resendVerification(email));
    setCooldown(RESEND_COOLDOWN_SECONDS);
  }

  return (
    <div className="space-y-5">
      <p className="text-sm">{t("auth.verify.sent", { email })}</p>
      <p className="text-sm text-muted-foreground">{t("auth.verify.hint")}</p>

      {form.errorKey ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {t(form.errorKey)}
        </p>
      ) : null}

      <ActionButton
        tone="secondary"
        size="lg"
        block
        loading={form.pending}
        disabled={cooldown > 0}
        onClick={() => void resend()}
      >
        {cooldown > 0
          ? t("auth.action.resend_in", { seconds: cooldown })
          : t("auth.action.resend_verification")}
      </ActionButton>

      <p className="text-center text-sm text-muted-foreground">
        <Link to="/auth" className="underline underline-offset-4 hover:text-foreground">
          {t("auth.action.back_to_sign_in")}
        </Link>
      </p>
    </div>
  );
}
