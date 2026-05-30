import bcrypt from "bcryptjs";
import { db } from "../db.js";

const USER_SELECT_FIELDS = "id, name, email, role, displayBgColor, displayTextColor, sidebarBgColor, themeHeaderBg, themeCardBg, themeBorder, themeTextPrimary, themeTextSecondary, themeSidebarNavText, isSuspended";

const UPDATABLE_USER_FIELDS = new Set([
  "name",
  "email",
  "role",
  "password",
  "displayBgColor",
  "displayTextColor",
  "sidebarBgColor",
  "themeHeaderBg",
  "themeCardBg",
  "themeBorder",
  "themeTextPrimary",
  "themeTextSecondary",
  "themeSidebarNavText",
  "isSuspended",
]);

export const listUsers = (_req, res) => {
  const rows = db.prepare(`SELECT ${USER_SELECT_FIELDS} FROM users ORDER BY name ASC;`).all();
  res.json(rows);
};

export const createUser = (req, res, next) => {
  try {
    const payload = req.body || {};
    const data = { ...payload };
    if (data.password) {
      data.password = bcrypt.hashSync(data.password, 10);
    } else {
      data.password = null;
    }
    const stmt = db.prepare(
      `INSERT INTO users (name, email, password, role) VALUES (@name, @email, @password, @role);`,
    );
    const result = stmt.run(data);
    const row = db.prepare(`SELECT ${USER_SELECT_FIELDS} FROM users WHERE id = ?;`).get(result.lastInsertRowid);
    res.status(201).json(row);
  } catch (error) {
    next(error);
  }
};

export const updateUser = (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};
    const fields = Object.keys(updates).filter((field) => UPDATABLE_USER_FIELDS.has(field));
    if (!fields.length) {
      return res.status(400).json({ message: "No valid updates provided" });
    }
    const normalized = {};
    for (const field of fields) {
      normalized[field] = updates[field];
    }
    if (normalized.password !== undefined) {
      normalized.password = normalized.password ? bcrypt.hashSync(normalized.password, 10) : null;
    }
    if (normalized.isSuspended === false || normalized.isSuspended === 0) {
      normalized.isSuspended = 0;
    } else if (normalized.isSuspended === true || normalized.isSuspended === 1) {
      normalized.isSuspended = 1;
    }
    const assignments = fields.map((field) => `${field} = @${field}`).join(", ");
    db.prepare(`UPDATE users SET ${assignments} WHERE id = @id;`).run({
      ...normalized,
      id,
    });
    if (normalized.isSuspended === 0) {
      db.prepare(
        `UPDATE users SET failedLoginAttempts = 0, loginLockPhase = 0, loginLockedUntil = NULL WHERE id = ?;`,
      ).run(id);
    }
    const row = db.prepare(`SELECT ${USER_SELECT_FIELDS} FROM users WHERE id = ?;`).get(id);
    res.json(row);
  } catch (error) {
    next(error);
  }
};

export const updateUserPreferences = (req, res, next) => {
  try {
    const { id } = req.params;
    if (String(req.userId) !== String(id)) {
      return res.status(403).json({ message: "You can only update your own preferences" });
    }
    const { sidebarBgColor, displayBgColor, themeHeaderBg, themeCardBg, themeBorder, themeTextPrimary, themeTextSecondary, themeSidebarNavText } = req.body || {};
    db.prepare(
      "UPDATE users SET sidebarBgColor = @sidebarBgColor, displayBgColor = @displayBgColor, themeHeaderBg = @themeHeaderBg, themeCardBg = @themeCardBg, themeBorder = @themeBorder, themeTextPrimary = @themeTextPrimary, themeTextSecondary = @themeTextSecondary, themeSidebarNavText = @themeSidebarNavText WHERE id = @id;"
    ).run({ sidebarBgColor: sidebarBgColor ?? null, displayBgColor: displayBgColor ?? null, themeHeaderBg: themeHeaderBg ?? null, themeCardBg: themeCardBg ?? null, themeBorder: themeBorder ?? null, themeTextPrimary: themeTextPrimary ?? null, themeTextSecondary: themeTextSecondary ?? null, themeSidebarNavText: themeSidebarNavText ?? null, id });
    const row = db
      .prepare(`SELECT ${USER_SELECT_FIELDS} FROM users WHERE id = ?;`)
      .get(id);
    res.json(row);
  } catch (error) {
    next(error);
  }
};

export const deleteUser = (req, res, next) => {
  try {
    const { id } = req.params;
    const { count } = db
      .prepare("SELECT COUNT(*) as count FROM orders WHERE handlerId = ?;")
      .get(id);
    if (count > 0) {
      return res
        .status(400)
        .json({ message: "Cannot delete user while they are assigned to existing orders." });
    }

    const stmt = db.prepare("DELETE FROM users WHERE id = ?;");
    const result = stmt.run(id);
    if (result.changes === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
