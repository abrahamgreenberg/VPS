import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import fs from "fs";

// Read and parse the manifest file
const manifest = JSON.parse(
    fs.readFileSync("./public/manifest.webmanifest", "utf-8")
);

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        VitePWA({
            registerType: "autoUpdate",
            manifest,
        }),
    ],
    build: {
        outDir: "dist",
    },
});
