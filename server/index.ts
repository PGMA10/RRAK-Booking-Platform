import express, { type Request, Response, NextFunction } from "express";
import { execSync } from "child_process";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { isProduction } from "./db-config";
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
    // Production mode - run database migrations automatically
    console.log("🚀 Production mode - Running database migrations...");
    try {
      execSync("npm run db:push", { 
        stdio: "inherit",
        timeout: 60000 // 60 second timeout
      });
      console.log("✅ Database migrations completed successfully");
    } catch (error) {
      console.error("❌ Database migration failed:", error);
      // Continue anyway - tables might already exist
    }
    console.log("🚀 Production mode - PostgreSQL initialized via db-config");
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
