/**
 * Auth feature public surface — Sprint 1.4.
 * Presentation imports from here and never from Domain or Repository directly.
 */
export { AuthProvider, useAuth, type AuthContextValue } from "./auth-provider";
export { RequireAuth, type RequireAuthProps } from "./protected-route";
export { authReducer, initialAuthState, isSettled, type AuthAction } from "./auth-state";
export { AUTH_CORE_FLAG, registerAuthFeatureFlags } from "./auth-feature-flags";
