import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/**/*.ts'],
    format: ['esm', 'cjs'],    // Output formats
    dts: true,                 // Generate .d.ts files
    bundle: false,             // Bundle the output
    sourcemap: true,           // Optional: generate source maps
    clean: true,               // Clean dist/ before build
    target: 'es2020',          // JavaScript target
    outDir: 'dist',            // Output directory
    esbuildOptions(options) {
        options.outbase = 'src'; // Ensures the output mirrors the 'src' directory structure
    },
});
