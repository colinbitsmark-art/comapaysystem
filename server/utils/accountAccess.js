import { db } from "../db.js";

export const ACCOUNT_ACCESS_SCOPES = [
  "account.view",
  "expense.account",
  "transfer.account",
  "order.account",
  "profit.account",
  "serviceCharge.account",
];

const LEGACY_SCOPE_ALIASES = {
  "transfer.from": "transfer.account",
  "transfer.to": "transfer.account",
  "order.buy": "order.account",
  "order.sell": "order.account",
  "order.receipt": "order.account",
  "order.payment": "order.account",
};

const LEGACY_SCOPES_BY_SCOPE = {
  "transfer.account": ["transfer.from", "transfer.to"],
  "order.account": ["order.buy", "order.sell", "order.receipt", "order.payment"],
};

const normalizeAccountIds = (accountIds) => {
  if (!Array.isArray(accountIds)) return [];
  return [
    ...new Set(
      accountIds
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ];
};

export function getAccountAccessForRole(roleId) {
  if (!roleId) return {};

  const settings = db
    .prepare("SELECT scope, accessMode FROM role_account_scope_settings WHERE roleId = ?;")
    .all(roleId);
  const selectedAccounts = db
    .prepare("SELECT scope, accountId FROM role_account_access WHERE roleId = ?;")
    .all(roleId);

  const access = {};
  const legacySelectedIdsByScope = {};

  for (const setting of settings) {
    const normalizedScope = LEGACY_SCOPE_ALIASES[setting.scope] || setting.scope;
    access[setting.scope] = {
      mode: setting.accessMode === "selected" ? "selected" : "all",
      accountIds: [],
    };
    if (LEGACY_SCOPE_ALIASES[setting.scope] && setting.accessMode === "selected") {
      legacySelectedIdsByScope[normalizedScope] = legacySelectedIdsByScope[normalizedScope] || new Set();
    }
  }

  for (const row of selectedAccounts) {
    if (!access[row.scope]) {
      access[row.scope] = { mode: "selected", accountIds: [] };
    }
    access[row.scope].accountIds.push(row.accountId);

    const normalizedScope = LEGACY_SCOPE_ALIASES[row.scope];
    if (normalizedScope) {
      legacySelectedIdsByScope[normalizedScope] = legacySelectedIdsByScope[normalizedScope] || new Set();
      legacySelectedIdsByScope[normalizedScope].add(row.accountId);
    }
  }

  for (const [scope, accountIds] of Object.entries(legacySelectedIdsByScope)) {
    if (!access[scope] || access[scope].mode !== "selected") {
      access[scope] = { mode: "selected", accountIds: [] };
    }
    access[scope].accountIds = [
      ...new Set([...(access[scope].accountIds || []), ...accountIds]),
    ];
  }

  return access;
}

export function saveAccountAccessForRole(roleId, accountAccess = {}) {
  const deleteSettings = db.prepare("DELETE FROM role_account_scope_settings WHERE roleId = ?;");
  const deleteAccounts = db.prepare("DELETE FROM role_account_access WHERE roleId = ?;");
  const insertSetting = db.prepare(
    `INSERT INTO role_account_scope_settings (roleId, scope, accessMode)
     VALUES (?, ?, ?);`,
  );
  const insertAccount = db.prepare(
    `INSERT INTO role_account_access (roleId, scope, accountId)
     VALUES (?, ?, ?);`,
  );

  const transaction = db.transaction(() => {
    deleteSettings.run(roleId);
    deleteAccounts.run(roleId);

    for (const scope of ACCOUNT_ACCESS_SCOPES) {
      const config = accountAccess?.[scope];
      if (!config) continue;

      const mode = config.mode === "selected" ? "selected" : "all";
      insertSetting.run(roleId, scope, mode);

      if (mode === "selected") {
        for (const accountId of normalizeAccountIds(config.accountIds)) {
          insertAccount.run(roleId, scope, accountId);
        }
      }
    }
  });

  transaction();
}

export function getRoleAccountAccessByName(roleName) {
  if (!roleName) return null;

  const role = db.prepare("SELECT id FROM roles WHERE name = ?;").get(roleName);
  if (!role) return null;

  return getAccountAccessForRole(role.id);
}

export function getUserRole(userId) {
  if (!userId) return null;
  return db.prepare("SELECT role FROM users WHERE id = ?;").get(userId) || null;
}

export function isAccountAllowedForUser(userId, scope, accountId) {
  if (!userId || !scope || !accountId) return true;

  const user = getUserRole(userId);
  if (!user?.role) return false;

  const role = db.prepare("SELECT id FROM roles WHERE name = ?;").get(user.role);
  if (!role) return false;

  const setting = db
    .prepare("SELECT accessMode FROM role_account_scope_settings WHERE roleId = ? AND scope = ?;")
    .get(role.id, scope);

  // Backward compatible default: no explicit scope setting means unrestricted,
  // unless this scope replaces older selected scopes.
  if (!setting || setting.accessMode !== "selected") {
    const legacyScopes = LEGACY_SCOPES_BY_SCOPE[scope] || [];
    if (legacyScopes.length === 0) return true;

    const legacyPlaceholders = legacyScopes.map((_, index) => `@legacyScope${index}`).join(",");
    const legacyParams = legacyScopes.reduce((acc, legacyScope, index) => {
      acc[`legacyScope${index}`] = legacyScope;
      return acc;
    }, { roleId: role.id });
    const legacySelectedSettings = db
      .prepare(
        `SELECT scope FROM role_account_scope_settings
         WHERE roleId = @roleId AND accessMode = 'selected' AND scope IN (${legacyPlaceholders});`,
      )
      .all(legacyParams);

    if (legacySelectedSettings.length === 0) return true;

    const legacyAccountPlaceholders = legacySelectedSettings.map((_, index) => `@accountScope${index}`).join(",");
    const legacyAccountParams = legacySelectedSettings.reduce((acc, row, index) => {
      acc[`accountScope${index}`] = row.scope;
      return acc;
    }, { roleId: role.id, accountId: Number(accountId) });

    const legacyAllowed = db
      .prepare(
        `SELECT 1 FROM role_account_access
         WHERE roleId = @roleId AND accountId = @accountId AND scope IN (${legacyAccountPlaceholders});`,
      )
      .get(legacyAccountParams);

    return Boolean(legacyAllowed);
  }

  const allowed = db
    .prepare("SELECT 1 FROM role_account_access WHERE roleId = ? AND scope = ? AND accountId = ?;")
    .get(role.id, scope, Number(accountId));

  return Boolean(allowed);
}

export function requireAccountAccess(req, res, scope, accountId, message = "You do not have access to this account") {
  const userId = req.userId ?? null;
  if (isAccountAllowedForUser(userId, scope, accountId)) return true;

  res.status(403).json({ message });
  return false;
}

export function appendAccountAccessFilter({ userId, scope, accountColumn, conditions, params, paramPrefix }) {
  if (!userId || !scope || !accountColumn) return;

  const accountIds = getAllowedAccountIdsForUser(userId, scope);
  if (accountIds === null) return;

  if (accountIds.length === 0) {
    conditions.push("1 = 0");
    return;
  }

  const placeholders = accountIds.map((accountId, index) => {
    const key = `${paramPrefix}${index}`;
    params[key] = accountId;
    return `@${key}`;
  });

  conditions.push(`${accountColumn} IN (${placeholders.join(",")})`);
}

export function getAllowedAccountIdsForUser(userId, scope) {
  if (!userId || !scope) return null;

  const user = getUserRole(userId);
  if (!user?.role) return [];

  const role = db.prepare("SELECT id FROM roles WHERE name = ?;").get(user.role);
  if (!role) return [];

  const setting = db
    .prepare("SELECT accessMode FROM role_account_scope_settings WHERE roleId = ? AND scope = ?;")
    .get(role.id, scope);

  if (!setting || setting.accessMode !== "selected") {
    const legacyScopes = LEGACY_SCOPES_BY_SCOPE[scope] || [];
    if (legacyScopes.length === 0) return null;

    const legacyPlaceholders = legacyScopes.map((_, index) => `@legacyScope${index}`).join(",");
    const legacyParams = legacyScopes.reduce((acc, legacyScope, index) => {
      acc[`legacyScope${index}`] = legacyScope;
      return acc;
    }, { roleId: role.id });
    const legacySelectedSettings = db
      .prepare(
        `SELECT scope FROM role_account_scope_settings
         WHERE roleId = @roleId AND accessMode = 'selected' AND scope IN (${legacyPlaceholders});`,
      )
      .all(legacyParams);

    if (legacySelectedSettings.length === 0) return null;

    const legacyAccountPlaceholders = legacySelectedSettings.map((_, index) => `@accountScope${index}`).join(",");
    const legacyAccountParams = legacySelectedSettings.reduce((acc, row, index) => {
      acc[`accountScope${index}`] = row.scope;
      return acc;
    }, { roleId: role.id });

    return [
      ...new Set(
        db
          .prepare(
            `SELECT accountId FROM role_account_access
             WHERE roleId = @roleId AND scope IN (${legacyAccountPlaceholders});`,
          )
          .all(legacyAccountParams)
          .map((row) => row.accountId),
      ),
    ];
  }

  return db
    .prepare("SELECT accountId FROM role_account_access WHERE roleId = ? AND scope = ?;")
    .all(role.id, scope)
    .map((row) => row.accountId);
}
