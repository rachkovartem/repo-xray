import { cpSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const webDist = resolve(__dirname, '../../web/dist');
const target = resolve(__dirname, '../web-dist');

if (existsSync(webDist)) {
  cpSync(webDist, target, { recursive: true });
  console.log('Copied web UI dist to web-dist/');
} else {
  console.error('Warning: packages/web/dist not found. Run pnpm build from root first.');
}
