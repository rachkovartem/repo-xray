import type { Graph, AnalysisResult } from '@repo-xray/core';
import { basename, join, dirname } from 'node:path';
import { readFileSync, existsSync, readdirSync } from 'node:fs';

// ─── Package.json helpers ───

interface PkgInfo {
  name: string;
  description?: string;
  deps: string[];
  devDeps: string[];
}

function readPkg(dir: string): PkgInfo | null {
  const p = join(dir, 'package.json');
  try {
    const d = JSON.parse(readFileSync(p, 'utf-8'));
    return {
      name: d.name || basename(dir),
      description: d.description,
      deps: Object.keys(d.dependencies ?? {}),
      devDeps: Object.keys(d.devDependencies ?? {}),
    };
  } catch {
    return null;
  }
}

function findAllPackageJsons(rootDir: string): Map<string, PkgInfo> {
  const result = new Map<string, PkgInfo>();
  const root = readPkg(rootDir);
  if (root) result.set('.', root);

  // Check immediate subdirectories for package.json (monorepo)
  try {
    for (const entry of readdirSync(rootDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
      const sub = readPkg(join(rootDir, entry.name));
      if (sub) result.set(entry.name, sub);
    }
  } catch {}

  return result;
}

// ─── Stack detection ───

const STACK_CHECKS: [string, string[]][] = [
  ['Next.js', ['next']],
  ['React', ['react']],
  ['Vue', ['vue']],
  ['Svelte', ['svelte']],
  ['Angular', ['@angular/core']],
  ['NestJS', ['@nestjs/core']],
  ['Express', ['express']],
  ['Fastify', ['fastify']],
  ['Hono', ['hono']],
  ['Prisma', ['prisma', '@prisma/client']],
  ['Drizzle', ['drizzle-orm']],
  ['TypeORM', ['typeorm']],
  ['Zustand', ['zustand']],
  ['Redux', ['@reduxjs/toolkit', 'redux']],
  ['MobX', ['mobx']],
  ['Tailwind CSS', ['tailwindcss']],
  ['Vite', ['vite']],
  ['Vitest', ['vitest']],
  ['Jest', ['jest']],
  ['Playwright', ['@playwright/test']],
  ['Dexie', ['dexie']],
  ['PostgreSQL', ['pg', 'postgres']],
  ['MongoDB', ['mongoose', 'mongodb']],
];

function detectStack(allDeps: string[]): string[] {
  const stack: string[] = [];
  for (const [name, pkgs] of STACK_CHECKS) {
    if (pkgs.some(p => allDeps.includes(p))) stack.push(name);
  }
  return stack;
}

// ─── Smart directory key ───

function getSmartDirKey(fileId: string): string {
  const parts = fileId.split('/');
  if (parts.length <= 1) return '.';

  // For monorepos: use 3 levels when first dir is backend/frontend/packages/apps
  const topLevelMonorepo = ['backend', 'frontend', 'packages', 'apps', 'server', 'client', 'api', 'web'];
  if (topLevelMonorepo.includes(parts[0]) && parts.length >= 3) {
    // backend/src/domain/... → backend/src/domain
    // frontend/src/components/... → frontend/src/components
    if (parts[1] === 'src' && parts.length >= 4) {
      return parts.slice(0, 3).join('/');
    }
    return parts.slice(0, Math.min(3, parts.length - 1)).join('/');
  }

  // For flat projects: src/components/... → src/components
  if (parts[0] === 'src' && parts.length >= 3) {
    return parts.slice(0, 2).join('/');
  }

  if (parts.length === 2) return parts[0];
  return parts.slice(0, 2).join('/');
}

// ─── Module classification ───

function describeModule(id: string, inDeg: number, outDeg: number, symbols: string[]): string {
  const parts: string[] = [];

  if (inDeg >= 10) parts.push(`core dependency (${inDeg} modules depend on it)`);
  else if (inDeg >= 3) parts.push(`shared module (${inDeg} dependents)`);

  if (outDeg >= 10) parts.push(`orchestrator (imports ${outDeg} modules)`);
  else if (outDeg >= 5) parts.push(`integrates ${outDeg} modules`);

  if (parts.length === 0) {
    if (inDeg > outDeg) parts.push(`utility (${inDeg} dependents)`);
    else parts.push(`connector (in: ${inDeg}, out: ${outDeg})`);
  }

  if (symbols.length > 0 && symbols.length <= 5) {
    parts.push(`exports: ${symbols.join(', ')}`);
  }

  return parts.join('. ');
}

// ─── Entry point filtering ───

function isRealEntryPoint(id: string): boolean {
  // Only keep actual app entry points, not stores/repositories/providers
  const name = basename(id).replace(/\.[^.]+$/, '');

  // These are entry points
  if (['main', 'index', 'server', 'app'].includes(name)) return true;

  // Next.js pages
  if (name === 'page' || name === 'layout') return true;

  return false;
}

// ─── Main generator ───

export function generateClaude(graph: Graph, analysis: AnalysisResult): string {
  const packages = findAllPackageJsons(graph.rootDir);
  const rootPkg = packages.get('.') ?? { name: basename(graph.rootDir), deps: [], devDeps: [] };
  const isMonorepo = packages.size > 1;

  // Collect ALL deps from all package.jsons
  const allDeps = new Set<string>();
  for (const pkg of packages.values()) {
    for (const d of pkg.deps) allDeps.add(d);
    for (const d of pkg.devDeps) allDeps.add(d);
  }
  const stack = detectStack([...allDeps]);

  const lines: string[] = [];

  lines.push(`# ${rootPkg.name}`);
  lines.push('');
  lines.push('> Auto-generated by repo-xray');
  lines.push('');

  // ── Overview ──
  if (rootPkg.description || stack.length > 0) {
    if (rootPkg.description) {
      lines.push(rootPkg.description);
      lines.push('');
    }
    if (stack.length > 0) {
      lines.push(`**Stack:** ${stack.join(', ')}`);
      lines.push('');
    }
  }

  // ── Project structure ──
  lines.push('## Project Structure');
  lines.push('');

  if (isMonorepo) {
    lines.push(`Monorepo with ${packages.size - 1} packages:`);
    lines.push('');
    for (const [dir, pkg] of packages) {
      if (dir === '.') continue;
      const pkgStack = detectStack([...pkg.deps, ...pkg.devDeps]);
      const stackStr = pkgStack.length > 0 ? ` (${pkgStack.join(', ')})` : '';
      lines.push(`- **\`${dir}/\`**${stackStr}`);
    }
    lines.push('');
  }

  // Directory breakdown
  const dirCounts = new Map<string, number>();
  for (const id of graph.nodes.keys()) {
    const dir = getSmartDirKey(id);
    dirCounts.set(dir, (dirCounts.get(dir) ?? 0) + 1);
  }
  const sortedDirs = [...dirCounts.entries()].sort((a, b) => b[1] - a[1]);

  lines.push(`${graph.meta.totalModules} modules across ${sortedDirs.length} directories:`);
  lines.push('');
  for (const [dir, count] of sortedDirs) {
    lines.push(`- \`${dir}/\` — ${count} files`);
  }
  lines.push('');

  // ── Entry points (only real ones) ──
  const realEntryPoints = analysis.entryPoints.filter(isRealEntryPoint);
  if (realEntryPoints.length > 0) {
    lines.push('## Entry Points');
    lines.push('');
    for (const ep of realEntryPoints) {
      const node = graph.nodes.get(ep);
      const exports = node ? node.symbols.filter(s => s.exported).map(s => s.name) : [];
      const exportStr = exports.length > 0 && exports.length <= 5 ? ` — exports: ${exports.join(', ')}` : '';
      lines.push(`- \`${ep}\`${exportStr}`);
    }
    lines.push('');
  }

  // ── Key Modules ──
  lines.push('## Key Modules');
  lines.push('');
  lines.push('Most connected modules — changes here have the widest impact:');
  lines.push('');
  for (const mod of analysis.keyModules) {
    const node = graph.nodes.get(mod.id);
    const exports = node
      ? node.symbols.filter(s => s.exported).map(s => s.name)
      : [];
    const desc = describeModule(mod.id, mod.inDegree, mod.outDegree, exports);
    lines.push(`- **\`${mod.id}\`** — ${desc}`);
  }
  lines.push('');

  // ── Module dependency flow ──
  const dirEdges = new Map<string, Map<string, number>>();
  for (const edge of graph.edges) {
    const fromDir = getSmartDirKey(edge.from);
    const toDir = getSmartDirKey(edge.to);
    if (fromDir === toDir) continue;
    if (!dirEdges.has(fromDir)) dirEdges.set(fromDir, new Map());
    const targets = dirEdges.get(fromDir)!;
    targets.set(toDir, (targets.get(toDir) ?? 0) + 1);
  }

  if (dirEdges.size > 0) {
    lines.push('## Module Dependencies');
    lines.push('');
    lines.push('How directories depend on each other (count = number of import edges):');
    lines.push('');

    const sorted = [...dirEdges.entries()].sort((a, b) => b[1].size - a[1].size);
    for (const [from, targets] of sorted) {
      const targetList = [...targets.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([dir, count]) => count > 1 ? `${dir} (${count})` : dir);
      lines.push(`- \`${from}\` → ${targetList.join(', ')}`);
    }
    lines.push('');
  }

  // ── Conventions ──
  const c = analysis.conventions;
  const conventions: string[] = [];
  if (c.exportStyle !== 'mixed') conventions.push(`${c.exportStyle} exports`);
  if (c.namingFunctions !== 'mixed') conventions.push(`functions: ${c.namingFunctions}`);
  if (c.namingClasses !== 'unknown' && c.namingClasses !== 'mixed') conventions.push(`classes: ${c.namingClasses}`);
  if (c.testPattern !== 'none') conventions.push(`tests: ${c.testPattern}`);

  if (conventions.length > 0) {
    lines.push('## Conventions');
    lines.push('');
    lines.push(conventions.join(' · '));
    lines.push('');
  }

  // ── Circular Dependencies ──
  if (analysis.circularDeps.length > 0) {
    lines.push('## Circular Dependencies');
    lines.push('');
    for (const [a, b] of analysis.circularDeps) {
      lines.push(`- \`${a}\` ↔ \`${b}\``);
    }
    lines.push('');
  }

  return lines.join('\n');
}
