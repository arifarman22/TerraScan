/**
 * Browser-to-Core-Service API proxy.
 *
 * The HttpOnly access token never reaches client JavaScript. The browser
 * calls `/api/proxy/<path>`; this handler forwards the request to the Core
 * Service with the cookie's access token as a Bearer header.
 *
 * Auth-flow endpoints (`/auth/login`, `/auth/register`, `/auth/refresh`,
 * `/auth/logout`) are intercepted to manage the session cookies.
 */
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  SECURE_COOKIE_OPTIONS,
} from '@/lib/session';

const BASE_URL = process.env.INTERNAL_API_URL ?? 'http://localhost:3001/api/v1';

const TOKEN_ISSUING_PATHS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
]);

async function forward(
  request: NextRequest,
  segments: string[],
): Promise<NextResponse> {
  const subpath = '/' + segments.join('/');
  const url = new URL(BASE_URL + subpath);
  request.nextUrl.searchParams.forEach((value, key) =>
    url.searchParams.append(key, value),
  );

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  const headers: Record<string, string> = {
    'content-type': request.headers.get('content-type') ?? 'application/json',
  };
  if (accessToken) {
    headers.authorization = `Bearer ${accessToken}`;
  }

  const body =
    request.method === 'GET' || request.method === 'HEAD'
      ? undefined
      : await request.text();

  const upstream = await fetch(url, {
    method: request.method,
    headers,
    body,
  });
  const upstreamBody = await upstream.text();
  const upstreamContentType =
    upstream.headers.get('content-type') ?? 'application/json';

  // Intercept token-issuing responses and set HttpOnly cookies.
  if (TOKEN_ISSUING_PATHS.has(subpath) && upstream.ok) {
    try {
      const parsed = JSON.parse(upstreamBody) as {
        accessToken?: string;
        refreshToken?: string;
        expiresIn?: number;
      };
      if (parsed.accessToken && parsed.refreshToken) {
        const response = NextResponse.json(parsed, { status: upstream.status });
        const accessMaxAge =
          typeof parsed.expiresIn === 'number' ? parsed.expiresIn : 900;
        response.cookies.set(ACCESS_COOKIE, parsed.accessToken, {
          ...SECURE_COOKIE_OPTIONS,
          maxAge: accessMaxAge,
        });
        response.cookies.set(REFRESH_COOKIE, parsed.refreshToken, {
          ...SECURE_COOKIE_OPTIONS,
          maxAge: 60 * 60 * 24 * 7,
        });
        return response;
      }
    } catch {
      // Fall through to the default response.
    }
  }

  if (subpath === '/auth/logout' && upstream.ok) {
    const response = new NextResponse(upstreamBody, {
      status: upstream.status,
      headers: { 'content-type': upstreamContentType },
    });
    response.cookies.delete(ACCESS_COOKIE);
    response.cookies.delete(REFRESH_COOKIE);
    return response;
  }

  return new NextResponse(upstreamBody, {
    status: upstream.status,
    headers: { 'content-type': upstreamContentType },
  });
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const { path } = await ctx.params;
  return forward(request, path);
}
export async function POST(request: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const { path } = await ctx.params;
  return forward(request, path);
}
export async function PUT(request: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const { path } = await ctx.params;
  return forward(request, path);
}
export async function PATCH(request: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const { path } = await ctx.params;
  return forward(request, path);
}
export async function DELETE(request: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const { path } = await ctx.params;
  return forward(request, path);
}
