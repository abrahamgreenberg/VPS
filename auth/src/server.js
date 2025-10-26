require("dotenv").config();
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const jwt = require("jsonwebtoken");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for correct client IP and secure cookies behind NGINX/Proxy
app.set("trust proxy", 1);

// Middleware
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

app.use(
    session({
        secret: process.env.SESSION_SECRET || "secret",
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false },
    })
);

app.use(passport.initialize());
app.use(passport.session());

// Passport Google OAuth setup
passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL,
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                // Find or create user
                let user = await prisma.user.findUnique({
                    where: { googleId: profile.id },
                });
                if (!user) {
                    user = await prisma.user.create({
                        data: {
                            googleId: profile.id,
                            email: profile.emails[0].value,
                            name: profile.displayName,
                        },
                    });
                }
                // Check whitelist
                const whitelist = await prisma.whitelist.findUnique({
                    where: { email: user.email },
                });
                if (!whitelist) {
                    return done(null, false, {
                        message: "Email not whitelisted",
                    });
                }
                return done(null, user);
            } catch (err) {
                return done(err, null);
            }
        }
    )
);

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await prisma.user.findUnique({ where: { id } });
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// Auth routes

// Auth route with next param
app.get("/auth/google", (req, res, next) => {
    const nextUrl = req.query.next || req.get("Referer") || "/";
    passport.authenticate("google", {
        scope: ["profile", "email"],
        state: encodeURIComponent(nextUrl),
    })(req, res, next);
});

// Google callback with redirect to original URL
app.get(
    "/auth/google/callback",
    passport.authenticate("google", {
        failureRedirect: "/auth/failure",
        session: true,
    }),
    (req, res) => {
        // Issue JWT
        const token = jwt.sign(
            { id: req.user.id, email: req.user.email },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );
        res.cookie("token", token, { httpOnly: true });
        let nextUrl = "/";
        if (req.query.state) {
            try {
                nextUrl = decodeURIComponent(req.query.state);
            } catch (e) {}
        }
        res.redirect(nextUrl);
    }
);

app.get("/auth/success", (req, res) => {
    res.send("Authentication successful!");
});

app.get("/auth/failure", (req, res) => {
    res.status(401).send("Authentication failed or email not whitelisted.");
});

// Middleware to check authentication for all routes except /auth/*
function ensureAuthenticated(req, res, next) {
    if (
        req.isAuthenticated?.() ||
        (req.cookies && req.cookies.token && verifyJwt(req.cookies.token))
    ) {
        return next();
    }
    // Save original URL and redirect to login
    const nextUrl = req.originalUrl || "/";
    res.redirect(`/auth/google?next=${encodeURIComponent(nextUrl)}`);
}

function verifyJwt(token) {
    try {
        jwt.verify(token, process.env.JWT_SECRET);
        return true;
    } catch {
        return false;
    }
}

// Centralized auth: Only protect /auth/* and /login, let other subdomains redirect unauthenticated users to /login with ?next=...
// /login endpoint: redirects to Google OAuth with next param
app.get("/login", (req, res) => {
    const nextUrl = req.query.next || "/";
    res.redirect(`/auth/google?next=${encodeURIComponent(nextUrl)}`);
});

// Health check
app.get("/health", (req, res) => res.send("OK"));

app.listen(PORT, () => {
    console.log(`Auth server running on http://localhost:${PORT}`);
});
