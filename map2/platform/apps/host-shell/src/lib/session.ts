/**
 * Cookie-based session helpers (SRS FR-AUTH-006/007).
 * The Core Service issues short-lived access tokens and longer-lived refresh
 * tokens — both stored as HttpOnly cookies so they're inaccessible to JS.
 */
import { cookies } from 'next/headers';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

/** Default cookie options for tokens (set on the proxy login route). */
export const SECURE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

/** Read the current session tokens from the cookie store, or null. */
export async function getSessionTokens(): Promise<SessionTokens | null> {
  const store = await cookies();
  const accessToken = store.get(ACCESS_COOKIE)?.value;
  const refreshToken = store.get(REFRESH_COOKIE)?.value;
  if (!accessToken || !refreshToken) {
    return null;
  }
  return { accessToken, refreshToken };
}
