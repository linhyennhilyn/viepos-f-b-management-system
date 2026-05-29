import {
  allow,
  deny,
  isRootAdmin,
  type AppRole,
  type AppUserProfilePolicy,
  type PolicyResult,
} from './auth-roles';

export const assertActiveActor = (actor: AppUserProfilePolicy): PolicyResult =>
  actor.status === 'ACTIVE' ? allow() : deny();

export const assertMutableTarget = (target: AppUserProfilePolicy): PolicyResult =>
  isRootAdmin(target) ? deny('Tài khoản root không thể bị thay đổi.') : allow();

export const assertCanApproveAccount = (
  actor: AppUserProfilePolicy,
  target: AppUserProfilePolicy
): PolicyResult => {
  if (!assertActiveActor(actor).ok || !assertMutableTarget(target).ok) {
    return deny();
  }

  if (target.role !== 'STAFF' || target.status !== 'PENDING') {
    return deny();
  }

  return actor.role === 'ROOT_ADMIN' || actor.role === 'ADMIN' ? allow() : deny();
};

export const assertCanUpdateRole = (
  actor: AppUserProfilePolicy,
  target: AppUserProfilePolicy,
  nextRole: AppRole
): PolicyResult => {
  if (!assertActiveActor(actor).ok || !assertMutableTarget(target).ok) {
    return deny();
  }

  if (actor.role !== 'ROOT_ADMIN' || nextRole === 'ROOT_ADMIN') {
    return deny();
  }

  if (target.status !== 'ACTIVE') {
    return deny();
  }

  return nextRole === 'ADMIN' || nextRole === 'STAFF' ? allow() : deny();
};

export const assertCanDisableAccount = (
  actor: AppUserProfilePolicy,
  target: AppUserProfilePolicy
): PolicyResult => {
  if (!assertActiveActor(actor).ok || !assertMutableTarget(target).ok) {
    return deny();
  }

  if (actor.role === 'ROOT_ADMIN' && (target.role === 'ADMIN' || target.role === 'STAFF')) {
    return allow();
  }

  if (actor.role === 'ADMIN' && target.role === 'STAFF') {
    return allow();
  }

  return deny();
};
