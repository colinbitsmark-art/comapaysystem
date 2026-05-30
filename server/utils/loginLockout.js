import { db } from "../db.js";

export const MAX_LOGIN_ATTEMPTS = 6;
export const LOCKOUT_MINUTES = 15;
export const LOCKOUT_MS = LOCKOUT_MINUTES * 60 * 1000;

export function clearLoginLockout(userId) {
  db.prepare(
    `UPDATE users SET
      failedLoginAttempts = 0,
      loginLockPhase = 0,
      loginLockedUntil = NULL
     WHERE id = ?;`,
  ).run(userId);
}

export function getLockoutStatus(user) {
  if (!user) return null;

  if (user.isSuspended) {
    return {
      blocked: true,
      code: "ACCOUNT_SUSPENDED",
      message: "This account has been suspended. Please contact an administrator.",
      attemptsRemaining: 0,
    };
  }

  if (user.loginLockedUntil) {
    const lockedUntil = new Date(user.loginLockedUntil).getTime();
    const now = Date.now();
    if (now < lockedUntil) {
      const retryAfterMinutes = Math.max(1, Math.ceil((lockedUntil - now) / 60000));
      return {
        blocked: true,
        code: "ACCOUNT_LOCKED",
        message: `Too many failed login attempts. Please try again in ${retryAfterMinutes} minute(s).`,
        attemptsRemaining: 0,
        retryAfterMinutes,
      };
    }
  }

  return {
    blocked: false,
    attemptsRemaining: Math.max(0, MAX_LOGIN_ATTEMPTS - (user.failedLoginAttempts || 0)),
    loginLockPhase: user.loginLockPhase || 0,
  };
}

export function recordFailedLogin(user) {
  const attempts = (user.failedLoginAttempts || 0) + 1;
  const phase = user.loginLockPhase || 0;
  const remainingAfter = Math.max(0, MAX_LOGIN_ATTEMPTS - attempts);

  if (attempts >= MAX_LOGIN_ATTEMPTS) {
    if (phase === 0) {
      const lockedUntil = new Date(Date.now() + LOCKOUT_MS).toISOString();
      db.prepare(
        `UPDATE users SET
          failedLoginAttempts = 0,
          loginLockPhase = 1,
          loginLockedUntil = ?
         WHERE id = ?;`,
      ).run(lockedUntil, user.id);

      return {
        code: "ACCOUNT_LOCKED",
        message: `Too many failed login attempts. Please try again in ${LOCKOUT_MINUTES} minutes.`,
        attemptsRemaining: 0,
        retryAfterMinutes: LOCKOUT_MINUTES,
        status: 429,
      };
    }

    db.prepare(
      `UPDATE users SET
        isSuspended = 1,
        failedLoginAttempts = 0,
        loginLockPhase = 0,
        loginLockedUntil = NULL
       WHERE id = ?;`,
    ).run(user.id);

    return {
      code: "ACCOUNT_SUSPENDED",
      message: "This account has been suspended due to too many failed login attempts. Please contact an administrator.",
      attemptsRemaining: 0,
      status: 403,
    };
  }

  db.prepare("UPDATE users SET failedLoginAttempts = ? WHERE id = ?;").run(attempts, user.id);

  return {
    code: "INVALID_CREDENTIALS",
    message: "Invalid credentials",
    attemptsRemaining: remainingAfter,
    status: 401,
  };
}
