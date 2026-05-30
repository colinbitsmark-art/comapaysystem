import { db } from "../db.js";
import { extractBearerToken, verifyToken } from "../utils/tokens.js";
import { getUserPermissionsForRole } from "../utils/userAuth.js";

function resolveUserIdFromToken(token) {
  const payload = verifyToken(token);
  if (!payload?.sub || payload.type !== "access") {
    return null;
  }
  const userId = parseInt(String(payload.sub), 10);
  if (!Number.isFinite(userId) || userId <= 0) return null;
  return userId;
}

export function authenticate(req, res, next) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const userId = resolveUserIdFromToken(token);
    if (!userId) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const user = db.prepare("SELECT id, email, role FROM users WHERE id = ?;").get(userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.userId = userId;
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

/** For SSE endpoints that pass token via query string. */
export function authenticateSse(req, res, next) {
  return authenticate(req, res, next);
}

export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

export function requireAction(actionKey) {
  return (req, res, next) => {
    if (!req.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const user = db.prepare("SELECT role FROM users WHERE id = ?;").get(req.userId);
    if (!user?.role) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const { permissions } = getUserPermissionsForRole(user.role);
    if (!permissions?.actions?.[actionKey]) {
      return res.status(403).json({ message: "You do not have permission for this action" });
    }
    next();
  };
}

/** Allow internal cron jobs (e.g. wallet auto-refresh) when INTERNAL_CRON_SECRET is set. */
export function authenticateOrInternalCron(req, res, next) {
  const secret = process.env.INTERNAL_CRON_SECRET;
  const provided = req.headers["x-internal-cron-secret"];
  if (secret && provided === secret) {
    req.userId = null;
    req.isInternalCron = true;
    return next();
  }
  return authenticate(req, res, next);
}
