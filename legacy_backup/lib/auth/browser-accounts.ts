'use client';

import type { LoginResult } from './types';
import type { RegisteredAccount } from './account-registration';
import { DEMO_USERS, validateLogin } from './demo-auth';
import { normalizeEmail } from './account-registration';

const ACCOUNTS_STORAGE_KEY = 'viepos.registered-accounts';

const readRegisteredAccounts = (): RegisteredAccount[] => {
  const rawAccounts = window.localStorage.getItem(ACCOUNTS_STORAGE_KEY);

  if (!rawAccounts) {
    return [];
  }

  try {
    return JSON.parse(rawAccounts) as RegisteredAccount[];
  } catch {
    window.localStorage.removeItem(ACCOUNTS_STORAGE_KEY);
    return [];
  }
};

export const saveRegisteredAccount = (account: RegisteredAccount): void => {
  const accounts = readRegisteredAccounts().filter(
    (candidate) => candidate.email !== account.email
  );
  window.localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify([...accounts, account]));
};

export const accountExists = (email: string): boolean => {
  const normalizedEmail = normalizeEmail(email);
  return (
    DEMO_USERS.some((user) => user.email === normalizedEmail) ||
    readRegisteredAccounts().some((account) => account.email === normalizedEmail)
  );
};

export const validateBrowserLogin = (
  email: string,
  secret: string,
  rememberDevice: boolean
): LoginResult => {
  const normalizedEmail = normalizeEmail(email);
  const registeredAccount = readRegisteredAccounts().find(
    (account) => account.email === normalizedEmail
  );

  if (!registeredAccount) {
    return validateLogin({ email, secret, role: 'manager', rememberDevice });
  }

  if (registeredAccount.password !== secret) {
    return { ok: false, message: 'Mật khẩu không đúng.' };
  }

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + (rememberDevice ? 24 * 7 : 8));

  return {
    ok: true,
    session: {
      email: registeredAccount.email,
      displayName: registeredAccount.displayName,
      role: 'manager',
      expiresAt: expiresAt.toISOString(),
      rememberedDevice: rememberDevice,
    },
  };
};
