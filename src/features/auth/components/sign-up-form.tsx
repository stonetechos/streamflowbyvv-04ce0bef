/**
 * Sign-up form — Milestone E.
 *
 * Three fields and nothing else. StreamFlow asks for a display name because a
 * room needs to say who arrived; it does not ask for a birthday, a phone
 * number, or a photograph, because none of those are needed to watch something
 * together (Foundation §10 — collect the minimum).
 *
 * The locale recorded at sign-up is the one the person is reading right now.
 */
import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { ActionButton, TextField } from "@/design-system/components";
import { useLocale, useTranslation } from "@/foundation/localization";
import { LOCAL_PREFERENCE_KEYS, writeLocalPreference } from "@/foundation/preferences";

import { useAuth } from "../auth-provider";
import {
  passwordStrength,
  validateDisplayName,
  validateEmail,
  validatePassword,
} from "../auth-validation";
import { useAuthForm } from "../use-auth-form";

const STRENGTH_CLASS = {
  weak: "w-1/3 bg-destructive",
  fair: "w-2/3 bg-warning",
  strong: "w-full bg-success",
};

export function SignUpForm() {
  const { t } = useTranslation();
  const locale = useLocale();
  const auth = useAuth();
  const navigate = useNavigate();
  const form = useAuthForm();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const strength = passwordStrength(password);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const next = {
      displayName: validateDisplayName(displayName),
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setErrors(next);
    if (next.displayName || next.email || next.password) return;

    const address = email.trim();
    const outcome = await form.submit(() =>
      auth.signUp({
        email: address,
        password,
        displayName: displayName.trim(),
        locale,
      }),
    );
    if (!outcome) return;

    writeLocalPreference(LOCAL_PREFERENCE_KEYS.LAST_EMAIL, address);
    setPassword("");

    if (outcome.kind === "session") {
      // A confirmed account goes straight into first-run setup.
      void navigate({ to: "/onboarding", replace: true });
      return;
    }
    void navigate({
      to: "/auth/verify-email",
      search: { email: outcome.kind === "verification_required" ? outcome.email : address },
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <TextField
        label={t("auth.field.display_name")}
        autoComplete="nickname"
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
        error={errors["displayName"] ? t(errors["displayName"]) : null}
        description={t("auth.field.display_name.hint")}
        placeholder={t("auth.field.display_name.placeholder")}
      />

      <TextField
        label={t("auth.field.email")}
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={errors["email"] ? t(errors["email"]) : null}
        placeholder={t("auth.field.email.placeholder")}
      />

      <div>
        <TextField
          label={t("auth.field.password")}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors["password"] ? t(errors["password"]) : null}
        />
        {password.length > 0 ? (
          <div className="mt-2">
            <div aria-hidden="true" className="h-1 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-[width] duration-normal ease-standard ${STRENGTH_CLASS[strength]}`}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {t(`auth.password.strength.${strength}`)}
            </p>
          </div>
        ) : null}
      </div>

      {form.errorKey ? (
        <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-3">
          <p className="text-sm font-medium text-destructive">{t(form.errorKey)}</p>
          {form.errorCode ? (
            <p className="mt-1 font-mono text-[0.6875rem] text-muted-foreground">
              {form.errorCode}
            </p>
          ) : null}
        </div>
      ) : null}

      <ActionButton type="submit" size="lg" block loading={form.pending}>
        {t("auth.action.create_account")}
      </ActionButton>

      <p className="text-center text-sm text-muted-foreground">
        {t("auth.sign_up.have_account")}{" "}
        <Link to="/auth" className="underline underline-offset-4 hover:text-foreground">
          {t("auth.action.sign_in")}
        </Link>
      </p>
    </form>
  );
}
