import express from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { createProxyMiddleware } from "http-proxy-middleware";
import { PrismaClient } from "@prisma/client";
import cookieParser from "cookie-parser";

const prisma = new PrismaClient();
const app = express();

const PORT = process.env.PORT;
const DOMAIN = process.env.DOMAIN;

// Trust proxy if behind a reverse proxy (e.g., nginx, Heroku)
app.set("trust proxy", 1);

app.use(cookieParser());

// 🔐 Session setup
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === "production", // true if HTTPS
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        },
    })
);

app.use(passport.initialize());
app.use(passport.session());

// 🧠 Passport setup
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// 🪪 Google OAuth setup
passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: `https://auth.${DOMAIN}/auth/callback`,
        },
        (accessToken, refreshToken, profile, done) => done(null, profile)
    )
);

// Helper for base64url encoding/decoding
function encodeState(obj) {
    return Buffer.from(JSON.stringify(obj)).toString("base64url");
}
function decodeState(str) {
    return JSON.parse(Buffer.from(str, "base64url").toString());
}

// 🧭 Login route
app.get("/auth/login", (req, res, next) => {
    const origin = req.query.origin;
    const nextUrl = req.query.next || "/";
    const state = encodeState({ origin, next: nextUrl });
    passport.authenticate("google", {
        scope: ["email", "profile"],
        state,
    })(req, res, next);
});

// 🧭 Callback
app.get(
    "/auth/callback",
    passport.authenticate("google", {
        failureRedirect: "/auth/failure",
        session: true,
    }),
    async (req, res) => {
        let state;
        try {
            state = decodeState(req.query.state);
        } catch {
            return res.status(400).send("Invalid state");
        }
        const { origin, next: nextUrl } = state || {};
        if (!origin) return res.status(400).send("Missing origin");

        // Redirect to the original subdomain and path after login
        const redirectUrl = `https://${origin}${nextUrl || "/"}`;
        return res.redirect(redirectUrl);
    }
);

app.get("/auth/failure", (req, res) =>
    res.status(401).send("Authentication Failed")
);
app.get("/auth/logout", (req, res) => {
    req.logout(() => res.redirect("/"));
});

// 🧱 Auth Middleware
const proxyCache = {};
const requireAuth = async (req, res, next) => {
    // Debug session/cookie
    console.log("Session:", req.session);
    console.log("Cookies:", req.cookies);

    const host = req.headers.host?.replace(/:\d+$/, "");
    const subdomain = host?.split(".")[0];

    if (!host || !subdomain) return res.status(400).send("Bad request");

    // Skip for auth subdomain
    if (subdomain === "auth") return next();
    console.log(`🏠 Incoming request for ${subdomain}`);

    // Find site in DB
    const site = await prisma.website.findUnique({
        where: { subdomain },
    });

    if (!site) return res.status(404).send("Unknown site");
    console.log(`🌐 Incoming request for site:`, site);

    // If whitelist required → ensure user authenticated + whitelisted
    console.log("Whitelist required:", site.whitelistRequired);
    if (site.whitelistRequired) {
        if (!req.isAuthenticated?.() || !req.user?.emails?.[0]?.value) {
            // Store original url (including path/query) as state
            const originalUrl = encodeURIComponent(req.originalUrl);
            return res.redirect(
                `https://auth.${DOMAIN}/auth/login?origin=${host}&next=${originalUrl}`
            );
        }

        const email = req.user.emails[0].value;
        const user = await prisma.userWhitelist.findUnique({
            where: { email },
        });
        if (!user) {
            console.log("User not whitelisted:", email);
            return res.status(403).send("Not authorized");
        }

        console.log(`✅ Authenticated and authorized user: ${email}`);
    }

    // Proxy to service
    const target = `http://${site.targetService}:${site.targetPort}`;
    console.log(`🔀 Proxying request for ${subdomain} to ${target}`);

    // Cache proxy middleware per target for efficiency
    if (!proxyCache[target]) {
        proxyCache[target] = createProxyMiddleware({
            target,
            changeOrigin: true,
            // Optionally, add more proxy options here
        });
    }
    return proxyCache[target](req, res, next);
};

// 🧩 Use the middleware for all other routes
app.use(requireAuth);

// 🚀 Start server
app.listen(PORT, () => console.log(`✅ Proxy running on port ${PORT}`));
