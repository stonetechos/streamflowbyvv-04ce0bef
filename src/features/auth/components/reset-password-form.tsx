/**
 * Choose a new password — Sprint H1.6 §1.
 *
 * The second half of recovery. The link in the email signs the person in for
 * exactly this purpose, so the screen asks for nothing but the new password
 * and refuses to render for anyone who arrived without that session — a reset
 * form that works while signed out would be an account takeover.
 */
import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { ActionButton, TextField } from "@/design-system/components";
import { useTranslation } from "@/foundation/localization";

import { useAuth } from "../auth-provider";
import { validatePassword } from "../auth-validation";
import { useAuthForm } from "../use-auth-form";

export function ResetPasswordForm() {
  const { t } = useTranslation();
  const auth = useAuth();
  const form = useAuthForm();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const invalid = validatePassword(password);
    setFieldError(invalid ?? (password === confirmation ? null : "auth.error.password_mismatch"));
    if (invalid || password !== confirmation) return;

    const result = await form.submit(() => auth.updatePassword(password));
    if (result === null && form.errorKey) return;
    setDone(true);
  }

  if (!auth.isSettled) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        {t("auth.callback.working")}
      </p>
    );
  }

  // No recovery session means the link was not opened, or was opened twice.
  if (!auth.isAuthenticated) {
    return (
      <div className="space-y-4">
        <p className="text-sm">{t("auth.reset.link_required")}</p>
        <ActionButton
          size="lg"
          block
          onClick={() => void navigate({ to: "/auth/forgot-password", replace: true })}
        >
          {t("auth.action.send_reset_link")}
        </ActionButton>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-4" role="status">
        <p className="text-sm">{t("auth.reset.updated")}</p>
        <ActionButton size="lg" block onClick={() => void navigate({ to: "/home" })}>
          {t("auth.action.continue")}
        </ActionButton>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <TextField
        label={t("auth.field.new_password")}
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={fieldError ? t(fieldError) : null}
      />
      <TextField
        label={t("auth.field.confirm_password")}
        type="password"
        autoComplete="new-password"
        value={confirmation}
        onChange={(event) => setConfirmation(event.target.value)}
      />

      {form.errorKey ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {t(form.errorKey)}
        </p>
      ) : null}

      <ActionButton type="submit" size="lg" block loading={form.pending}>
        {t("auth.action.update_password")}
      </ActionButton>

      <p className="text-center text-sm text-muted-foreground">
        <Link to="/auth/sign-in" className="underline underline-offset-4 hover:text-foreground">
          {t("auth.action.back_to_sign_in")}
        </Link>
      </p>
    </form>
  );
}
