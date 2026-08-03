/**
 * Email link landing surface — Sprint H1.6 §3.
 *
 * Every link the identity provider mails — signup confirmation, magic link,
 * password recovery — returns here. Before this route existed the links
 * pointed at a path with nothing behind it, so a correct confirmation ended on
 * a dead URL and the journey could not be finished.
 *
 * The route reads the outcome the provider appended to the URL and does one of
 * three things: send a confirmed person into the app, open the new-password
 * screen for a recovery link, or explain plainly why a link did not work and
 * what to do instead (Sprint H1.6 §4). It never handles tokens itself; the
 * session arrives through the auth provider like any other sign-in.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

import { ActionButton } from "@/design-system/components";
import { AuthShell, claimCallbackPayload, traceCallback, useAuth } from "@/features/auth";
import { useTranslation } from "@/foundation/localization";


export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [
      { title: "Confirming your account — StreamFlow" },
      {
        name: "description",
        content: "Finishing email confirmation and signing you in to StreamFlow.",
      },
      { property: "og:title", content: "Confirming your account — StreamFlow" },
      { property: "og:description", content: "Finishing email confirmation for StreamFlow." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthCallbackPage,
});

/** What the provider put in the URL, whether in the query or the hash. */
interface CallbackParams {
  readonly type: string | null;
  readonly error: string | null;
  readonly errorCode: string | null;
  /** True when the URL still carries a one-time credential to be consumed. */
  readonly hasToken: boolean;
  /** Shape-only fingerprint of the payload; never the token itself. */
  readonly fingerprint: string;
}

const EMPTY_PARAMS: CallbackParams = {
  type: null,
  error: null,
  errorCode: null,
  hasToken: false,
  fingerprint: "none",
};

function readCallbackParams(): CallbackParams {
  if (typeof window === "undefined") return EMPTY_PARAMS;
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const read = (key: string) => query.get(key) ?? hash.get(key);
  const credential = read("access_token") ?? read("code") ?? read("token_hash");
  return {
    type: read("type"),
    error: read("error") ?? read("error_description"),
    errorCode: read("error_code"),
    hasToken: credential !== null,
    fingerprint: `${read("type") ?? "-"}:${credential ? credential.length : 0}`,
  };
}

/** How long to wait for the session before calling the link spent. */
const SETTLE_TIMEOUT_MS = 8000;

function AuthCallbackPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const navigate = useNavigate();
  const params = useMemo(readCallbackParams, []);
  const [timedOut, setTimedOut] = useState(false);
  const redirected = useRef(false);

  const isRecovery = params.type === "recovery";
  // An expired or already-used link is the common failure, and the two are
  // indistinguishable from the outside — one message covers both honestly.
  const isExpired =
    params.errorCode === "otp_expired" ||
    (params.error?.toLowerCase().includes("expired") ?? false);

  // Entry trace. Guarded so Strict Mode's double-invocation, a remount, or a
  // re-render can never present the same one-time token to the client twice.
  useEffect(() => {
    if (!claimCallbackPayload(params.fingerprint)) return;
    traceCallback("callback_entered", window.location.pathname);
    if (params.error) {
      traceCallback("provider_error", params.errorCode ?? "unspecified");
    } else if (params.hasToken) {
      traceCallback("token_detected", params.type ?? "confirmation");
    } else {
      traceCallback("no_token_present");
    }
  }, [params]);

  // The session is established by the identity client's own single URL
  // exchange; this screen never runs a second mechanism against the token.
  useEffect(() => {
    if (!auth.isAuthenticated) return;
    traceCallback("session_exchanged");
    traceCallback("profile_loaded");
    // Strip the spent credential so a refresh or back-navigation cannot
    // replay it against the provider.
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [auth.isAuthenticated]);

  useEffect(() => {
    if (params.error || !auth.isAuthenticated || redirected.current) return;
    redirected.current = true;
    // A recovery link signs the person in so they can choose a new password;
    // anyone else is simply confirmed and belongs in the app.
    const to = isRecovery ? "/auth/reset-password" : "/home";
    traceCallback("redirect", to);
    void navigate({ to, replace: true });
  }, [auth.isAuthenticated, isRecovery, navigate, params.error]);

  useEffect(() => {
    if (params.error || auth.isAuthenticated) return;
    const timer = window.setTimeout(() => {
      traceCallback("timed_out");
      setTimedOut(true);
    }, SETTLE_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [auth.isAuthenticated, params.error]);


  const failed = Boolean(params.error) || timedOut;

  if (!failed) {
    return (
      <AuthShell
        title={t("auth.callback.title")}
        subtitle={t("auth.callback.subtitle")}
        mood="encouraging"
      >
        <p role="status" className="text-sm text-muted-foreground">
          {t("auth.callback.working")}
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t("auth.callback.failed.title")}
      subtitle={t(isExpired ? "auth.callback.failed.expired" : "auth.callback.failed.generic")}
      mood="observing"
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t("auth.callback.failed.retry")}</p>
        <ActionButton
          size="lg"
          block
          onClick={() => void navigate({ to: "/auth/sign-in", replace: true })}
        >
          {t("auth.action.sign_in")}
        </ActionButton>
        <p className="text-center text-sm text-muted-foreground">
          <Link
            to="/auth/forgot-password"
            className="underline underline-offset-4 hover:text-foreground"
          >
            {t("auth.action.send_reset_link")}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
