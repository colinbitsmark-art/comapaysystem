import bcrypt from "bcryptjs";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { db } from "../db.js";
import {
  buildAuthUser,
  getUserByEmail,
  getUserByEmailIgnoreCase,
  getUserById,
  isEmailTakenByOtherUser,
} from "../utils/userAuth.js";
import {
  signAccessToken,
  signPending2FAToken,
  verifyToken,
  setAuthCookie,
  clearAuthCookie,
} from "../utils/tokens.js";
import {
  getLockoutStatus,
  recordFailedLogin,
  clearLoginLockout,
} from "../utils/loginLockout.js";
import {
  createPasswordResetToken,
  verifyPasswordResetCode,
  markPasswordResetTokenUsed,
} from "../utils/passwordResetTokens.js";
import { sendPasswordResetEmail } from "../services/email/sendPasswordResetEmail.js";
import { getAppDisplayName } from "../utils/appBranding.js";

const FORGOT_PASSWORD_MESSAGE =
  "If an account exists for that email, we sent a reset code.";

function sendAuthSuccess(res, userRow) {
  clearLoginLockout(userRow.id);
  const token = signAccessToken(userRow.id);
  setAuthCookie(res, token);
  const user = buildAuthUser(userRow);
  res.json({ ...user, token });
}

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = getUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
      });
    }

    const lockout = getLockoutStatus(user);
    if (lockout?.blocked) {
      return res.status(lockout.code === "ACCOUNT_SUSPENDED" ? 403 : 429).json({
        message: lockout.message,
        code: lockout.code,
        attemptsRemaining: 0,
        retryAfterMinutes: lockout.retryAfterMinutes,
      });
    }

    if (!user.password) {
      return res.status(401).json({
        message: "Account has no password set. Ask an administrator to reset your password.",
        code: "NO_PASSWORD",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const failure = recordFailedLogin(user);
      return res.status(failure.status).json({
        message: failure.message,
        code: failure.code,
        attemptsRemaining: failure.attemptsRemaining,
        retryAfterMinutes: failure.retryAfterMinutes,
      });
    }

    if (user.totpEnabled && user.totpSecret) {
      clearLoginLockout(user.id);
      const pendingToken = signPending2FAToken(user.id);
      return res.json({
        requiresTwoFactor: true,
        pendingToken,
        email: user.email,
      });
    }

    sendAuthSuccess(res, user);
  } catch (error) {
    next(error);
  }
};

export const verify2fa = async (req, res, next) => {
  try {
    const { pendingToken, code } = req.body || {};
    if (!pendingToken || !code) {
      return res.status(400).json({ message: "Verification code is required" });
    }

    let payload;
    try {
      payload = verifyToken(pendingToken);
    } catch {
      return res.status(401).json({ message: "Session expired. Please log in again." });
    }

    if (payload.type !== "2fa_pending" || !payload.sub) {
      return res.status(401).json({ message: "Invalid session. Please log in again." });
    }

    const userId = parseInt(String(payload.sub), 10);
    const user = getUserById(userId);
    if (!user || !user.totpEnabled || !user.totpSecret) {
      return res.status(401).json({ message: "Two-factor authentication is not enabled for this account" });
    }

    if (user.isSuspended) {
      return res.status(403).json({
        message: "This account has been suspended. Please contact an administrator.",
        code: "ACCOUNT_SUSPENDED",
        attemptsRemaining: 0,
      });
    }

    const verified = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: "base32",
      token: String(code).replace(/\s/g, ""),
      window: 1,
    });

    if (!verified) {
      return res.status(401).json({ message: "Invalid verification code" });
    }

    sendAuthSuccess(res, user);
  } catch (error) {
    next(error);
  }
};

export const me = (req, res, next) => {
  try {
    const user = getUserById(req.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    res.json(buildAuthUser(user));
  } catch (error) {
    next(error);
  }
};

export const logout = (_req, res) => {
  clearAuthCookie(res);
  res.json({ success: true });
};

export const get2faStatus = (req, res, next) => {
  try {
    const user = getUserById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ enabled: Boolean(user.totpEnabled) });
  } catch (error) {
    next(error);
  }
};

export const setup2fa = async (req, res, next) => {
  try {
    const user = getUserById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.totpEnabled) {
      return res.status(400).json({ message: "Two-factor authentication is already enabled" });
    }

    const secret = speakeasy.generateSecret({
      name: `${getAppDisplayName()} (${user.email})`,
      length: 20,
    });

    db.prepare("UPDATE users SET totpPendingSecret = ? WHERE id = ?;").run(
      secret.base32,
      user.id,
    );

    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      qrCodeDataUrl,
      manualEntryKey: secret.base32,
    });
  } catch (error) {
    next(error);
  }
};

export const enable2fa = (req, res, next) => {
  try {
    const { code } = req.body || {};
    if (!code) {
      return res.status(400).json({ message: "Verification code is required" });
    }

    const user = getUserById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.totpEnabled) {
      return res.status(400).json({ message: "Two-factor authentication is already enabled" });
    }
    if (!user.totpPendingSecret) {
      return res.status(400).json({ message: "Run setup first before enabling 2FA" });
    }

    const verified = speakeasy.totp.verify({
      secret: user.totpPendingSecret,
      encoding: "base32",
      token: String(code).replace(/\s/g, ""),
      window: 1,
    });

    if (!verified) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    db.prepare(
      "UPDATE users SET totpSecret = ?, totpPendingSecret = NULL, totpEnabled = 1 WHERE id = ?;",
    ).run(user.totpPendingSecret, user.id);

    res.json({ success: true, enabled: true });
  } catch (error) {
    next(error);
  }
};

export const disable2fa = async (req, res, next) => {
  try {
    const { code, password } = req.body || {};
    if (!code || !password) {
      return res.status(400).json({ message: "Password and verification code are required" });
    }

    const user = getUserById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (!user.totpEnabled || !user.totpSecret) {
      return res.status(400).json({ message: "Two-factor authentication is not enabled" });
    }

    const passwordOk = await bcrypt.compare(password, user.password);
    if (!passwordOk) {
      return res.status(401).json({ message: "Invalid password" });
    }

    const verified = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: "base32",
      token: String(code).replace(/\s/g, ""),
      window: 1,
    });

    if (!verified) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    db.prepare(
      "UPDATE users SET totpSecret = NULL, totpPendingSecret = NULL, totpEnabled = 0 WHERE id = ?;",
    ).run(user.id);

    res.json({ success: true, enabled: false });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, code } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required" });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters" });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ message: "New password must be different from the current password" });
    }

    const user = getUserById(req.userId);
    if (!user?.password) {
      return res.status(400).json({ message: "Cannot change password for this account" });
    }

    const passwordOk = await bcrypt.compare(currentPassword, user.password);
    if (!passwordOk) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    if (user.totpEnabled && user.totpSecret) {
      if (!code) {
        return res.status(400).json({ message: "Authenticator code is required" });
      }
      const verified = speakeasy.totp.verify({
        secret: user.totpSecret,
        encoding: "base32",
        token: String(code).replace(/\s/g, ""),
        window: 1,
      });
      if (!verified) {
        return res.status(401).json({ message: "Invalid verification code" });
      }
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    db.prepare("UPDATE users SET password = ? WHERE id = ?;").run(hashed, user.id);
    res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim();
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = getUserByEmailIgnoreCase(email);
    if (user) {
      const { code, expiresMinutes } = createPasswordResetToken(user.id);
      try {
        await sendPasswordResetEmail({
          to: user.email,
          code,
          expiresMinutes,
        });
      } catch (err) {
        console.error("[auth] Failed to send password reset email:", err);
      }
    }

    res.json({ success: true, message: FORGOT_PASSWORD_MESSAGE });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim();
    const code = req.body?.code;
    const newPassword = req.body?.newPassword;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: "Email, code, and new password are required" });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters" });
    }

    const user = getUserByEmailIgnoreCase(email);
    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset code" });
    }

    const verified = verifyPasswordResetCode(user.id, code);
    if (!verified) {
      return res.status(400).json({ message: "Invalid or expired reset code" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    db.prepare("UPDATE users SET password = ? WHERE id = ?;").run(hashed, user.id);
    markPasswordResetTokenUsed(verified.tokenId);
    clearLoginLockout(user.id);

    res.json({ success: true, message: "Password reset successfully. You can sign in with your new password." });
  } catch (error) {
    next(error);
  }
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const changeEmail = async (req, res, next) => {
  try {
    const { newEmail, password, code } = req.body || {};
    const trimmedEmail = String(newEmail || "").trim();

    if (!trimmedEmail || !password) {
      return res.status(400).json({ message: "New email and password are required" });
    }
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }

    const user = getUserById(req.userId);
    if (!user?.password) {
      return res.status(400).json({ message: "Cannot change email for this account" });
    }

    if (trimmedEmail.toLowerCase() === String(user.email || "").trim().toLowerCase()) {
      return res.status(400).json({ message: "New email must be different from your current email" });
    }

    const passwordOk = await bcrypt.compare(password, user.password);
    if (!passwordOk) {
      return res.status(401).json({ message: "Password is incorrect" });
    }

    if (user.totpEnabled && user.totpSecret) {
      if (!code) {
        return res.status(400).json({ message: "Authenticator code is required" });
      }
      const verified = speakeasy.totp.verify({
        secret: user.totpSecret,
        encoding: "base32",
        token: String(code).replace(/\s/g, ""),
        window: 1,
      });
      if (!verified) {
        return res.status(401).json({ message: "Invalid verification code" });
      }
    }

    if (isEmailTakenByOtherUser(trimmedEmail, user.id)) {
      return res.status(409).json({ message: "That email is already in use" });
    }

    db.prepare("UPDATE users SET email = ? WHERE id = ?;").run(trimmedEmail, user.id);

    res.json({
      success: true,
      email: trimmedEmail,
      message: "Email updated successfully",
    });
  } catch (error) {
    next(error);
  }
};
