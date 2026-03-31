import { defineConfig } from 'tsup';
import { resolve } from 'node:path';

const packagesDir = resolve(__dirname, '..');

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  outDir: 'dist',
  clean: true,
  bundle: true,
  banner: { js: '#!/usr/bin/env node' },
  // Bundle workspace packages into the output
  noExternal: ['@repo-xray/core', '@repo-xray/markdown', '@repo-xray/json'],
  // Keep these as external (user's node_modules or npx will install them)
  external: ['commander', 'open', 'typescript', 'ignore'],
  esbuildOptions(options) {
    // Resolve workspace packages to their built dist files
    options.alias = {
      '@repo-xray/core': resolve(packagesDir, 'core/dist/index.js'),
      '@repo-xray/markdown': resolve(packagesDir, 'markdown/dist/index.js'),
      '@repo-xray/json': resolve(packagesDir, 'json/dist/index.js'),
    };
  },
});
