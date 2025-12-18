import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",

      // 🚫 Do NOT enable SW in dev (prevents weird caching during development)
      devOptions: { enabled: false },

      manifest: {
        name: "AFC Technician",
        short_name: "AFC Tech",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#0f172a",
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" }
        ]
      },

      workbox: {
        // ✅ This helps avoid stale/broken caches hanging around
        cleanupOutdatedCaches: true,

        // ✅ Cache your built assets (including css/js) once you deploy
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],

        // ✅ Don’t cache API calls here (we’ll do offline data via IndexedDB)
      }
    })
  ]
});
