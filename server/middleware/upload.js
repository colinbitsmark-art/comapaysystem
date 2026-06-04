import fs from "fs";
import path from "path";
import multer from "multer";
import { getUploadsDir } from "../utils/fileStorage.js";

// Configure multer to store files in memory (used for images/PDFs)
const storage = multer.memoryStorage();

const IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
]);
const PDF_MIMES = new Set(["application/pdf", "application/x-pdf"]);

// File filter to only allow images and PDFs (extension fallback for browsers that send octet-stream)
const fileFilter = (req, file, cb) => {
  const mime = file.mimetype || "";
  const ext = path.extname(file.originalname || "").toLowerCase();

  if (IMAGE_MIMES.has(mime) || PDF_MIMES.has(mime)) {
    cb(null, true);
    return;
  }
  if (ext === ".pdf" && (!mime || mime === "application/octet-stream")) {
    cb(null, true);
    return;
  }
  if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext) && (!mime || mime === "application/octet-stream")) {
    cb(null, true);
    return;
  }

  cb(new Error("Invalid file type. Only images and PDFs are allowed."), false);
};

// Create multer instance for standard uploads
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

const brandingFaviconFilter = (_req, file, cb) => {
  const allowedMimes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "image/x-icon",
    "image/vnd.microsoft.icon",
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Use PNG, JPG, GIF, WebP, SVG, or ICO."), false);
  }
};

/** Favicon upload for Settings → Branding (small images only) */
export const uploadBrandingFavicon = multer({
  storage,
  fileFilter: brandingFaviconFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
  },
});

// --- Backup/Restore upload (allows .db/.zip, stores on disk) ---
const backupUploadDir = path.join(process.cwd(), "server", "data", "backup-uploads");
if (!fs.existsSync(backupUploadDir)) {
  fs.mkdirSync(backupUploadDir, { recursive: true });
}

const backupStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, backupUploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const backupFileFilter = (_req, file, cb) => {
  const allowedMimes = [
    "application/x-sqlite3",
    "application/octet-stream",
    "application/zip",
    "application/x-zip-compressed",
  ];
  const allowedExt = [".db", ".zip"];
  const isAllowed =
    allowedMimes.includes(file.mimetype) ||
    allowedExt.some((ext) => file.originalname.toLowerCase().endsWith(ext));

  if (isAllowed) {
    cb(null, true);
  } else {
    cb(new Error("Invalid backup file. Only .db or .zip files are allowed."), false);
  }
};

export const backupUpload = multer({
  storage: backupStorage,
  fileFilter: backupFileFilter,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB limit
  },
});

