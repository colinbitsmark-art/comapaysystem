import bcrypt from "bcryptjs";
import { db } from "../db.js";

/**
 * Create the first admin user from env when the database has no users.
 * Set ADMIN_EMAIL and ADMIN_PASSWORD before first deploy.
 */
export function ensureBootstrapAdmin() {
  const { count } = db.prepare("SELECT COUNT(*) as count FROM users;").get();
  if (count > 0) return;

  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "Admin";

  if (!email || !password) {
    console.warn(
      "[auth] No users in database. Set ADMIN_EMAIL and ADMIN_PASSWORD to create the initial admin account.",
    );
    return;
  }

  const hashed = bcrypt.hashSync(password, 10);
  db.prepare(
    `INSERT INTO users (name, email, password, role) VALUES (@name, @email, @password, @role);`,
  ).run({ name, email, password: hashed, role: "admin" });
  console.log(`[auth] Created bootstrap admin user: ${email}`);
}
