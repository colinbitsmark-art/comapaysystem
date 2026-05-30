import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "../db.js";

const PURPOSE = "password_reset";
const TTL_MS = 15 * 60 * 1000;

export function createPasswordResetToken(userId) {
  db.prepare(
    `UPDATE auth_email_tokens
     SET usedAt = CURRENT_TIMESTAMP
     WHERE userId = @userId AND purpose = @purpose AND usedAt IS NULL;`,
  ).run({ userId, purpose: PURPOSE });

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  const codeHash = bcrypt.hashSync(code, 10);
  const expiresAt = new Date(Date.now() + TTL_MS).toISOString();

  db.prepare(
    `INSERT INTO auth_email_tokens (userId, purpose, codeHash, expiresAt)
     VALUES (@userId, @purpose, @codeHash, @expiresAt);`,
  ).run({ userId, purpose: PURPOSE, codeHash, expiresAt });

  return { code, expiresMinutes: TTL_MS / 60_000 };
}

export function verifyPasswordResetCode(userId, code) {
  const normalized = String(code || "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) {
    return null;
  }

  const row = db
    .prepare(
      `SELECT id, codeHash FROM auth_email_tokens
       WHERE userId = @userId AND purpose = @purpose AND usedAt IS NULL
         AND expiresAt > @now
       ORDER BY id DESC LIMIT 1;`,
    )
    .get({ userId, purpose: PURPOSE, now: new Date().toISOString() });

  if (!row || !bcrypt.compareSync(normalized, row.codeHash)) {
    return null;
  }

  return { tokenId: row.id };
}

export function markPasswordResetTokenUsed(tokenId) {
  db.prepare("UPDATE auth_email_tokens SET usedAt = CURRENT_TIMESTAMP WHERE id = ?;").run(tokenId);
}
