import { z } from 'zod';
import { normalizeEmail } from '@/lib/auth/auth-roles';

const registerRequestSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(1),
  password: z.string().min(8),
});

export type RegisterRequestBody = z.infer<typeof registerRequestSchema>;

export type ParsedRegisterRequest =
  | { ok: true; data: RegisterRequestBody }
  | { ok: false; message: string };

export const parseRegisterRequestBody = async (request: Request): Promise<ParsedRegisterRequest> => {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return { ok: false, message: 'Thông tin đăng ký không hợp lệ.' };
  }

  const parsed = registerRequestSchema.safeParse(body);

  if (!parsed.success) {
    return { ok: false, message: 'Thông tin đăng ký không hợp lệ.' };
  }

  return {
    ok: true,
    data: {
      ...parsed.data,
      email: normalizeEmail(parsed.data.email),
      name: parsed.data.name.trim(),
    },
  };
};
