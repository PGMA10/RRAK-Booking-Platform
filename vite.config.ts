import { defineConfig, PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Helper to safely load optional Replit plugins
async function loadReplitPlugins(): Promise<PluginOption[]> {
  // Only load Replit plugins when running on Replit (REPL_ID is set)
  if (!process.env.REPL_ID) {
    return [];
  }

  const plugins: PluginOption[] = [];

  try {
    const runtimeErrorModal = await import("@replit/vite-plugin-runtime-error-modal");
    plugins.push(runtimeErrorModal.default());
  } catch {
    // Plugin not available, skip it
  }

  // Only load dev plugins in non-production
  if (process.env.NODE_ENV !== "production") {
    try {
      const cartographer = await import("@replit/vite-plugin-cartographer");
      plugins.push(cartographer.cartographer());
    } catch {
      // Plugin not available, skip it
    }

    try {
      const devBanner = await import("@replit/vite-plugin-dev-banner");
      plugins.push(devBanner.devBanner());
    } catch {
      // Plugin not available, skip it
    }
  }

  return plugins;
}

export default defineConfig(async () => ({
  plugins: [
    react(),
    ...(await loadReplitPlugins()),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
}));