// User interface for type safety
interface User {
  id: string;
  displayName?: string | undefined;
  emails?: { value: string }[] | undefined;
}
// console.log("Hello World 123");
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import dotenv from "dotenv";
import whitelist from "./whitelist.json" assert { type: "json" };
dotenv.config();

import passport from "passport";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import jwt from "jsonwebtoken";
import session from "express-session";
import { assert } from "console";

const DEFAULT_URL = "http://testsite6001:80";
const SESSION_SECRET = process.env.SESSION_SECRET || "";
const JWT_SECRET = process.env.JWT_SECRET || "";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || "";

if (
  !SESSION_SECRET ||
  !JWT_SECRET ||
  !GOOGLE_CLIENT_ID ||
  !GOOGLE_CLIENT_SECRET ||
  !GOOGLE_CALLBACK_URL
) {
  console.error("Missing required environment variables");
  throw new Error("Missing required environment variables");
}

const app = express();

app.use(express.json());
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// JWT Strategy
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: JWT_SECRET,
    },
    (jwt_payload, done) => {
      // You can add user lookup here
      return done(null, jwt_payload);
    }
  )
);

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID || "",
      clientSecret: GOOGLE_CLIENT_SECRET || "",
      callbackURL: GOOGLE_CALLBACK_URL || "/auth/google/callback",
    },
    (accessToken, refreshToken, profile, done) => {
      // Here you can save/find user in DB
      return done(null, profile);
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((user, done) => {
  done(null, user as any);
});

app.use(
  "/",
  createProxyMiddleware({
    target: DEFAULT_URL,
    changeOrigin: true,
    router: (req) => {
      const host = req.headers.host;
      const hostWithoutPort = host?.split(":")[0];
      if (!host || !hostWithoutPort) return DEFAULT_URL;

      console.log(`Received request for host: ${hostWithoutPort}`);
      const randInt = Math.floor(Math.random() * 3) + 1;
      console.log(`Routing request to: http://testsite600${randInt}:80`);
      return `http://testsite600${randInt}:80`;
    },
  })
);

// Google OAuth routes
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/auth/google/failure" }),
  (req, res) => {
    // Issue JWT
    const user = req.user as User;
    const payload: User = {
      id: user.id,
      displayName: user.displayName,
      emails: user.emails,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET || "jwt_secret", {
      expiresIn: "1h",
    });
    // Send token as response (or set cookie, etc.)
    res.json({ token });
  }
);

app.get("/auth/google/failure", (req, res) => {
  res.status(401).send("Google authentication failed");
});

// JWT authentication middleware
const authenticateJwt = passport.authenticate("jwt", { session: false });

// Only proxy if authenticated
app.use(
  "/",
  authenticateJwt,
  createProxyMiddleware({
    target: DEFAULT_URL,
    changeOrigin: true,
    router: (req) => {
      const host = req.headers.host;
      const hostWithoutPort = host?.split(":")[0];
      if (!host || !hostWithoutPort) return DEFAULT_URL;

      console.log(`Received request for host: ${hostWithoutPort}`);
      const randInt = Math.floor(Math.random() * 3) + 1;
      console.log(`Routing request to: http://testsite600${randInt}:80`);
      return `http://testsite600${randInt}:80`;
    },
  })
);

app.listen(process.env.AUTH_PORT, () => {
  console.log(`Auth service listening on port ${process.env.AUTH_PORT}`);
  console.log(`http://localhost:${process.env.AUTH_PORT}`);
});
