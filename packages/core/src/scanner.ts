import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import ignore, { type Ignore } from 'ignore';

const ALWAYS_IGNORE = ['node_modules', '.git', 'dist', 'build', 'coverage', '.turbo'];
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs']);

export async function scanFiles(rootDir: string): Promise<string[]> {
  const ig = await loadGitignore(rootDir);
  const results: string[] = [];
  await walk(rootDir, rootDir, ig, results);
  return results.sort();
}

async function loadGitignore(rootDir: string): Promise<Ignore> {
  const ig = (typeof ignore === 'function' ? ignore : (ignore as any).default)();
  try {
    const content = await readFile(join(rootDir, '.gitignore'), 'utf-8');
    ig.add(content);
  } catch {
    // no .gitignore
  }
  ig.add(ALWAYS_IGNORE);
  return ig;
}

async function walk(dir: string, rootDir: string, ig: Ignore, results: string[]): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relPath = relative(rootDir, fullPath);
    if (ig.ignores(relPath)) continue;
    if (entry.isDirectory()) {
      if (ig.ignores(relPath + '/')) continue;
      await walk(fullPath, rootDir, ig, results);
    } else if (entry.isFile() && hasValidExtension(entry.name)) {
      results.push(fullPath);
    }
  }
}

function hasValidExtension(filename: string): boolean {
  const dot = filename.lastIndexOf('.');
  if (dot === -1) return false;
  return EXTENSIONS.has(filename.slice(dot));
}
