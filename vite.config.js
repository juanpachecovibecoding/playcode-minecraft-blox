import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// The PWA plugin generates the service worker + web manifest and injects the
// registration. It reads Vite's `base`, so the same config works for the Vercel
// build (base "/") and the GitHub Pages build (base "/brainblox/").
export default defineConfig({
  server: { host: true, port: 5173 },
  build: { target: "es2020" },
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["apple-touch-180.png"],
      manifest: {
        name: "BrainBlox - Jump and Learn",
        short_name: "BrainBlox",
        description: "A Roblox-style learning game for kids: jump, answer picture questions, collect coins, and level up.",
        theme_color: "#5fc6f0",
        background_color: "#6fbeff",
        display: "fullscreen",
        orientation: "landscape",
        categories: ["games", "education", "kids"],
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,ico,webmanifest}"],
        // keep the heavy generated illustrations OUT of precache (light install);
        // they are cached on first view via runtime caching below.
        globIgnores: ["**/assets/**"],
        navigateFallback: "index.html",
        runtimeCaching: [
          {
            // generated art (puzzles + scene backdrops) - cache on first view
            urlPattern: ({ url }) => url.pathname.includes("/assets/"),
            handler: "CacheFirst",
            options: {
              cacheName: "bb-art",
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // the Google Font so text still looks right offline
            urlPattern: ({ url }) => url.origin === "https://fonts.googleapis.com" || url.origin === "https://fonts.gstatic.com",
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
});
