// console.log("Hello World 123");
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import dotenv from "dotenv";
dotenv.config();

const DEFAULT_URL = "http://testsite6001:80";

const app = express();

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

app.listen(process.env.AUTH_PORT, () => {
  console.log(`Auth service listening on port ${process.env.AUTH_PORT}`);
  console.log(`http://localhost:${process.env.AUTH_PORT}`);
});
