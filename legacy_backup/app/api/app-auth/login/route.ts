import { NextResponse } from 'next/server';
import { auth } from '@/server/auth/better-auth';
import { findUserForLogin, isPasswordValidForUser } from '@/server/auth/auth-repository';
import { AUTH_RATE_LIMITS, canCreateSessionForUser, getPostLoginRedirect } from '@/server/auth/login-policy';
import { parseLoginRequestBody } from '@/server/auth/login-request';
import { consumeStoredRateLimit, resetStoredRateLimit } from '@/server/auth/rate-limit-store';

const getClientIp = (request: Request): string =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
  request.headers.get('x-real-ip') ||
  'unknown';

const genericError = NextResponse.json(
  { ok: false, message: 'Email hoặc mật khẩu không đúng.' },
  { status: 401 }
);

export async function POST(request: Request) {
  const parsedBody = await parseLoginRequestBody(request);

  if (!parsedBody.ok) {
    return NextResponse.json({ ok: false, message: parsedBody.message }, { status: 400 });
  }

  const body = parsedBody.data;
  const email = body.email;
  const limiterKey = `${email}:${getClientIp(request)}`;
  const limit = await consumeStoredRateLimit(limiterKey, new Date(), AUTH_RATE_LIMITS.login);

  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, message: 'Đăng nhập quá nhiều lần. Vui lòng thử lại sau.' },
      { status: 429 }
    );
  }

  const user = await findUserForLogin(email);

  if (!user || !user.appProfile) {
    return genericError;
  }

  const credentialAccount = user.accounts[0];
  const passwordValid = await isPasswordValidForUser(
    body.password,
    credentialAccount?.password ?? user.password
  );

  if (!passwordValid) {
    return genericError;
  }

  const policy = canCreateSessionForUser(user.appProfile);

  if (!policy.ok) {
    return NextResponse.json(
      { ok: false, message: 'Tài khoản đang chờ duyệt hoặc đã bị khóa.' },
      { status: 403 }
    );
  }

  const signInResponse = await auth.api.signInEmail({
    body: {
      email,
      password: body.password,
      rememberMe: body.rememberMe ?? true,
    },
    headers: request.headers,
    asResponse: true,
  });

  if (!signInResponse.ok) {
    return genericError;
  }

  await resetStoredRateLimit(limiterKey);

  const response = NextResponse.json({ ok: true, redirectTo: getPostLoginRedirect(user.appProfile) });

  signInResponse.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      response.headers.append('set-cookie', value);
    }
  });

  return response;
}
