/**
 * Returns the current access token + the WebSocket base URL.
 *
 * The browser cannot read the HttpOnly access cookie directly, but it
 * needs the bearer token to authenticate the socket.io handshake. This
 * endpoint requires the cookie to be present (so anonymous callers cannot
 * mint a token) and returns it together with the public WebSocket URL.
 *
 * The token itself is the same one the user already controls via cookies;
 * production deployments may want to swap this for a separately-signed,
 * short-lived WS-only token (SRS NFR-SEC-006).
 */
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ACCESS_COOKIE } from '@/lib/session';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3001';

export async function GET(): Promise<NextResponse> {
  const store = await cookies();
  const token = store.get(ACCESS_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ token, wsUrl: WS_URL });
}
