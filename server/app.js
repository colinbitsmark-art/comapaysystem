import dotenv from "dotenv";
dotenv.config(); // Load environment variables from .env file

import fs from "fs";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import apiRouter from "./routes/api.js";
import botRouter from "./routes/botRoutes.js";
import telegramRouter from "./routes/telegramRoutes.js";
import { initDatabase } from "./db.js";
import { runInitialCustomerLedgerOrderSyncIfNeeded } from "./services/customerLedgerOrders.js";
import {
  getReferenceRatesSyncStatus,
  isPostgresSyncEnabled,
} from "./services/referenceRatesStore.js";
import { isProduction } from "./utils/env.js";

// Wrap database initialization in try-catch
try {
  initDatabase();
  const ledgerSync = runInitialCustomerLedgerOrderSyncIfNeeded();
  if (ledgerSync.skipped) {
    console.log("Customer ledger: initial order sync already applied");
  } else {
    console.log(
      `Customer ledger: initial order sync built ${ledgerSync.ordersProcessed} order(s) for ${ledgerSync.customersUpdated} customer(s)`,
    );
  }
  console.log('Database initialized successfully');
  if (isPostgresSyncEnabled()) {
    const { configId } = getReferenceRatesSyncStatus();
    console.log(`Reference rates: Railway Postgres sync enabled (config id: ${configId})`);
  } else {
    console.log('Reference rates: local SQLite only (set DATABASE_URL for shared sync)');
  }
} catch (error) {
  console.error('Failed to initialize database:', error);
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
  : undefined;

app.use(
  cors({
    origin: corsOrigins ?? true,
    credentials: true,
  }),
);
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));

if (!isProduction()) {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// External callers (Telegram, bot API) have no session cookie — mount before /api so
// protectedRouter does not treat /api/telegram/* or /api/bot/* as authenticated routes.
app.use("/api/telegram", telegramRouter);
app.use("/api/bot", botRouter);
app.use("/api", apiRouter);

// Serve Vite build when present (Railway/Nixpacks runs `npm run build`; NODE_ENV may be unset at runtime).
const distPath = path.join(__dirname, "../dist");
const distIndexHtml = path.join(distPath, "index.html");
if (fs.existsSync(distIndexHtml)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(distIndexHtml);
  });
  console.log(`[app] Serving SPA from ${distPath}`);
} else if (process.env.NODE_ENV === "production") {
  console.warn(
    "[app] NODE_ENV=production but dist/index.html is missing; run `npm run build` before start.",
  );
}

app.use((err, req, res, _next) => {
  // Handle SQLite unique constraint errors
  if (err && (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || err.code === 'SQLITE_CONSTRAINT')) {
    // Check if it's a currency code constraint
    if (req.path && req.path.includes('/currencies/')) {
      return res.status(400).json({ 
        message: "Currency code already exists. Please choose a different code." 
      });
    }
    // Generic unique constraint error
    return res.status(400).json({ 
      message: "A record with this value already exists. Please choose a different value." 
    });
  }
  
  // Only log unexpected errors
  if (err && err.code !== 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    console.error(err);
  }
  
  // Handle foreign key constraint errors
  if (err && err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    // Check if it's a tag assignment error
    if (req.path && req.path.includes('/tags/batch-assign')) {
      return res.status(400).json({ 
        message: err.message || "Invalid order, transfer, expense, or tag ID. Please ensure all IDs exist." 
      });
    }
    // Check if it's a customer deletion error
    if (req.path && req.path.includes('/customers/')) {
      return res.status(400).json({ 
        message: "Cannot delete customer while they have existing orders. Please delete the orders first." 
      });
    }
    // Check if it's a user deletion error
    if (req.path && req.path.includes('/users/')) {
      return res.status(400).json({ 
        message: "Cannot delete user while they are assigned to existing orders. Please delete or reassign the orders first." 
      });
    }
    // Generic foreign key error
    return res.status(400).json({ 
      message: "Cannot delete this item because it is referenced by other records." 
    });
  }
  
  res.status(500).json({ message: err.message || "Internal server error" });
});

export default app;
