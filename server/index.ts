import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { isProduction, pool } from "./db-config";
import { storage } from "./storage";
import { startBookingExpirationService } from "./booking-expiration";
import { schemaSQL, seedSQL } from "./migrations";

const app = express();

// Trust proxy in production for proper HTTPS detection behind reverse proxy
if (isProduction) {
  app.set("trust proxy", 1);
}

// HTTPS enforcement - redirect HTTP to HTTPS in production
app.use((req, res, next) => {
  if (isProduction && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});

// Security headers using helmet
app.use(helmet({
  // Prevents clickjacking by disallowing the page to be framed
  frameguard: { action: 'deny' },
  // Prevents MIME type sniffing
  noSniff: true,
  // Strict Transport Security - enforces HTTPS for 1 year
  hsts: isProduction ? {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true,
  } : false,
  // Content Security Policy
  contentSecurityPolicy: isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://js.stripe.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "https://api.stripe.com", "wss:", "ws:"],
      frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  } : false,
  // Referrer policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  // XSS filter (legacy browsers)
  xssFilter: true,
}));

// Use raw body parser for Stripe webhook endpoint (required for signature verification)
app.use('/api/stripe-webhook', express.raw({ type: 'application/json' }));

// Use JSON parser for all other routes
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
      
      // SQL is embedded in the bundle via migrations.ts - no file reading needed
      console.log(`📝 Executing schema SQL (${schemaSQL.length} bytes)...`);
      await pool.query(schemaSQL);
      console.log("✅ Database schema created successfully");
      
      console.log(`📝 Executing seed SQL (${seedSQL.length} bytes)...`);
      await pool.query(seedSQL);
      console.log("✅ Seed data inserted successfully");
      
      // Fix admin password hash (ensures login works even if user was created with wrong hash)
      const adminPasswordHash = '26273261973baafcfdf1deacfe5282e06d4f45ea50824413a7691250bedb19d916e3ef3e87e1f890838b3d86a3f30d9667a3e90c72b6298a9ebe6a8ff9cd1a5e.0a906e7acbebb63364c7d6b7e11fb011';
      await pool.query(`UPDATE users SET password = $1 WHERE username = 'admin'`, [adminPasswordHash]);
      console.log("✅ Admin password updated");
      
      console.log("🎉 Database migrations completed successfully!");
    } catch (error: any) {
      console.error("❌ Database migration failed:");
      console.error("   Error:", error.message || error);
      if (error.stack) {
        console.error("   Stack:", error.stack.split("\n").slice(0, 3).join("\n"));
      }
      // Continue anyway - tables might already exist
      console.log("⚠️  Continuing startup (tables may already exist)...");
    }
    console.log("🚀 Production mode - PostgreSQL initialized");
  }
  
  // Ensure "Other" industry is in all campaigns
  console.log("🔄 Running post-migration: ensuring 'Other' industry is available in all campaigns...");
  await storage.ensureOtherIndustryInAllCampaigns();
  
  // Start booking expiration service (auto-cancel unpaid bookings after 15 minutes)
  startBookingExpirationService(storage);
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Serve static files (Vite dev server has a configuration issue with async config)
  // Run `npm run build` to update the static files after code changes
  serveStatic(app);

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
