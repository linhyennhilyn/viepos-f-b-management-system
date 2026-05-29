'use client';

import type { LoginSession } from './types';

const SESSION_STORAGE_KEY = 'viepos.session';

export const saveSession = (session: LoginSession): void => {
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
};

export const readSession = (): LoginSession | null => {
  const rawSession = window.localStorage.getItem(SESSION_STORAGE_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    const session = JSON.parse(rawSession) as LoginSession;
    const isExpired = new Date(session.expiresAt).getTime() <= Date.now();

    if (isExpired) {
      clearSession();
      return null;
    }

    return session;
  } catch {
    clearSession();
    return null;
  }
};

export const clearSession = (): void => {
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
};
