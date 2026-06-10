import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["cjs", "esm"],
    dts: true,
    clean: true,
    minify: true,
    sourcemap: true,
    treeshake: true,
  },
  {
    entry: ["src/cli.ts"],
    format: ["esm"],
    dts: false,
    clean: false,
    minify: false,
    sourcemap: false,
    banner: { js: "#!/usr/bin/env node" },
  },
]);
