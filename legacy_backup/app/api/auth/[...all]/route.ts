import { toNextJsHandler } from 'better-auth/next-js';
import { NextResponse } from 'next/server';
import { auth } from '@/server/auth/better-auth';
import { shouldBlockDirectBetterAuthRoute } from '@/server/auth/better-auth-route-policy';

const handlers = toNextJsHandler(auth);

const guarded = (handler: (request: Request) => Promise<Response>) => async (request: Request) => {
  if (shouldBlockDirectBetterAuthRoute(request)) {
    return NextResponse.json({ ok: false, message: 'Endpoint không khả dụng.' }, { status: 404 });
  }

  return handler(request);
};

export const GET = guarded(handlers.GET);
export const POST = guarded(handlers.POST);
export const PUT = guarded(handlers.PUT);
export const PATCH = guarded(handlers.PATCH);
export const DELETE = guarded(handlers.DELETE);
