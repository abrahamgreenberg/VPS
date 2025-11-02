// console.log("Hello World 123");
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import dotenv from "dotenv";
dotenv.config();

const app = express();

app.use(
  "/",
  createProxyMiddleware({
    target: "http://testsite6001:6001",
    changeOrigin: true,
    router: (req) => {
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
