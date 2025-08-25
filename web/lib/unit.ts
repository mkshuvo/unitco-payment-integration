/**
 * Unit White-Label UI helpers
 * Centralizes env switching, script src, JWT storage, and cleanup.
 */

export type UiEnv = 'sandbox' | 'prod';

export const UNIT_JWT_STORAGE_KEY = 'unitJwt';

/**
 * Resolve UI environment from NEXT_PUBLIC_UNIT_UI_ENV.
 * Defaults to 'sandbox'.
 */
export function getUiEnv(): UiEnv {
  // Sandbox-only mode: production UI is intentionally disabled for now.
  // To re-enable env switching, restore reading from NEXT_PUBLIC_UNIT_UI_ENV.
  return 'sandbox';
}

/**
 * Unit UI CDN domain for the given environment.
 */
export function getUnitDomain(env?: UiEnv): string {
  const e = env || getUiEnv();
  return e === 'prod' ? 'https://ui.unit.co' : 'https://ui.s.unit.sh';
}

/**
 * Unit UI script URL for components-extended bundle.
 */
export function getUnitScriptSrc(env?: UiEnv): string {
  return `${getUnitDomain(env)}/release/latest/components-extended.js`;
}

/**
 * Optional customization URLs for theme and language packs, per Unit docs.
 * Provide via NEXT_PUBLIC_UNIT_THEME_URL and NEXT_PUBLIC_UNIT_LANGUAGE_URL.
 */
export function getThemeUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_UNIT_THEME_URL || undefined;
}

export function getLanguageUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_UNIT_LANGUAGE_URL || undefined;
}

/**
 * JWT from env (or demo token). Used for initial value.
 */
export function getEnvJwt(): string {
  return process.env.NEXT_PUBLIC_UNIT_JWT || 'demo.jwt.token';
}

/**
 * Read JWT from localStorage (client-side only).
 */
export function getStoredJwt(): string | null {
  try {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(UNIT_JWT_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Persist JWT in localStorage (client-side only).
 */
export function setStoredJwt(token: string): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(UNIT_JWT_STORAGE_KEY, token);
    }
  } catch {
    // no-op
  }
}

/**
 * Clear Unit runtime tokens produced by the white-label app.
 * Intended to be called during logout flows.
 */
export function clearUnitStorage(): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('unitCustomerToken');
      localStorage.removeItem('unitVerifiedCustomerToken');
    }
  } catch {
    // no-op
  }
}
