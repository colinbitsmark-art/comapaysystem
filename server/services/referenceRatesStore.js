import pg from "pg";
import { db } from "../db.js";

const { Pool } = pg;

export const REFERENCE_RATES_SETTING_KEY = "reference_exchange_rates";

const TABLE = "reference_rates_config";

let pool = null;
let tableReady = false;

const getConfigId = () => process.env.REFERENCE_RATES_CONFIG_ID?.trim() || "default";

export const isPostgresSyncEnabled = () => Boolean(process.env.DATABASE_URL?.trim());

const getPool = () => {
  if (!isPostgresSyncEnabled()) return null;
  if (!pool) {
    const connectionString = process.env.DATABASE_URL.trim();
    const isLocal =
      connectionString.includes("localhost") || connectionString.includes("127.0.0.1");
    pool = new Pool({
      connectionString,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: 4,
    });
  }
  return pool;
};

const ensureTable = async (client) => {
  if (tableReady) return;
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      id text PRIMARY KEY,
      config jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  tableReady = true;
};

const withClient = async (fn) => {
  const p = getPool();
  if (!p) return null;
  const client = await p.connect();
  try {
    await ensureTable(client);
    return await fn(client);
  } finally {
    client.release();
  }
};

const loadFromSqlite = () => {
  const row = db
    .prepare("SELECT value, updatedAt FROM settings WHERE key = ?")
    .get(REFERENCE_RATES_SETTING_KEY);
  if (!row?.value) return null;
  try {
    const parsed = JSON.parse(row.value);
    return { ...parsed, updatedAt: parsed.updatedAt || row.updatedAt };
  } catch {
    return null;
  }
};

const saveToSqlite = (config) => {
  const value = JSON.stringify(config);
  const updatedAt = config.updatedAt || new Date().toISOString();
  db.prepare(
    `INSERT INTO settings (key, value, updatedAt)
     VALUES (@key, @value, @updatedAt)
     ON CONFLICT(key) DO UPDATE SET value = @value, updatedAt = @updatedAt`,
  ).run({
    key: REFERENCE_RATES_SETTING_KEY,
    value,
    updatedAt,
  });
};

const loadFromPostgres = async () => {
  const row = await withClient(async (client) => {
    const res = await client.query(
      `SELECT config, updated_at FROM ${TABLE} WHERE id = $1`,
      [getConfigId()],
    );
    return res.rows[0] ?? null;
  });
  if (!row?.config) return null;

  const config = typeof row.config === "string" ? JSON.parse(row.config) : row.config;
  return {
    ...config,
    updatedAt: config.updatedAt || row.updated_at?.toISOString?.() || row.updated_at || null,
  };
};

const saveToPostgres = async (config) => {
  const updatedAt = config.updatedAt || new Date().toISOString();
  const payload = { ...config, updatedAt };

  await withClient(async (client) => {
    await client.query(
      `INSERT INTO ${TABLE} (id, config, updated_at)
       VALUES ($1, $2::jsonb, $3::timestamptz)
       ON CONFLICT (id) DO UPDATE
       SET config = EXCLUDED.config, updated_at = EXCLUDED.updated_at`,
      [getConfigId(), JSON.stringify(payload), updatedAt],
    );
  });
};

export const loadReferenceRatesConfig = async () => {
  if (!isPostgresSyncEnabled()) {
    return loadFromSqlite();
  }

  try {
    const remote = await loadFromPostgres();
    if (remote) {
      saveToSqlite(remote);
      return remote;
    }
    return loadFromSqlite();
  } catch (err) {
    console.error("[referenceRates] Postgres load failed, using SQLite:", err.message);
    return loadFromSqlite();
  }
};

export const saveReferenceRatesConfig = async (config) => {
  if (isPostgresSyncEnabled()) {
    try {
      await saveToPostgres(config);
    } catch (err) {
      console.error("[referenceRates] Postgres save failed:", err.message);
      throw err;
    }
  }
  saveToSqlite(config);
  return config;
};

export const getReferenceRatesSyncStatus = () => ({
  postgres: isPostgresSyncEnabled(),
  configId: getConfigId(),
});
