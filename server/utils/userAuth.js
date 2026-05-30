import { db } from "../db.js";

const USER_SELECT_FIELDS =
  "id, name, email, role, displayBgColor, displayTextColor, sidebarBgColor, themeHeaderBg, themeCardBg, themeBorder, themeTextPrimary, themeTextSecondary, themeSidebarNavText, totpEnabled, isSuspended";

export function getUserPermissionsForRole(roleName) {
  let permissions = { sections: [], actions: {} };
  let roleUpdatedAt = null;
  if (!roleName) return { permissions, roleUpdatedAt };

  const roleRow = db
    .prepare("SELECT permissions, updatedAt FROM roles WHERE name = ?;")
    .get(roleName);
  if (roleRow) {
    if (roleRow.permissions) {
      try {
        permissions = JSON.parse(roleRow.permissions);
      } catch {
        // keep defaults
      }
    }
    roleUpdatedAt = roleRow.updatedAt || null;
  }
  return { permissions, roleUpdatedAt };
}

export function buildAuthUser(userRow) {
  const { permissions, roleUpdatedAt } = getUserPermissionsForRole(userRow.role);
  const { password: _pw, totpSecret: _ts, totpPendingSecret: _tps, ...safeUser } = userRow;
  return {
    ...safeUser,
    totpEnabled: Boolean(userRow.totpEnabled),
    permissions,
    roleUpdatedAt,
  };
}

export function getUserById(userId) {
  return db.prepare(`SELECT ${USER_SELECT_FIELDS}, password, totpSecret, totpPendingSecret FROM users WHERE id = ?;`).get(userId);
}

export function getUserByEmail(email) {
  return db.prepare("SELECT * FROM users WHERE email = ?;").get(email);
}

export function getUserByEmailIgnoreCase(email) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return undefined;
  return db.prepare("SELECT * FROM users WHERE lower(email) = ?;").get(normalized);
}

export function isEmailTakenByOtherUser(email, excludeUserId) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return false;
  const row = db.prepare("SELECT id FROM users WHERE lower(email) = ?;").get(normalized);
  return Boolean(row && row.id !== excludeUserId);
}
