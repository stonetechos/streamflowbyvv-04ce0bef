import { createFileRoute } from "@tanstack/react-router";

import { AuthShell, SignUpForm } from "@/features/auth";
import { useTranslation } from "@/foundation/localization";

/** Registration surface — Milestone E. */
export const Route = createFileRoute("/auth/sign-up")({
  head: () => ({
    meta: [
      { title: "Create your account — StreamFlow" },
      {
        name: "description",
        content:
          "Create a StreamFlow account to host private watch-together rooms with a shared countdown and voice chat.",
      },
      { property: "og:title", content: "Create your account — StreamFlow" },
      {
        property: "og:description",
        content: "Host private watch-together rooms with a shared countdown and voice chat.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SignUpPage,
});

function SignUpPage() {
  const { t } = useTranslation();
  return (
    <AuthShell title={t("auth.sign_up.title")} subtitle={t("auth.sign_up.subtitle")} mood="happy">
      <SignUpForm />
    </AuthShell>
  );
}
