import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();

// TODO: FIX POLLING & INITIAL LOAD
// Implement dynamic HostMap loading and updating from the database
// IMPLEMENT GOOGLE AUTHENTCIATION MIDDLEWARE
// IMPLEMENT WHITELIST CHECKING MIDDLEWARE
// IMPLEMENT JWT AUTHENTICATION MIDDLEWARE
// authentication on admin route
// auto refreshing cache every hour?
// DONE :D

// Dynamic HostMap that will be populated from database
const HostMap = new Map();

// Load/reload websites from database into HostMap
const reloadHostMap = async () => {
  try {
    const websites = await prisma.website.findMany();

    // Clear and repopulate map
    HostMap.clear();
    websites.forEach((website) => {
      HostMap.set(website.subdomain, {
        target: `http://${website.targetService}:${website.targetPort}`,
        whitelistRequired: website.whitelistRequired,
        ...website,
      });
    });

    console.log(`HostMap reloaded with ${websites.length} websites`);
    return { success: true, count: websites.length, timestamp: new Date() };
  } catch (error) {
    console.error("Error reloading HostMap:", error);
    return { success: false, error: error.message };
  }
};

// Manual refresh endpoint - can be triggered from Portainer or any HTTP client
app.get("/admin/refresh-hostmap", async (req, res) => {
  const result = await reloadHostMap();
  res.json({
    message: result.success
      ? "HostMap refreshed successfully"
      : "Failed to refresh HostMap",
    ...result,
  });
});

// Health check endpoint
app.get("/admin/health", (req, res) => {
  res.json({
    status: "healthy",
    hostmapSize: HostMap.size,
    uptime: process.uptime(),
  });
});

const authMiddleware = (req, res, next) => {
  const host = req.headers.host;
  const protocol = req.headers["x-forwarded-proto"] || "http";
  const originalUrl = `${protocol}://${host}${req.originalUrl}`;

  console.log("Original URL:", originalUrl);
  console.log("Host:", host);
  console.log("Path:", req.originalUrl);
  console.log("Protocol:", protocol);
  console.log("Host", host);
  console.log("Host name from headers:", req.headers.hostname);

  return next();
};

app.use(authMiddleware);

app.use(
  "/",
  createProxyMiddleware({
    target: "http://test-nodejs-app:4001",
    changeOrigin: true,
    logLevel: "debug",
    router: (req) => {
      const host = req.headers.host;
      const hostWithoutPort = host.split(":")[0];
      const website = HostMap.get(hostWithoutPort);

      if (website) {
        console.log(`Redirecting to ${website.target} for host ${host}`);
        return website.target;
      }

      console.log(`No mapping found for ${hostWithoutPort}, using default`);
      return "http://test-nodejs-app:4002";
    },
  })
);

// Initialize HostMap before starting server
reloadHostMap().then(() => {
  app.listen(5050, () => {
    console.log("Reverse proxy running on port 5050");
    console.log(
      "Manual refresh available at: http://localhost:5050/admin/refresh-hostmap"
    );
  });
});
