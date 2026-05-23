import { db } from "../db.js";
import { getUserIdFromHeader } from "./auth.js";

const getRolePermissions = (req) => {
  const userId = getUserIdFromHeader(req);
  if (!userId) return null;

  const user = db.prepare("SELECT role FROM users WHERE id = ?").get(userId);
  if (!user?.role) return null;

  const roleRow = db.prepare("SELECT permissions FROM roles WHERE name = ?").get(user.role);
  if (!roleRow?.permissions) return null;

  try {
    return JSON.parse(roleRow.permissions);
  } catch {
    return null;
  }
};

export const userCanDisplayReferenceRatesPanel = (req) => {
  const permissions = getRolePermissions(req);
  return Boolean(permissions?.actions?.displayReferenceRatesPanel);
};

export const userCanEditReferenceRates = (req) => {
  const permissions = getRolePermissions(req);
  return Boolean(permissions?.actions?.editReferenceRates);
};
