import { NextResponse } from 'next/server';
import { AUTH_RATE_LIMITS } from '@/server/auth/login-policy';
import { consumeStoredRateLimit } from '@/server/auth/rate-limit-store';
import { prismaAuthRepository } from '@/server/auth/auth-repository';
import { registerStaffAccount } from '@/server/auth/register-user';
import { parseRegisterRequestBody } from '@/server/auth/register-request';

const getClientIp = (request: Request): string =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
  request.headers.get('x-real-ip') ||
  'unknown';

export async function POST(request: Request) {
  const limit = await consumeStoredRateLimit(getClientIp(request), new Date(), AUTH_RATE_LIMITS.register);

  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, message: 'Thao tác quá nhanh. Vui lòng thử lại sau.' },
      { status: 429 }
    );
  }

  const parsedBody = await parseRegisterRequestBody(request);

  if (!parsedBody.ok) {
    return NextResponse.json({ ok: false, message: parsedBody.message }, { status: 400 });
  }

  const body = parsedBody.data;

  const result = await registerStaffAccount(
    {
      email: body.email,
      name: body.name,
      password: body.password,
    },
    { repository: prismaAuthRepository }
  );

  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
