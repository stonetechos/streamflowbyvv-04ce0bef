/**
 * Auth feature public surface — Sprint 1.4.
 * Presentation imports from here and never from Domain or Repository directly.
 */
export { AuthProvider, useAuth, type AuthContextValue } from "./auth-provider";
export { RequireAuth, type RequireAuthProps } from "./protected-route";
export { authReducer, initialAuthState, isSettled, type AuthAction } from "./auth-state";
export {
  claimCallbackPayload,
  readCallbackTrace,
  traceCallback,
  type CallbackStage,
  type CallbackTraceEntry,
} from "./auth-callback-trace";
export { AUTH_CORE_FLAG, registerAuthFeatureFlags } from "./auth-feature-flags";
export { AuthShell, type AuthShellProps } from "./components/auth-shell";
export { SignInForm } from "./components/sign-in-form";
export { SignUpForm } from "./components/sign-up-form";
export { ForgotPasswordForm } from "./components/forgot-password-form";
export { ResetPasswordForm } from "./components/reset-password-form";
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
export {
  claimDestination,
  clearDestination,
  isResumablePath,
  readDestination,
  rememberCurrentDestination,
  rememberDestination,
} from "./pending-destination";
