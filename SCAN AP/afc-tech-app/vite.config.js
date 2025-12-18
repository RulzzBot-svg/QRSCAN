import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: { enabled: true }, // lets you test PWA in dev
      workbox: {
        // Cache app assets; API caching comes later (we'll handle data via IndexedDB)
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      },
      manifest: {
        name: "AFC Technician",
        short_name: "AFC Tech",
        display: "standalone",
        start_url: "/",
        scope: "/",
        background_color: "#ffffff",
        theme_color: "#0f172a",
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" }
        ]
      }
    })
  ]
});
