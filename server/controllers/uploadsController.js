import path from "path";
import fs from "fs";
import { getFullFilePath, getUploadsDir } from "../utils/fileStorage.js";

/**
 * Serve uploaded files only to authenticated users.
 * Prevents path traversal (..) and access outside uploads directory.
 */
export const serveUpload = (req, res, next) => {
  try {
    const rawPath = req.params.path;
    const relativePath = Array.isArray(rawPath) ? rawPath.join("/") : rawPath;
    if (!relativePath || relativePath.includes("..")) {
      return res.status(400).json({ message: "Invalid file path" });
    }

    const fullPath = getFullFilePath(relativePath);
    if (!fullPath) {
      return res.status(404).json({ message: "File not found" });
    }

    const uploadsRoot = path.resolve(getUploadsDir());
    const resolved = path.resolve(fullPath);
    if (!resolved.startsWith(uploadsRoot + path.sep) && resolved !== uploadsRoot) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!fs.existsSync(resolved)) {
      return res.status(404).json({ message: "File not found" });
    }

    res.sendFile(resolved);
  } catch (error) {
    next(error);
  }
};
