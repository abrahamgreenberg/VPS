import express from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { createProxyMiddleware } from "http-proxy-middleware";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();

const PORT = process.env.PORT;
const DOMAIN = process.env.DOMAIN;

// 🔐 Session setup
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
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

// 🧭 Login route
app.get(
    "/auth/login",
    passport.authenticate("google", { scope: ["email", "profile"] })
);

// 🧭 Callback
app.get(
    "/auth/callback",
    passport.authenticate("google", {
        failureRedirect: "/auth/failure",
        session: true,
    }),
    (req, res) => {
        const redirect = req.query.origin
            ? `https://${req.query.origin}`
            : `https://${DOMAIN}`;
        res.redirect(redirect);
    }
);

app.get("/auth/failure", (req, res) =>
    res.status(401).send("Authentication Failed")
);
app.get("/auth/logout", (req, res) => {
    req.logout(() => res.redirect("/"));
});

// 🧱 Auth Middleware
const requireAuth = async (req, res, next) => {
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
    console.log(`🌐 Incoming request for site: ${site}`);
    console.log(site);
    // If whitelist required → ensure user authenticated + whitelisted
    console.log(site.whitelistRequired);
    if (site.whitelistRequired) {
        if (!req.isAuthenticated?.() || !req.user?.emails?.[0]?.value) {
            return res.redirect(
                `https://auth.${DOMAIN}/auth/login?origin=${host}`
            );
        }

        const email = req.user.emails[0].value;
        const user = await prisma.userWhitelist.findUnique({
            where: { email },
        });
        if (!user) return res.status(403).send("Not authorized");

        console.log(`✅ Authenticated and authorized user: ${email}`);
    }

    // Proxy to service
    const target = `http://${site.targetService}:${site.targetPort}`;
    console.log(site.targetService);
    console.log(site.targetPort);

    console.log(`🔀 Proxying request for ${subdomain} to ${target}`);

    createProxyMiddleware({
        target,
        changeOrigin: true,
    })(req, res, next);
};

// 🧩 Use the middleware for all other routes
app.use(requireAuth);

// 🚀 Start server
app.listen(PORT, () => console.log(`✅ Proxy running on port ${PORT}`));
