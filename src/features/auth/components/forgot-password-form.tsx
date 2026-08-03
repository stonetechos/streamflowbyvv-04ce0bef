/**
 * Password recovery — Milestone E.
 *
 * The response is deliberately identical whether or not the address is
 * registered. Telling an anonymous visitor which addresses exist is an account
 * enumeration oracle, and no product benefit outweighs that (Foundation §10).
 */
import { Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { ActionButton, TextField } from "@/design-system/components";
import { useTranslation } from "@/foundation/localization";

import { useAuth } from "../auth-provider";
import { validateEmail } from "../auth-validation";
import { useAuthForm } from "../use-auth-form";

export function ForgotPasswordForm() {
  const { t } = useTranslation();
  const auth = useAuth();
  const form = useAuthForm();

  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = validateEmail(email);
    setFieldError(error);
    if (error) return;

    await form.submit(() => auth.requestPasswordReset(email.trim(), "/auth/callback"));
    // Shown regardless of the provider's answer, by design.
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-4" role="status">
        <p className="text-sm">{t("auth.reset.sent")}</p>
        <p className="text-sm text-muted-foreground">{t("auth.reset.hint")}</p>
        <ActionButton tone="ghost" block onClick={() => setSent(false)}>
          {t("auth.action.use_different_email")}
        </ActionButton>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <TextField
        label={t("auth.field.email")}
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={fieldError ? t(fieldError) : null}
        placeholder={t("auth.field.email.placeholder")}
      />

      <ActionButton type="submit" size="lg" block loading={form.pending}>
        {t("auth.action.send_reset_link")}
      </ActionButton>

      <p className="text-center text-sm text-muted-foreground">
        <Link to="/auth" className="underline underline-offset-4 hover:text-foreground">
          {t("auth.action.back_to_sign_in")}
        </Link>
      </p>
    </form>
  );
}
