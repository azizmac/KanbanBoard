import { defineConfig } from "vitest/config";

// Unit tests live next to the code as src/**/*.test.ts. The Playwright browser
// smoke test (e2e/*.spec.ts) runs under a different runner — keep vitest out of
// it (and out of node_modules).
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
});
