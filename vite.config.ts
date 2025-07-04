import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "./src/config/");

  const proxyURL = env.VITE_PROXY_URL || "http://localhost:3000";

  console.log(`\nBackend Development Proxy URL: ${proxyURL}/api\n`);

  interface RuntimeCachingOption {
    urlPattern: RegExp;
    handler: string;
    options: {
      cacheName: string;
      expiration: {
        maxEntries: number;
        maxAgeSeconds: number;
      };
      cacheableResponse: {
        statuses: number[];
      };
    };
  }

  interface ServerProxyOption {
    [key: string]: {
      target: string;
      changeOrigin: boolean;
      rewrite?: (path: string) => string;
    };
  }

  interface ViteConfig {
    plugins: unknown[];
    build: {
      outDir: string;
    };
    resolve: {
      extensions: string[];
    };
    envDir: string;
    server: {
      proxy?: ServerProxyOption;
      host?: boolean;
    };
  }

  return <ViteConfig>{
    plugins: [
      react(),
      visualizer(),
      VitePWA({
        registerType: "autoUpdate",
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
          navigateFallbackDenylist: [
            /^\/file-service\/download\//, // Matches any path starting with /file-service/download/
            /^\/file-service\/public\/download\/[^\/]+\/[^\/]+/, // Matches /file-service/public/download/:id/:tempToken
            /^\/folder-service\/download-zip/, // Matches /folder-service/download-zip
            /^\/file-service\/stream-video\/[^\/]+/, // Matches /file-service/stream-video/:id
            /^\/file-service\/download\/[^\/]+/, // Matches /file-service/download/:id
          ],
          runtimeCaching: [
            <RuntimeCachingOption>{
              // Matches any URL that follows the pattern /file-service/thumbnail/{id}
              urlPattern: /\/file-service\/thumbnail\/[a-zA-Z0-9_-]+$/,
              handler: "CacheFirst",
              options: {
                cacheName: "dynamic-thumbnails",
                expiration: {
                  maxEntries: 1000,
                  maxAgeSeconds: 60 * 60 * 24 * 7, // Cache for 1 week
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
      }),
    ],
    build: {
      outDir: "dist-frontend",
    },
    resolve: {
      extensions: [".js", ".jsx", ".ts", ".tsx"], // Include these extensions
    },
    envDir: "./src/config/",
    server: {
      proxy: proxyURL
        ? <ServerProxyOption>{
            "/api": {
              target: proxyURL,
              changeOrigin: true,
              rewrite: (path: string) => path.replace(/^\/api/, ""),
            },
            "/file-service": {
              target: proxyURL,
              changeOrigin: true,
            },
            "/folder-service": {
              target: proxyURL,
              changeOrigin: true,
            },
          }
        : undefined,
      host: proxyURL ? true : undefined,
    },
  };
});
