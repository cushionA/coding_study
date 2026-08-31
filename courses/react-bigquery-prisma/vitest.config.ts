import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    include: ["unit*/tests/**/*.test.ts", "unit*/tests/**/*.test.tsx"],
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    watch: false,
  },
});
