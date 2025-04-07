import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],   // Your entry file(s)
  format: ['esm', 'cjs'],    // Output formats
  dts: true,                 // Generate .d.ts files
  sourcemap: true,           // Optional: generate source maps
  clean: true,               // Clean dist/ before build
  target: 'es2020',          // JavaScript target
  outDir: 'dist',            // Output directory
});
