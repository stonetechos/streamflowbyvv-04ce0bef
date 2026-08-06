/**
 * Sign-in form — Milestone E.
 *
 * Two v1 methods, one form (MVP §3.1–§3.2): a password sign-in, and a
 * passwordless link for people who would rather not have a password at all.
 * The chosen method is a segmented control rather than two pages, because the
 * decision is about this moment, not about the account.
 *
 * The form never stores a password, never logs an address, and hands both to
 * the Feature-layer auth provider — which is the only thing here that knows a
 * provider exists.
 */
import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { ActionButton, TextField } from "@/design-system/components";
import { useTranslation } from "@/foundation/localization";
import {
  LOCAL_PREFERENCE_KEYS,
  readLocalPreference,
  writeLocalPreference,
} from "@/foundation/preferences";

import { useAuth } from "../auth-provider";
import { validateEmail, validatePassword } from "../auth-validation";
import { useAuthForm } from "../use-auth-form";
import { claimDestination } from "../pending-destination";

type Method = "password" | "link";

export function SignInForm({ redirectTo = "/home" }: { redirectTo?: string }) {
  const { t } = useTranslation();
  const auth = useAuth();
  const navigate = useNavigate();
  const form = useAuthForm();

  const [method, setMethod] = useState<Method>("password");
  const [email, setEmail] = useState(
    () => readLocalPreference(LOCAL_PREFERENCE_KEYS.LAST_EMAIL) ?? "",
  );
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email: string | null; password: string | null }>(
    { email: null, password: null },
  );
  const [linkSentTo, setLinkSentTo] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const emailError = validateEmail(email);
    const passwordError = method === "password" ? validatePassword(password) : null;
    setFieldErrors({ email: emailError, password: passwordError });
    if (emailError || passwordError) return;

    const address = email.trim();

    const outcome = await form.submit(() =>
      method === "password"
        ? auth.signIn({ method: "email_password", email: address, password })
        : auth.signIn({
            method: "email_magic_link",
            email: address,
            returnPath: "/auth/callback",
          }),
    );

    if (!outcome) return;

    // Remembering the address is a convenience, not a credential.
    writeLocalPreference(LOCAL_PREFERENCE_KEYS.LAST_EMAIL, address);
    setPassword("");

    if (outcome.kind === "session") {
      const destination = claimDestination() ?? redirectTo;
      void navigate({ to: destination, replace: true });
      return;
    }
    if (outcome.kind === "magic_link_sent") {
      setLinkSentTo(outcome.email);
      return;
    }
    void navigate({ to: "/auth/verify-email", search: { email: outcome.email } });
  }

  if (linkSentTo) {
    return (
      <div className="space-y-4" role="status">
        <p className="text-sm">{t("auth.magic_link.sent", { email: linkSentTo })}</p>
        <p className="text-sm text-muted-foreground">{t("auth.magic_link.hint")}</p>
        <ActionButton tone="ghost" block onClick={() => setLinkSentTo(null)}>
          {t("auth.action.use_different_email")}
        </ActionButton>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <fieldset>
        <legend className="sr-only">{t("auth.method.legend")}</legend>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted/60 p-1">
          {(["password", "link"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={method === option}
              onClick={() => {
                setMethod(option);
                form.clearError();
              }}
              className={`min-h-10 rounded-lg px-3 text-sm font-medium transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                method === option
                  ? "bg-background text-foreground shadow-e1"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(option === "password" ? "auth.method.password" : "auth.method.magic_link")}
            </button>
          ))}
        </div>
      </fieldset>

      <TextField
        label={t("auth.field.email")}
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={fieldErrors.email ? t(fieldErrors.email) : null}
        placeholder={t("auth.field.email.placeholder")}
      />

      {method === "password" ? (
        <TextField
          label={t("auth.field.password")}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors.password ? t(fieldErrors.password) : null}
        />
      ) : (
        <p className="text-sm text-muted-foreground">{t("auth.magic_link.explainer")}</p>
      )}

      {form.errorKey ? (
        <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-3">
          {/* Sprint 85 — the person sees the sentence; the code stays for support. */}
          <p
            className="text-sm font-medium text-destructive"
            data-sf-error-code={form.errorCode ?? undefined}
          >
            {t(form.errorKey)}
          </p>
        </div>
      ) : null}

      <ActionButton type="submit" size="lg" block loading={form.pending}>
        {t(method === "password" ? "auth.action.sign_in" : "auth.action.send_magic_link")}
      </ActionButton>

      {method === "password" ? (
        <p className="text-center text-sm">
          <Link
            to="/auth/forgot-password"
            className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            {t("auth.action.reset_password")}
          </Link>
        </p>
      ) : null}
    </form>
  );
}
