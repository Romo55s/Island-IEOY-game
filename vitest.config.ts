import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["tests/shared/**/*.test.ts", "tests/client/**/*.test.ts?(x)", "tests/scene/**/*.test.ts?(x)"],
    setupFiles: ["./tests/setup.ts"],
  },
});
