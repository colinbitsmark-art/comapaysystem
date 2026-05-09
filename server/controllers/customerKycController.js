import { db } from "../db.js";
import { getUserIdFromHeader } from "../utils/auth.js";
import { getActiveSchemaForCustomerType } from "./kycSchemaBuilderController.js";
import {
  saveFile,
  deleteFile,
  getFileUrl,
  generateKycDocumentFilename,
} from "../utils/fileStorage.js";

export const KYC_SCHEMA_KEY_INDIVIDUAL = "kyc_customer_schema_individual";
export const KYC_SCHEMA_KEY_CORPORATE = "kyc_customer_schema_corporate";
/** @deprecated migrated to individual key */
const KYC_SCHEMA_KEY_LEGACY = "kyc_customer_schema";

export const DEFAULT_KYC_SCHEMA_INDIVIDUAL = {
  version: 1,
  title: "Individual KYC",
  fields: [
    { key: "fullLegalName", label: "Full legal name", type: "text", required: true },
    { key: "dateOfBirth", label: "Date of birth", type: "date", required: true },
    { key: "nationality", label: "Nationality", type: "text", required: false },
    {
      key: "idDocumentType",
      label: "ID document type",
      type: "select",
      required: true,
      options: ["Passport", "National ID", "Driver license"],
    },
    { key: "idDocumentNumber", label: "ID document number", type: "text", required: true },
    {
      key: "annualIncomeRange",
      label: "Annual income (range)",
      type: "select",
      required: false,
      options: ["Under 25k", "25k–100k", "100k–500k", "500k+"],
    },
    {
      key: "pepDeclaration",
      label: "I confirm I am not a PEP or related to a PEP",
      type: "checkbox",
      required: true,
    },
  ],
  requiredDocuments: [
    { code: "id_front", label: "ID document (front)" },
    { code: "id_back", label: "ID document (back)" },
    { code: "proof_of_address", label: "Proof of address (utility bill, max 3 months)" },
  ],
};

export const DEFAULT_KYC_SCHEMA_CORPORATE = {
  version: 1,
  title: "Corporate KYC",
  fields: [
    { key: "legalEntityName", label: "Legal entity name", type: "text", required: true },
    { key: "registrationNumber", label: "Company registration number", type: "text", required: true },
    { key: "incorporationDate", label: "Date of incorporation", type: "date", required: false },
    { key: "registeredAddress", label: "Registered address", type: "textarea", required: true },
    { key: "businessNature", label: "Nature of business", type: "text", required: false },
    { key: "uboName", label: "Ultimate beneficial owner — full name", type: "text", required: true },
    {
      key: "pepDeclaration",
      label: "We confirm no UBO / director is a PEP without disclosure",
      type: "checkbox",
      required: true,
    },
  ],
  requiredDocuments: [
    { code: "certificate_of_incorporation", label: "Certificate of incorporation" },
    { code: "articles_of_association", label: "Articles of association / M&A" },
    { code: "proof_of_address", label: "Proof of business address" },
    { code: "ubo_id", label: "UBO identification (passport or national ID)" },
  ],
};

export function normalizeKycCustomerType(raw) {
  if (raw === "corporate") return "corporate";
  return "individual";
}

function schemaSettingKey(customerType) {
  return customerType === "corporate" ? KYC_SCHEMA_KEY_CORPORATE : KYC_SCHEMA_KEY_INDIVIDUAL;
}

function defaultSchemaForType(customerType) {
  return customerType === "corporate"
    ? { ...DEFAULT_KYC_SCHEMA_CORPORATE }
    : { ...DEFAULT_KYC_SCHEMA_INDIVIDUAL };
}

function migrateLegacyKycSettingOnce() {
  const done = db.prepare("SELECT 1 FROM _schema_migrations WHERE key = ?").get("kyc_schema_split_v1");
  if (done) return;
  const legacy = db.prepare("SELECT value FROM settings WHERE key = ?").get(KYC_SCHEMA_KEY_LEGACY);
  const hasInd = db.prepare("SELECT 1 FROM settings WHERE key = ?").get(KYC_SCHEMA_KEY_INDIVIDUAL);
  const now = new Date().toISOString();
  if (legacy?.value && !hasInd) {
    db.prepare(
      `INSERT INTO settings (key, value, updatedAt) VALUES (@key, @value, @updatedAt)
       ON CONFLICT(key) DO UPDATE SET value = @value, updatedAt = @updatedAt`,
    ).run({ key: KYC_SCHEMA_KEY_INDIVIDUAL, value: legacy.value, updatedAt: now });
  }
  db.prepare("INSERT INTO _schema_migrations (key) VALUES ('kyc_schema_split_v1')").run();
}

function ensureDefaultSchemaRow(customerType) {
  migrateLegacyKycSettingOnce();
  const key = schemaSettingKey(customerType);
  const defaults = defaultSchemaForType(customerType);
  const row = db.prepare("SELECT 1 as x FROM settings WHERE key = ?").get(key);
  if (!row) {
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO settings (key, value, updatedAt) VALUES (@key, @value, @updatedAt)`).run({
      key,
      value: JSON.stringify(defaults),
      updatedAt: now,
    });
  }
}

export function parseStoredSchema(customerType) {
  const t = normalizeKycCustomerType(customerType);
  ensureDefaultSchemaRow(t);
  const key = schemaSettingKey(t);
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  const fallback = defaultSchemaForType(t);
  if (!row?.value) return fallback;
  try {
    const parsed = JSON.parse(row.value);
    if (!parsed || typeof parsed !== "object") return fallback;
    if (!Array.isArray(parsed.fields)) parsed.fields = [];
    if (!Array.isArray(parsed.requiredDocuments)) parsed.requiredDocuments = [];
    if (typeof parsed.version !== "number") parsed.version = 1;
    return parsed;
  } catch {
    return fallback;
  }
}

function validateSchemaShape(schema) {
  if (!schema || typeof schema !== "object") {
    return { ok: false, message: "Schema must be an object" };
  }
  if (typeof schema.version !== "number" || schema.version < 1) {
    return { ok: false, message: "Schema.version must be a positive number" };
  }
  if (!Array.isArray(schema.fields)) {
    return { ok: false, message: "Schema.fields must be an array" };
  }
  const allowedTypes = new Set(["text", "textarea", "number", "date", "select", "checkbox"]);
  for (const f of schema.fields) {
    if (!f || typeof f !== "object") return { ok: false, message: "Each field must be an object" };
    if (!f.key || typeof f.key !== "string") return { ok: false, message: "Each field needs a string key" };
    if (!f.label || typeof f.label !== "string") return { ok: false, message: `Field ${f.key} needs a label` };
    if (!allowedTypes.has(f.type)) {
      return { ok: false, message: `Field ${f.key} has invalid type` };
    }
    if (f.type === "select" && (!Array.isArray(f.options) || f.options.length === 0)) {
      return { ok: false, message: `Select field ${f.key} needs options` };
    }
  }
  if (schema.requiredDocuments != null) {
    if (!Array.isArray(schema.requiredDocuments)) {
      return { ok: false, message: "requiredDocuments must be an array" };
    }
    for (const d of schema.requiredDocuments) {
      if (!d?.code || typeof d.code !== "string") return { ok: false, message: "Each document needs a code" };
      if (!d?.label || typeof d.label !== "string") return { ok: false, message: `Document ${d.code} needs a label` };
    }
  }
  return { ok: true };
}

function normalizeAnswer(field, raw) {
  if (raw === undefined || raw === null) return null;
  switch (field.type) {
    case "text":
    case "textarea":
    case "select":
      return String(raw).trim();
    case "date":
      return String(raw).trim();
    case "number": {
      const n = typeof raw === "number" ? raw : parseFloat(String(raw).replace(/,/g, ""));
      return Number.isFinite(n) ? n : null;
    }
    case "checkbox":
      return Boolean(raw);
    default:
      return raw;
  }
}

function validateAnswersAgainstSchema(schema, answers) {
  const errors = [];
  const out = {};
  const fields = schema.fields || [];
  for (const field of fields) {
    const v = answers?.[field.key];
    const normalized = normalizeAnswer(field, v);
    if (field.required) {
      const empty =
        normalized === null ||
        normalized === "" ||
        (field.type === "checkbox" && !normalized) ||
        (field.type === "number" && (normalized === null || normalized === undefined));
      if (empty) {
        errors.push(`Missing or invalid: ${field.label}`);
        continue;
      }
    }
    if (normalized === null || normalized === "" || normalized === undefined) {
      continue;
    }
    if (field.type === "select" && field.options && !field.options.includes(String(normalized))) {
      errors.push(`Invalid option for ${field.label}`);
      continue;
    }
    out[field.key] = normalized;
  }
  return { errors, answers: out };
}

/** Save draft: merge and normalize known keys; strip unknown; do not enforce required. */
function looseNormalizeAnswers(schema, answersInput) {
  const merged = typeof answersInput === "object" && answersInput !== null ? { ...answersInput } : {};
  const out = {};
  for (const field of schema.fields || []) {
    if (!(field.key in merged)) continue;
    const normalized = normalizeAnswer(field, merged[field.key]);
    if (normalized === null || normalized === "") continue;
    if (field.type === "checkbox" && !normalized) continue;
    if (field.type === "select" && field.options && !field.options.includes(String(normalized))) continue;
    out[field.key] = normalized;
  }
  return out;
}

export const getKycSchema = (req, res, next) => {
  try {
    const t = normalizeKycCustomerType(
      typeof req.query.customerType === "string" ? req.query.customerType : "individual",
    );
    const schema = parseStoredSchema(t);
    res.json({ schema, customerType: t });
  } catch (e) {
    next(e);
  }
};

export const putKycSchema = (req, res, next) => {
  try {
    const t = normalizeKycCustomerType(req.body?.customerType);
    const schema = req.body?.schema ?? req.body;
    if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
      return res.status(400).json({ message: "schema object is required" });
    }
    const check = validateSchemaShape(schema);
    if (!check.ok) {
      return res.status(400).json({ message: check.message });
    }
    const now = new Date().toISOString();
    const key = schemaSettingKey(t);
    db.prepare(
      `INSERT INTO settings (key, value, updatedAt)
       VALUES (@key, @value, @updatedAt)
       ON CONFLICT(key) DO UPDATE SET value = @value, updatedAt = @updatedAt`,
    ).run({
      key,
      value: JSON.stringify(schema),
      updatedAt: now,
    });
    res.json({ schema, customerType: t, message: "KYC schema saved" });
  } catch (e) {
    next(e);
  }
};

/** Clear KYC answers, documents, and review state when customer type changes (or repair mismatch). */
export function resetCustomerKycForTypeChange(customerId, newCustomerType) {
  const normalized = normalizeKycCustomerType(newCustomerType);
  const profile = db.prepare("SELECT id FROM customer_kyc_profiles WHERE customerId = ?").get(customerId);
  if (!profile) return;
  const docs = db
    .prepare("SELECT filePath FROM customer_kyc_documents WHERE profileId = ?")
    .all(profile.id);
  for (const d of docs) {
    if (d.filePath) deleteFile(d.filePath);
  }
  db.prepare("DELETE FROM customer_kyc_documents WHERE profileId = ?").run(profile.id);
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE customer_kyc_profiles SET
      answersJson = '{}',
      status = 'draft',
      submittedAt = NULL,
      submittedBy = NULL,
      reviewedAt = NULL,
      reviewedBy = NULL,
      rejectionReason = NULL,
      schemaVersion = 1,
      kycCustomerType = @kycCustomerType,
      updatedAt = @updatedAt
     WHERE customerId = @customerId`,
  ).run({
    customerId,
    kycCustomerType: normalized,
    updatedAt: now,
  });
}

function getOrCreateProfile(customerId, schemaVersion, customerType) {
  const t = normalizeKycCustomerType(customerType);
  let profile = db.prepare("SELECT * FROM customer_kyc_profiles WHERE customerId = ?").get(customerId);
  if (profile) {
    const storedType = profile.kycCustomerType ? normalizeKycCustomerType(profile.kycCustomerType) : null;
    if (storedType && storedType !== t) {
      resetCustomerKycForTypeChange(customerId, t);
      profile = db.prepare("SELECT * FROM customer_kyc_profiles WHERE customerId = ?").get(customerId);
    } else if (!storedType && profile) {
      db.prepare("UPDATE customer_kyc_profiles SET kycCustomerType = @kycCustomerType WHERE id = @id").run({
        id: profile.id,
        kycCustomerType: t,
      });
      profile = db.prepare("SELECT * FROM customer_kyc_profiles WHERE customerId = ?").get(customerId);
    }
  }
  if (!profile) {
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO customer_kyc_profiles (customerId, schemaVersion, kycCustomerType, answersJson, status, createdAt, updatedAt)
       VALUES (@customerId, @schemaVersion, @kycCustomerType, '{}', 'draft', @createdAt, @updatedAt)`,
    ).run({
      customerId,
      schemaVersion,
      kycCustomerType: t,
      createdAt: now,
      updatedAt: now,
    });
    profile = db.prepare("SELECT * FROM customer_kyc_profiles WHERE customerId = ?").get(customerId);
  }
  return profile;
}

function mapDocuments(profileId) {
  const rows = db
    .prepare(
      `SELECT id, customerId, profileId, documentCode, filePath, originalName, mimeType, uploadedBy, createdAt
       FROM customer_kyc_documents WHERE profileId = ? ORDER BY documentCode ASC`,
    )
    .all(profileId);
  return rows.map((r) => ({
    ...r,
    fileUrl: getFileUrl(r.filePath),
  }));
}

export const getCustomerKyc = (req, res, next) => {
  try {
    const customerId = Number(req.params.id);
    if (!Number.isFinite(customerId)) {
      return res.status(400).json({ message: "Invalid customer id" });
    }
    const customer = db
      .prepare("SELECT id, name, email, phone, remarks, customerType FROM customers WHERE id = ?")
      .get(customerId);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    const customerType = normalizeKycCustomerType(customer.customerType);
    // Prefer v2 published builder schema; fall back to legacy v1 flat schema
    const v2 = getActiveSchemaForCustomerType(customerType);
    const schema = v2 ? { ...v2.schema, version: v2.version } : parseStoredSchema(customerType);
    const profile = getOrCreateProfile(customerId, v2 ? v2.version : schema.version, customerType);
    let answers = {};
    try {
      answers = profile.answersJson ? JSON.parse(profile.answersJson) : {};
    } catch {
      answers = {};
    }
    const documents = mapDocuments(profile.id);
    res.json({
      customer: { ...customer, customerType },
      schema,
      profile: {
        id: profile.id,
        customerId: profile.customerId,
        schemaVersion: profile.schemaVersion,
        answers,
        status: profile.status,
        submittedAt: profile.submittedAt,
        submittedBy: profile.submittedBy,
        reviewedAt: profile.reviewedAt,
        reviewedBy: profile.reviewedBy,
        rejectionReason: profile.rejectionReason,
        updatedAt: profile.updatedAt,
      },
      documents,
    });
  } catch (e) {
    next(e);
  }
};

export const updateCustomerKyc = (req, res, next) => {
  try {
    const userId = getUserIdFromHeader(req);
    if (!userId) {
      return res.status(401).json({ message: "User ID is required" });
    }
    const customerId = Number(req.params.id);
    if (!Number.isFinite(customerId)) {
      return res.status(400).json({ message: "Invalid customer id" });
    }
    const customer = db.prepare("SELECT id, customerType FROM customers WHERE id = ?").get(customerId);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    const customerType = normalizeKycCustomerType(customer.customerType);
    const schema = parseStoredSchema(customerType);
    const profile = getOrCreateProfile(customerId, schema.version, customerType);
    const { answers: rawAnswers, status: nextStatus, rejectionReason } = req.body || {};

    let answers = {};
    try {
      answers = profile.answersJson ? JSON.parse(profile.answersJson) : {};
    } catch {
      answers = {};
    }
    if (typeof answers !== "object" || answers === null) answers = {};

    if (rawAnswers && typeof rawAnswers === "object") {
      answers = { ...answers, ...rawAnswers };
    }

    const now = new Date().toISOString();
    let status = nextStatus != null ? String(nextStatus) : profile.status;
    const allowed = new Set(["draft", "submitted", "approved", "rejected"]);
    if (!allowed.has(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    if (status === "submitted") {
      const { errors, answers: validated } = validateAnswersAgainstSchema(schema, answers);
      if (errors.length) {
        return res.status(400).json({ message: errors.join("; ") });
      }
      answers = validated;
    } else {
      answers = looseNormalizeAnswers(schema, answers);
    }

    let submittedAt = profile.submittedAt;
    let submittedBy = profile.submittedBy;
    let reviewedAt = profile.reviewedAt;
    let reviewedBy = profile.reviewedBy;
    let rejectionReasonOut = profile.rejectionReason;

    if (status === "submitted" && profile.status !== "submitted") {
      const docs = mapDocuments(profile.id);
      const requiredCodes = (schema.requiredDocuments || []).map((d) => d.code);
      for (const code of requiredCodes) {
        if (!docs.some((d) => d.documentCode === code)) {
          return res.status(400).json({ message: `Missing required document: ${code}` });
        }
      }
      submittedAt = now;
      submittedBy = userId;
    }

    if (status === "approved" || status === "rejected") {
      if (profile.status !== "submitted") {
        return res.status(400).json({ message: "Can only approve or reject a submitted profile" });
      }
      reviewedAt = now;
      reviewedBy = userId;
      if (status === "rejected" && rejectionReason) {
        rejectionReasonOut = String(rejectionReason).trim();
      }
      if (status === "approved") {
        rejectionReasonOut = null;
      }
    }

    // Allow reopening an approved or rejected profile back to draft (admin action)
    if (status === "draft" && (profile.status === "approved" || profile.status === "rejected")) {
      submittedAt = null;
      submittedBy = null;
      reviewedAt = null;
      reviewedBy = null;
      rejectionReasonOut = null;
    }

    db.prepare(
      `UPDATE customer_kyc_profiles SET
        schemaVersion = @schemaVersion,
        answersJson = @answersJson,
        status = @status,
        submittedAt = @submittedAt,
        submittedBy = @submittedBy,
        reviewedAt = @reviewedAt,
        reviewedBy = @reviewedBy,
        rejectionReason = @rejectionReason,
        updatedAt = @updatedAt
       WHERE id = @id`,
    ).run({
      id: profile.id,
      schemaVersion: schema.version,
      answersJson: JSON.stringify(answers),
      status,
      submittedAt,
      submittedBy,
      reviewedAt,
      reviewedBy,
      rejectionReason: rejectionReasonOut,
      updatedAt: now,
    });

    const updated = db.prepare("SELECT * FROM customer_kyc_profiles WHERE id = ?").get(profile.id);
    let answersOut = {};
    try {
      answersOut = JSON.parse(updated.answersJson || "{}");
    } catch {
      answersOut = {};
    }

    res.json({
      profile: {
        id: updated.id,
        customerId: updated.customerId,
        schemaVersion: updated.schemaVersion,
        answers: answersOut,
        status: updated.status,
        submittedAt: updated.submittedAt,
        submittedBy: updated.submittedBy,
        reviewedAt: updated.reviewedAt,
        reviewedBy: updated.reviewedBy,
        rejectionReason: updated.rejectionReason,
        updatedAt: updated.updatedAt,
      },
      documents: mapDocuments(updated.id),
    });
  } catch (e) {
    next(e);
  }
};

export const uploadCustomerKycDocument = (req, res, next) => {
  try {
    const userId = getUserIdFromHeader(req);
    if (!userId) {
      return res.status(401).json({ message: "User ID is required" });
    }
    const customerId = Number(req.params.id);
    if (!Number.isFinite(customerId)) {
      return res.status(400).json({ message: "Invalid customer id" });
    }
    const customer = db.prepare("SELECT id, customerType FROM customers WHERE id = ?").get(customerId);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    const customerType = normalizeKycCustomerType(customer.customerType);

    const file = req.file;
    const documentCode =
      typeof req.body?.documentCode === "string" ? req.body.documentCode.trim() : "";
    if (!file || !documentCode) {
      return res.status(400).json({ message: "File and documentCode are required" });
    }

    const schema = parseStoredSchema(customerType);
    const allowedCodes = new Set((schema.requiredDocuments || []).map((d) => d.code));
    if (!allowedCodes.has(documentCode)) {
      return res.status(400).json({ message: "Unknown document code for current KYC policy" });
    }

    const profile = getOrCreateProfile(customerId, schema.version, customerType);

    const filename = generateKycDocumentFilename(customerId, documentCode, file.mimetype, file.originalname);
    const relativePath = saveFile(file.buffer, filename, "kyc");

    const existing = db
      .prepare("SELECT id, filePath FROM customer_kyc_documents WHERE profileId = ? AND documentCode = ?")
      .get(profile.id, documentCode);
    if (existing?.filePath) {
      deleteFile(existing.filePath);
    }

    const now = new Date().toISOString();
    if (existing) {
      db.prepare(
        `UPDATE customer_kyc_documents SET filePath = @filePath, originalName = @originalName, mimeType = @mimeType, uploadedBy = @uploadedBy, createdAt = @createdAt
         WHERE id = @id`,
      ).run({
        id: existing.id,
        filePath: relativePath,
        originalName: file.originalname || null,
        mimeType: file.mimetype || null,
        uploadedBy: userId,
        createdAt: now,
      });
      const row = db.prepare("SELECT * FROM customer_kyc_documents WHERE id = ?").get(existing.id);
      return res.json({
        document: {
          ...row,
          fileUrl: getFileUrl(row.filePath),
        },
      });
    }

    const ins = db
      .prepare(
        `INSERT INTO customer_kyc_documents (customerId, profileId, documentCode, filePath, originalName, mimeType, uploadedBy, createdAt)
         VALUES (@customerId, @profileId, @documentCode, @filePath, @originalName, @mimeType, @uploadedBy, @createdAt)`,
      )
      .run({
        customerId,
        profileId: profile.id,
        documentCode,
        filePath: relativePath,
        originalName: file.originalname || null,
        mimeType: file.mimetype || null,
        uploadedBy: userId,
        createdAt: now,
      });

    const row = db.prepare("SELECT * FROM customer_kyc_documents WHERE id = ?").get(ins.lastInsertRowid);
    res.status(201).json({
      document: {
        ...row,
        fileUrl: getFileUrl(row.filePath),
      },
    });
  } catch (e) {
    next(e);
  }
};

export const deleteCustomerKycDocument = (req, res, next) => {
  try {
    const userId = getUserIdFromHeader(req);
    if (!userId) {
      return res.status(401).json({ message: "User ID is required" });
    }
    const customerId = Number(req.params.id);
    const documentId = Number(req.params.documentId);
    if (!Number.isFinite(customerId) || !Number.isFinite(documentId)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const row = db
      .prepare(
        `SELECT d.* FROM customer_kyc_documents d
         JOIN customer_kyc_profiles p ON p.id = d.profileId
         WHERE d.id = ? AND d.customerId = ?`,
      )
      .get(documentId, customerId);
    if (!row) {
      return res.status(404).json({ message: "Document not found" });
    }
    deleteFile(row.filePath);
    db.prepare("DELETE FROM customer_kyc_documents WHERE id = ?").run(documentId);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
};
