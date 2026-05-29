import { NextResponse } from 'next/server';
import { auth } from '@/server/auth/better-auth';

export async function POST(request: Request) {
  const signOutResponse = await auth.api.signOut({
    headers: request.headers,
    asResponse: true,
  });
  const response = NextResponse.json({ ok: true });

  signOutResponse.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      response.headers.append('set-cookie', value);
    }
  });

  return response;
}
