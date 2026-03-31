import { relative, resolve, dirname, extname } from 'node:path';
import { stat } from 'node:fs/promises';
import { scanFiles } from './scanner.js';
import { parseFile } from './parser.js';
import type { Graph, GraphNode, GraphEdge } from './types.js';

export async function buildGraph(rootDir: string): Promise<Graph> {
  const absRoot = resolve(rootDir);
  const filePaths = await scanFiles(absRoot);

  // Build a set of known file paths for quick lookup
  const knownFiles = new Set(filePaths);

  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  let totalSymbols = 0;

  // Parse all files and create nodes
  const parseResults = await Promise.all(
    filePaths.map(async (fp) => {
      const result = await parseFile(fp);
      return { filePath: fp, result };
    }),
  );

  for (const { filePath, result } of parseResults) {
    const id = relative(absRoot, filePath);
    totalSymbols += result.symbols.length;
    nodes.set(id, {
      id,
      filePath,
      symbols: result.symbols,
      inDegree: 0,
      outDegree: 0,
    });
  }

  // Create edges from imports
  for (const { filePath, result } of parseResults) {
    const fromId = relative(absRoot, filePath);
    const dir = dirname(filePath);

    for (const imp of result.imports) {
      // Only resolve relative imports
      if (!imp.source.startsWith('.')) continue;

      const resolved = resolveImport(dir, imp.source, knownFiles);
      if (!resolved) continue;

      const toId = relative(absRoot, resolved);
      if (!nodes.has(toId)) continue;
      if (fromId === toId) continue;

      edges.push({
        from: fromId,
        to: toId,
        type: 'import',
        symbols: imp.symbols,
      });
    }
  }

  // Calculate degrees
  for (const edge of edges) {
    const fromNode = nodes.get(edge.from);
    const toNode = nodes.get(edge.to);
    if (fromNode) fromNode.outDegree++;
    if (toNode) toNode.inDegree++;
  }

  return {
    nodes,
    edges,
    rootDir: absRoot,
    meta: {
      language: 'typescript',
      totalModules: nodes.size,
      totalSymbols,
    },
  };
}

function resolveImport(
  fromDir: string,
  importSource: string,
  knownFiles: Set<string>,
): string | undefined {
  const resolved = resolve(fromDir, importSource);

  // Direct match
  if (knownFiles.has(resolved)) return resolved;

  // Strip .js/.mjs/.jsx extension and try TS equivalents
  const ext = extname(importSource);
  const jsExtensions: Record<string, string[]> = {
    '.js': ['.ts', '.tsx'],
    '.mjs': ['.mts'],
    '.jsx': ['.tsx'],
  };

  if (jsExtensions[ext]) {
    const base = resolved.slice(0, -ext.length);
    for (const tsExt of jsExtensions[ext]) {
      const candidate = base + tsExt;
      if (knownFiles.has(candidate)) return candidate;
    }
  }

  // No extension — try common extensions
  if (!ext) {
    const tryExts = ['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs'];
    for (const e of tryExts) {
      const candidate = resolved + e;
      if (knownFiles.has(candidate)) return candidate;
    }

    // Try index files in directory
    for (const e of tryExts) {
      const candidate = resolve(resolved, 'index' + e);
      if (knownFiles.has(candidate)) return candidate;
    }
  }

  return undefined;
}
