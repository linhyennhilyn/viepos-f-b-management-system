import { z } from 'zod';
import { normalizeEmail } from '@/lib/auth/auth-roles';

const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
});

export type LoginRequestBody = z.infer<typeof loginRequestSchema>;

export type ParsedLoginRequest =
  | { ok: true; data: LoginRequestBody }
  | { ok: false; message: string };

export const parseLoginRequestBody = async (request: Request): Promise<ParsedLoginRequest> => {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return { ok: false, message: 'Thông tin đăng nhập không hợp lệ.' };
  }

  const parsed = loginRequestSchema.safeParse(body);

  if (!parsed.success) {
    return { ok: false, message: 'Thông tin đăng nhập không hợp lệ.' };
  }

  return {
    ok: true,
    data: {
      ...parsed.data,
      email: normalizeEmail(parsed.data.email),
    },
  };
};
