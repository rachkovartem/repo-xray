import { cpSync, copyFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Copy web UI dist
const webDist = resolve(__dirname, '../../web/dist');
const target = resolve(__dirname, '../web-dist');

if (existsSync(webDist)) {
  cpSync(webDist, target, { recursive: true });
  console.log('Copied web UI dist to web-dist/');
} else {
  console.error('Warning: packages/web/dist not found. Run pnpm build from root first.');
}

// Copy README from repo root
const rootReadme = resolve(__dirname, '../../../README.md');
const cliReadme = resolve(__dirname, '../README.md');

if (existsSync(rootReadme)) {
  copyFileSync(rootReadme, cliReadme);
  console.log('Copied README.md from repo root');
}
