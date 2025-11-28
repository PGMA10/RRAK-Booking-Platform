import express, { type Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { isProduction, pool } from "./db-config";
import { storage } from "./storage";
import { startBookingExpirationService } from "./booking-expiration";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize database based on environment
  if (!isProduction) {
    // SQLite for development
    const { initializeDatabase } = await import("./db-sqlite");
    const { seedSQLite } = await import("./seed-sqlite");
    initializeDatabase();
    await seedSQLite();
  } else {
    // Production mode - run SQL migrations directly using pg.Pool
    console.log("🚀 Production mode - Running database migrations...");
    try {
      if (!pool) {
        throw new Error("PostgreSQL pool not initialized - check DATABASE_URL");
      }
      const migrationsDir = path.join(import.meta.dirname, "migrations");
      
      // Execute schema creation
      const schemaSQL = fs.readFileSync(path.join(migrationsDir, "001_initial_schema.sql"), "utf-8");
      await pool.query(schemaSQL);
      console.log("✅ Database schema created");
      
      // Execute seed data
      const seedSQL = fs.readFileSync(path.join(migrationsDir, "002_seed_data.sql"), "utf-8");
      await pool.query(seedSQL);
      console.log("✅ Seed data inserted");
      
      console.log("✅ Database migrations completed successfully");
    } catch (error: any) {
      console.error("❌ Database migration failed:", error.message || error);
      // Continue anyway - tables might already exist
    }
    console.log("🚀 Production mode - PostgreSQL initialized");
  }
  
  // Start booking expiration service (auto-cancel unpaid bookings after 15 minutes)
  startBookingExpirationService(storage);
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
