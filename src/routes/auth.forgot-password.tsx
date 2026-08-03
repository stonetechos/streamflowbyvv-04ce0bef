import { createFileRoute } from "@tanstack/react-router";

import { AuthShell, ForgotPasswordForm } from "@/features/auth";
import { useTranslation } from "@/foundation/localization";

/** Password recovery surface — Milestone E. */
export const Route = createFileRoute("/auth/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — StreamFlow" },
      {
        name: "description",
        content: "Request a password reset link for your StreamFlow account.",
      },
      { property: "og:title", content: "Reset your password — StreamFlow" },
      { property: "og:description", content: "Request a StreamFlow password reset link." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { t } = useTranslation();
  return (
    <AuthShell
      title={t("auth.forgot_password.title")}
      subtitle={t("auth.forgot_password.subtitle")}
      mood="observing"
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
