import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import rateLimit from "express-rate-limit";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { sanitize, validate, sanitizeUserInput } from "./validation";

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { message: "Too many failed login attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed attempts
});

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  try {
    const parts = stored.split(".");
    if (parts.length !== 2) {
      return false; // Invalid stored password format
    }
    
    const [hashed, salt] = parts;
    if (!hashed || !salt) {
      return false; // Missing hash or salt
    }
    
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    
    // Ensure buffers are same length before comparison
    if (hashedBuf.length !== suppliedBuf.length) {
      return false;
    }
    
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error("❌ [Password Comparison] Error:", error instanceof Error ? error.message : "Unknown error");
    return false; // Return false instead of crashing
  }
}

export function setupAuth(app: Express) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: isProduction, // true for production HTTPS, false for development
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: isProduction ? 'none' : 'lax', // 'none' for cross-site in production
      path: '/',
    },
  };

  // Trust proxy in production for Replit deployments
  if (isProduction) {
    app.set("trust proxy", 1);
  }
  
  console.log(`🔐 Auth config: production=${isProduction}, secure=${isProduction}, sameSite=${isProduction ? 'none' : 'lax'}`);
  
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }
        
        const isValidPassword = await comparePasswords(password, user.password);
        if (!isValidPassword) {
          return done(null, false, { message: "Invalid username or password" });
        }
        
        return done(null, user);
      } catch (error) {
        console.error("❌ [Authentication] Error:", error instanceof Error ? error.message : error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    console.log("🔐 Serializing user:", user.id);
    done(null, user.id);
  });
  passport.deserializeUser(async (id: string, done) => {
    console.log("🔓 Deserializing user:", id);
    const user = await storage.getUser(id);
    console.log("👤 Deserialized user:", user ? { id: user.id, role: user.role } : 'NOT FOUND');
    done(null, user);
  });

  app.post("/api/register", authRateLimiter, async (req, res, next) => {
    try {
      // Sanitize user input before processing
      const sanitizedBody = sanitizeUserInput(req.body);
      
      console.log("📝 Registration attempt:", {
        username: sanitizedBody.username,
        email: sanitizedBody.email,
        businessName: sanitizedBody.businessName,
        phone: sanitizedBody.phone,
        hasPassword: !!req.body.password,
        bodyKeys: Object.keys(req.body),
      });

      // Validate required fields
      if (!sanitizedBody.username || !req.body.password) {
        console.log("❌ Missing username or password");
        return res.status(400).json({ message: "Username and password are required" });
      }

      if (!sanitizedBody.email) {
        console.log("❌ Missing email");
        return res.status(400).json({ message: "Email is required" });
      }
      
      // Validate email format
      if (!validate.email(sanitizedBody.email as string)) {
        console.log("❌ Invalid email format");
        return res.status(400).json({ message: "Invalid email address format" });
      }

      // Password strength validation
      const password = req.body.password;
      const passwordErrors: string[] = [];
      
      if (password.length < 8) {
        passwordErrors.push("Password must be at least 8 characters");
      }
      if (!/\d/.test(password)) {
        passwordErrors.push("Password must contain at least one number");
      }
      if (!/[A-Z]/.test(password)) {
        passwordErrors.push("Password must contain at least one uppercase letter");
      }
      if (!/[a-z]/.test(password)) {
        passwordErrors.push("Password must contain at least one lowercase letter");
      }
      if (!/[!@#$%^&*()_+\-=\[\]{}|;':",./<>?`~\\]/.test(password)) {
        passwordErrors.push("Password must contain at least one special character (!@#$%^&*...)");
      }
      
      if (passwordErrors.length > 0) {
        console.log("❌ Weak password:", passwordErrors);
        return res.status(400).json({ 
          message: "Password does not meet requirements", 
          errors: passwordErrors 
        });
      }

      const existingUser = await storage.getUserByUsername(sanitizedBody.username as string);
      if (existingUser) {
        console.log("❌ Username already exists:", sanitizedBody.username);
        return res.status(400).json({ message: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(sanitizedBody.email as string);
      if (existingEmail) {
        console.log("❌ Email already exists:", sanitizedBody.email);
        return res.status(400).json({ message: "Email already exists" });
      }

      const user = await storage.createUser({
        username: sanitize.name(sanitizedBody.username as string),
        email: sanitizedBody.email as string,
        password: await hashPassword(req.body.password),
        businessName: sanitizedBody.businessName as string | undefined,
        phone: sanitizedBody.phone as string | undefined,
        name: sanitize.name(req.body.name || ''),
      });

      console.log("✅ User created successfully:", user.id, user.username);

      req.login(user, (err) => {
        if (err) {
          console.log("❌ Login error:", err);
          return next(err);
        }
        console.log("✅ User logged in successfully");
        res.status(201).json(user);
      });
    } catch (error) {
      console.error("❌ Registration error:", error instanceof Error ? error.message : error);
      res.status(500).json({ message: "Registration failed. Please try again." });
    }
  });

  app.post("/api/login", authRateLimiter, passport.authenticate("local"), (req, res) => {
    const user = req.user;
    
    // Regenerate session to prevent session fixation attacks
    req.session.regenerate((err) => {
      if (err) {
        console.error("❌ Session regeneration error:", err);
        return res.status(500).json({ message: "Session regeneration failed" });
      }
      
      // Re-establish user in new session
      req.login(user!, (loginErr) => {
        if (loginErr) {
          console.error("❌ Re-login after regeneration error:", loginErr);
          return res.status(500).json({ message: "Login failed" });
        }
        
        console.log("✅ Login successful with regenerated session:", {
          userId: req.user?.id,
          userRole: req.user?.role,
          sessionID: req.sessionID,
        });
        
        // Force session save before responding
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("❌ Session save error:", saveErr);
            return res.status(500).json({ message: "Session save failed" });
          }
          console.log("💾 Session saved successfully, cookie should be set");
          res.status(200).json(req.user);
        });
      });
    });
  });

  app.post("/api/logout", (req, res, next) => {
    const sessionID = req.sessionID;
    
    req.logout((err) => {
      if (err) {
        console.error("❌ Logout error:", err);
        return next(err);
      }
      
      // Destroy the session completely
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error("❌ Session destroy error:", destroyErr);
          return next(destroyErr);
        }
        
        // Clear the session cookie
        res.clearCookie('connect.sid', {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        });
        
        console.log("✅ Logout successful, session destroyed:", sessionID);
        res.sendStatus(200);
      });
    });
  });

  app.get("/api/user", (req, res) => {
    console.log("🔍 /api/user check:", {
      isAuthenticated: req.isAuthenticated(),
      hasSession: !!req.session,
      sessionID: req.sessionID,
      user: req.user,
    });
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}
