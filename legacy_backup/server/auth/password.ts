import { hashPassword as hashBetterAuthPassword, verifyPassword } from 'better-auth/crypto';

export const hashPassword = (password: string): Promise<string> => hashBetterAuthPassword(password);

export const verifyStoredPassword = (
  password: string,
  encoded: string | null | undefined
): Promise<boolean> => {
  if (!encoded) {
    return Promise.resolve(false);
  }

  return verifyPassword({ hash: encoded, password });
};
