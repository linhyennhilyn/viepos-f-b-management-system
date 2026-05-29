const BLOCKED_DIRECT_CREDENTIAL_PATHS = new Set(['/api/auth/sign-up/email', '/api/auth/sign-in/email']);

export const shouldBlockDirectBetterAuthRoute = (request: Request): boolean => {
  const { pathname } = new URL(request.url);

  return BLOCKED_DIRECT_CREDENTIAL_PATHS.has(pathname);
};
