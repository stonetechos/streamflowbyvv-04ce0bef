import { createFileRoute } from "@tanstack/react-router";

import { AuthShell, SignInForm } from "@/features/auth";
import { useTranslation } from "@/foundation/localization";

/**
 * Sign-in surface — Milestone E.
 * Public by design: the door must never sit behind the guard.
 */
export const Route = createFileRoute("/auth/sign-in")({
  head: () => ({
    meta: [
      { title: "Sign in — StreamFlow" },
      {
        name: "description",
        content:
          "Sign in to StreamFlow to create watch-together rooms and start a synchronized countdown with friends.",
      },
      { property: "og:title", content: "Sign in — StreamFlow" },
      {
        property: "og:description",
        content: "Access your StreamFlow rooms, invites and voice sessions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SignInPage,
});

function SignInPage() {
  const { t } = useTranslation();
  return (
    <AuthShell title={t("auth.sign_in.title")} subtitle={t("auth.sign_in.subtitle")} mood="calm">
      <SignInForm />
    </AuthShell>
  );
}
