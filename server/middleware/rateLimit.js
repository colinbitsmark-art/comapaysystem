import rateLimit from "express-rate-limit";

const LOCKOUT_MINUTES = 15;

export const loginRateLimiter = rateLimit({
  windowMs: LOCKOUT_MINUTES * 60 * 1000,
  max: 6,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      message: `Too many login attempts. Please try again in ${LOCKOUT_MINUTES} minutes.`,
      code: "ACCOUNT_LOCKED",
      attemptsRemaining: 0,
      retryAfterMinutes: LOCKOUT_MINUTES,
    });
  },
});

export const twoFactorRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many verification attempts. Please try again later." },
});

export const forgotPasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many reset requests. Please try again later." },
});

export const resetPasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many reset attempts. Please try again later." },
});
