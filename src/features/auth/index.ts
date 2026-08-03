/**
 * Auth feature public surface — Sprint 1.4.
 * Presentation imports from here and never from Domain or Repository directly.
 */
export { AuthProvider, useAuth, type AuthContextValue } from "./auth-provider";
export { RequireAuth, type RequireAuthProps } from "./protected-route";
export { authReducer, initialAuthState, isSettled, type AuthAction } from "./auth-state";
export { AUTH_CORE_FLAG, registerAuthFeatureFlags } from "./auth-feature-flags";
export { AuthShell, type AuthShellProps } from "./components/auth-shell";
export { SignInForm } from "./components/sign-in-form";
export { SignUpForm } from "./components/sign-up-form";
export { ForgotPasswordForm } from "./components/forgot-password-form";
export { VerifyEmailPanel } from "./components/verify-email-panel";
export {
  normalizeRoomCode,
  passwordStrength,
  validateDisplayName,
  validateEmail,
  validatePassword,
  validateRoomCode,
} from "./auth-validation";
export { toAuthErrorPresentation, useAuthForm, type UseAuthFormResult } from "./use-auth-form";

