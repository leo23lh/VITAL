import { configDefaults, defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    // influence-map/ is a separate app with its own test setup.
    exclude: [...configDefaults.exclude, "influence-map/**"],
  },
});
