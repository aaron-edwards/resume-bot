import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  outDir: "dist",
  target: "node22",
  outExtensions: () => ({ js: ".js" }),
});
