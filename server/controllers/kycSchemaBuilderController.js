/**
 * KYC Schema Builder Controller (v2)
 *
 * Manages draft/publish flow for section-based KYC schemas.
 * One draft per customerType exists at any time.
 * Publishing creates a new version row (status='published') and keeps
 * the draft row for future edits (auto-increments version for next draft).
 *
 * GET  /kyc/builder/schema?customerType=individual
 *   → { draft, published, versions[] }
 *
 * PUT  /kyc/builder/schema
 *   body: { customerType, schema }
 *   → { draft }
 *
 * POST /kyc/builder/schema/publish
 *   body: { customerType }
 *   → { published }
 *
 * GET  /kyc/builder/schema/versions?customerType=individual
 *   → { versions[] }
 */
import { db } from "../db.js";
import { getUserIdFromHeader } from "../utils/auth.js";

export function normalizeCustomerType(raw) {
  if (raw === "corporate") return "corporate";
  return "individual";
}

// ── Default schemas (v2 section-based) ──────────────────────────────────────

const DEFAULT_SCHEMA_INDIVIDUAL = {
  schemaType: "v2",
  titleEn: "Individual KYC",
  titleZh: "个人 KYC",
  sections: [
    {
      id: "sec_personal",
      titleEn: "Personal Information",
      titleZh: "个人资料",
      order: 0,
      fields: [
        {
          id: "f_full_name",
          key: "fullLegalName",
          type: "text",
          labelEn: "Full legal name",
          labelZh: "英文全名",
          placeholderEn: "Enter full legal name",
          placeholderZh: "请输入英文全名",
          required: true,
        },
        {
          id: "f_dob",
          key: "dateOfBirth",
          type: "date",
          labelEn: "Date of birth",
          labelZh: "出生日期",
          required: true,
        },
        {
          id: "f_nationality",
          key: "nationality",
          type: "text",
          labelEn: "Nationality",
          labelZh: "国籍",
          required: false,
        },
        {
          id: "f_id_type",
          key: "idDocumentType",
          type: "select",
          labelEn: "ID document type",
          labelZh: "身份证件类型",
          required: true,
          options: [
            { value: "passport", labelEn: "Passport", labelZh: "护照" },
            { value: "hkid", labelEn: "Hong Kong ID", labelZh: "香港身份证" },
            { value: "national_id", labelEn: "National ID", labelZh: "国民身份证" },
            { value: "driver_license", labelEn: "Driver license", labelZh: "驾照" },
          ],
        },
        {
          id: "f_id_number",
          key: "idDocumentNumber",
          type: "text",
          labelEn: "ID document number",
          labelZh: "证件号码",
          required: true,
        },
      ],
    },
    {
      id: "sec_residence",
      titleEn: "Residence & Contact",
      titleZh: "居住地址及联系方式",
      order: 1,
      fields: [
        {
          id: "f_address",
          key: "address",
          type: "textarea",
          labelEn: "Residential address",
          labelZh: "居住地址",
          placeholderEn: "Full residential address",
          placeholderZh: "完整居住地址",
          required: true,
        },
        {
          id: "f_perm_address",
          key: "permanentAddress",
          type: "textarea",
          labelEn: "Permanent address (if different)",
          labelZh: "永久地址（如与上不同）",
          required: false,
        },
      ],
    },
    {
      id: "sec_employment",
      titleEn: "Employment & Income",
      titleZh: "职业及收入",
      order: 2,
      fields: [
        {
          id: "f_occupation",
          key: "occupation",
          type: "select",
          labelEn: "Occupation / Industry",
          labelZh: "职业 / 行业",
          required: true,
          options: [
            { value: "banking_finance", labelEn: "Banking & Finance", labelZh: "银行及金融" },
            { value: "trading", labelEn: "Trading", labelZh: "贸易" },
            { value: "property_insurance", labelEn: "Property or Insurance", labelZh: "地产 / 保险" },
            { value: "services", labelEn: "Services", labelZh: "服务业" },
            { value: "other", labelEn: "Other", labelZh: "其他" },
          ],
        },
        {
          id: "f_income",
          key: "annualIncomeRange",
          type: "select",
          labelEn: "Annual income (range)",
          labelZh: "年收入范围",
          required: false,
          options: [
            { value: "under_25k", labelEn: "Under 25k", labelZh: "25k 以下" },
            { value: "25k_100k", labelEn: "25k – 100k", labelZh: "25k – 100k" },
            { value: "100k_500k", labelEn: "100k – 500k", labelZh: "100k – 500k" },
            { value: "500k_plus", labelEn: "500k+", labelZh: "500k 以上" },
          ],
        },
        {
          id: "f_source_of_funds",
          key: "sourceOfFunds",
          type: "radio",
          labelEn: "Source of funds",
          labelZh: "资金来源",
          required: true,
          options: [
            { value: "salary", labelEn: "Salary", labelZh: "工资" },
            { value: "business", labelEn: "Business income", labelZh: "公司收入" },
            { value: "other", labelEn: "Other", labelZh: "其他" },
          ],
        },
      ],
    },
    {
      id: "sec_purpose",
      titleEn: "Business Purpose",
      titleZh: "业务用途",
      order: 3,
      fields: [
        {
          id: "f_purpose",
          key: "purposeOfRelationship",
          type: "radio",
          labelEn: "Purpose of establishing business relationship",
          labelZh: "建立业务关系目的",
          required: true,
          options: [
            { value: "remittance", labelEn: "Remittance", labelZh: "汇款" },
            { value: "fx_exchange", labelEn: "Foreign currency exchange", labelZh: "兑换外币" },
          ],
        },
        {
          id: "f_tx_purpose",
          key: "transactionPurpose",
          type: "radio",
          labelEn: "Purpose of transactions",
          labelZh: "交易主要用途",
          required: true,
          options: [
            { value: "third_party", labelEn: "Transaction with third parties", labelZh: "与第三方资金往来" },
            { value: "personal", labelEn: "Personal fund transfer", labelZh: "个人资金调拨" },
          ],
        },
      ],
    },
    {
      id: "sec_declarations",
      titleEn: "Declarations",
      titleZh: "声明",
      order: 4,
      fields: [
        {
          id: "f_pep",
          key: "pepDeclaration",
          type: "checkbox",
          labelEn: "I confirm I am not a Politically Exposed Person (PEP) or related to one",
          labelZh: "本人确认，本人不是政治公众人物（PEP）或其关联人",
          required: true,
        },
      ],
    },
  ],
  documents: [
    {
      id: "d_passport",
      code: "passport_copy",
      labelEn: "Passport / ID document (photo page)",
      labelZh: "护照 / 身份证件（相片页）",
      required: true,
    },
    {
      id: "d_address_proof",
      code: "proof_of_address",
      labelEn: "Proof of address (utility bill / bank statement, within 3 months)",
      labelZh: "地址证明（水电单 / 银行月结单，3个月内）",
      required: true,
    },
    {
      id: "d_bank_stmt",
      code: "bank_statement",
      labelEn: "Bank statement (recent 3 months)",
      labelZh: "银行月结单（最近3个月）",
      required: true,
    },
  ],
};

const DEFAULT_SCHEMA_CORPORATE = {
  schemaType: "v2",
  titleEn: "Corporate KYC",
  titleZh: "企业 KYC",
  sections: [
    {
      id: "sec_company",
      titleEn: "Company Information",
      titleZh: "公司资料",
      order: 0,
      fields: [
        {
          id: "f_entity_name",
          key: "legalEntityName",
          type: "text",
          labelEn: "Legal entity name",
          labelZh: "公司法定名称",
          required: true,
        },
        {
          id: "f_reg_number",
          key: "registrationNumber",
          type: "text",
          labelEn: "Company registration number",
          labelZh: "公司注册号码",
          required: true,
        },
        {
          id: "f_incorp_date",
          key: "incorporationDate",
          type: "date",
          labelEn: "Date of incorporation",
          labelZh: "成立日期",
          required: false,
        },
        {
          id: "f_reg_address",
          key: "registeredAddress",
          type: "textarea",
          labelEn: "Registered address",
          labelZh: "注册地址",
          required: true,
        },
        {
          id: "f_biz_nature",
          key: "businessNature",
          type: "text",
          labelEn: "Nature of business",
          labelZh: "业务性质",
          required: false,
        },
      ],
    },
    {
      id: "sec_ubo",
      titleEn: "Ultimate Beneficial Owner (UBO)",
      titleZh: "最终受益人",
      order: 1,
      fields: [
        {
          id: "f_ubo_name",
          key: "uboName",
          type: "text",
          labelEn: "UBO full name",
          labelZh: "最终受益人姓名",
          required: true,
        },
        {
          id: "f_pep_corp",
          key: "pepDeclaration",
          type: "checkbox",
          labelEn: "We confirm no UBO / director is a PEP without prior disclosure",
          labelZh: "我们确认，所有最终受益人及董事均未在未经披露的情况下担任政治公众人物（PEP）",
          required: true,
        },
      ],
    },
  ],
  documents: [
    {
      id: "d_cert_inc",
      code: "certificate_of_incorporation",
      labelEn: "Certificate of incorporation",
      labelZh: "公司注册证书",
      required: true,
    },
    {
      id: "d_maa",
      code: "articles_of_association",
      labelEn: "Articles of association / M&A",
      labelZh: "公司章程",
      required: true,
    },
    {
      id: "d_addr_proof",
      code: "proof_of_address",
      labelEn: "Proof of business address",
      labelZh: "营业地址证明",
      required: true,
    },
    {
      id: "d_ubo_id",
      code: "ubo_id",
      labelEn: "UBO identification (passport or national ID)",
      labelZh: "最终受益人身份证明",
      required: true,
    },
  ],
};

function defaultSchema(customerType) {
  return customerType === "corporate" ? DEFAULT_SCHEMA_CORPORATE : DEFAULT_SCHEMA_INDIVIDUAL;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getPublished(customerType) {
  return db
    .prepare(
      `SELECT * FROM kyc_schema_versions
       WHERE customerType = ? AND status = 'published'
       ORDER BY version DESC LIMIT 1`,
    )
    .get(customerType);
}

function getDraft(customerType) {
  return db
    .prepare(`SELECT * FROM kyc_schema_versions WHERE customerType = ? AND status = 'draft' LIMIT 1`)
    .get(customerType);
}

function parseSchema(row) {
  if (!row) return null;
  try {
    return { ...row, schema: JSON.parse(row.schemaJson) };
  } catch {
    return { ...row, schema: null };
  }
}

function getNextVersion(customerType) {
  const row = db
    .prepare(`SELECT MAX(version) as mv FROM kyc_schema_versions WHERE customerType = ?`)
    .get(customerType);
  return (row?.mv ?? 0) + 1;
}

function ensureDraftExists(customerType) {
  const existing = getDraft(customerType);
  if (existing) return existing;
  const published = getPublished(customerType);
  const baseSchema = published ? JSON.parse(published.schemaJson) : defaultSchema(customerType);
  const nextVer = getNextVersion(customerType);
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO kyc_schema_versions (customerType, version, status, schemaJson, createdAt)
     VALUES (@customerType, @version, 'draft', @schemaJson, @createdAt)`,
  ).run({ customerType, version: nextVer, schemaJson: JSON.stringify(baseSchema), createdAt: now });
  return getDraft(customerType);
}

// ── Route handlers ────────────────────────────────────────────────────────────

/** GET /kyc/builder/schema?customerType=individual */
export const getBuilderSchema = (req, res, next) => {
  try {
    const ct = normalizeCustomerType(req.query.customerType);
    const draft = parseSchema(ensureDraftExists(ct));
    const published = parseSchema(getPublished(ct));
    const versions = db
      .prepare(
        `SELECT id, customerType, version, status, publishedAt, publishedBy, createdAt
         FROM kyc_schema_versions WHERE customerType = ? ORDER BY version DESC`,
      )
      .all(ct);
    res.json({ draft, published, versions });
  } catch (e) {
    next(e);
  }
};

/** PUT /kyc/builder/schema — save draft */
export const putBuilderSchema = (req, res, next) => {
  try {
    const ct = normalizeCustomerType(req.body?.customerType);
    const schema = req.body?.schema;
    if (!schema || typeof schema !== "object") {
      return res.status(400).json({ message: "schema is required" });
    }
    if (schema.schemaType !== "v2") {
      return res.status(400).json({ message: "schema.schemaType must be 'v2'" });
    }
    if (!Array.isArray(schema.sections)) {
      return res.status(400).json({ message: "schema.sections must be an array" });
    }
    const userId = getUserIdFromHeader(req);
    const now = new Date().toISOString();
    ensureDraftExists(ct);
    db.prepare(
      `UPDATE kyc_schema_versions SET schemaJson = @schemaJson, createdBy = @createdBy, createdAt = @createdAt
       WHERE customerType = @customerType AND status = 'draft'`,
    ).run({ schemaJson: JSON.stringify(schema), createdBy: userId, createdAt: now, customerType: ct });
    const draft = parseSchema(getDraft(ct));
    res.json({ draft });
  } catch (e) {
    next(e);
  }
};

/** POST /kyc/builder/schema/publish */
export const publishBuilderSchema = (req, res, next) => {
  try {
    const ct = normalizeCustomerType(req.body?.customerType);
    const userId = getUserIdFromHeader(req);
    const draft = getDraft(ct);
    if (!draft) return res.status(400).json({ message: "No draft found" });
    const now = new Date().toISOString();
    db.prepare(
      `UPDATE kyc_schema_versions SET status = 'published', publishedAt = @now, publishedBy = @userId
       WHERE id = @id`,
    ).run({ now, userId, id: draft.id });
    // Create next draft from what was just published
    const nextVer = getNextVersion(ct);
    db.prepare(
      `INSERT INTO kyc_schema_versions (customerType, version, status, schemaJson, createdAt)
       VALUES (@customerType, @version, 'draft', @schemaJson, @createdAt)`,
    ).run({ customerType: ct, version: nextVer, schemaJson: draft.schemaJson, createdAt: now });
    const published = parseSchema(
      db.prepare(`SELECT * FROM kyc_schema_versions WHERE id = ?`).get(draft.id),
    );
    res.json({ published, message: `Published version ${draft.version}` });
  } catch (e) {
    next(e);
  }
};

/** GET /kyc/builder/schema/versions?customerType=individual */
export const getBuilderVersions = (req, res, next) => {
  try {
    const ct = normalizeCustomerType(req.query.customerType);
    const versions = db
      .prepare(
        `SELECT id, customerType, version, status, publishedAt, publishedBy, createdAt
         FROM kyc_schema_versions WHERE customerType = ? ORDER BY version DESC`,
      )
      .all(ct);
    res.json({ versions });
  } catch (e) {
    next(e);
  }
};

/** GET /kyc/builder/schema/version/:id — get a specific version schema */
export const getBuilderSchemaVersion = (req, res, next) => {
  try {
    const row = db.prepare(`SELECT * FROM kyc_schema_versions WHERE id = ?`).get(req.params.id);
    if (!row) return res.status(404).json({ message: "Version not found" });
    res.json(parseSchema(row));
  } catch (e) {
    next(e);
  }
};

/** DELETE /kyc/builder/schema/version/:id — delete a specific historical version (admin only) */
export const deleteBuilderSchemaVersion = (req, res, next) => {
  try {
    const row = db.prepare(`SELECT * FROM kyc_schema_versions WHERE id = ?`).get(req.params.id);
    if (!row) return res.status(404).json({ message: "Version not found" });

    // Prevent deleting the currently published version
    if (row.status === "published") {
      const laterPublished = db
        .prepare(
          `SELECT id FROM kyc_schema_versions
           WHERE customerType = ? AND status = 'published' AND version > ?
           LIMIT 1`,
        )
        .get(row.customerType, row.version);
      if (!laterPublished) {
        return res
          .status(400)
          .json({ message: "Cannot delete the currently active published version." });
      }
    }

    // Prevent deleting the active draft
    if (row.status === "draft") {
      return res.status(400).json({ message: "Cannot delete the current draft." });
    }

    db.prepare(`DELETE FROM kyc_schema_versions WHERE id = ?`).run(req.params.id);
    res.json({ message: "Version deleted." });
  } catch (e) {
    next(e);
  }
};

/**
 * Returns the active schema for rendering a customer KYC profile.
 * Used by getCustomerKyc / updateCustomerKyc.
 * Falls back to the v1 key-based schema if no v2 published schema exists.
 */
export function getActiveSchemaForCustomerType(customerType) {
  const ct = normalizeCustomerType(customerType);
  const published = getPublished(ct);
  if (published) {
    try {
      return { version: published.version, schema: JSON.parse(published.schemaJson), isV2: true };
    } catch {/* fall through */}
  }
  return null;
}
