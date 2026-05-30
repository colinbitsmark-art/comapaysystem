import jwt from "jsonwebtoken";

const ACCESS_TOKEN_TTL = process.env.JWT_ACCESS_TTL || "8h";
const PENDING_2FA_TTL = "5m";

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET environment variable is required in production");
  }
  console.warn("[auth] JWT_SECRET not set — using insecure development default");
  return "dev-insecure-jwt-secret-change-me";
}

export function signAccessToken(userId) {
  return jwt.sign({ sub: userId, type: "access" }, getJwtSecret(), {
    expiresIn: ACCESS_TOKEN_TTL,
  });
}

export function signPending2FAToken(userId) {
  return jwt.sign({ sub: userId, type: "2fa_pending" }, getJwtSecret(), {
    expiresIn: PENDING_2FA_TTL,
  });
}

export function verifyToken(token) {
  return jwt.verify(token, getJwtSecret());
}

export function extractBearerToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }
  if (req.cookies?.auth_token) {
    return req.cookies.auth_token;
  }
  if (req.query?.token && typeof req.query.token === "string") {
    return req.query.token;
  }
  return null;
}

export function setAuthCookie(res, token) {
  res.cookie("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 8 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearAuthCookie(res) {
  res.clearCookie("auth_token", { path: "/" });
}
