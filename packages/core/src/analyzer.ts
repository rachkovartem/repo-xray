import { basename, dirname } from 'node:path';
import type { Graph, AnalysisResult, KeyModule, Conventions } from './types.js';

export function analyze(graph: Graph): AnalysisResult {
  return {
    entryPoints: findEntryPoints(graph),
    keyModules: findKeyModules(graph),
    layers: assignLayers(graph),
    circularDeps: findCircularDeps(graph),
    conventions: detectConventions(graph),
  };
}

function findEntryPoints(graph: Graph): string[] {
  const entryNames = new Set(['index', 'main', 'app', 'server']);
  const result: string[] = [];

  for (const [id, node] of graph.nodes) {
    const name = basename(id).replace(/\.[^.]+$/, '');
    const dirName = basename(dirname(id));

    // Skip test files — they are never entry points
    if (
      name.endsWith('.test') ||
      name.endsWith('.spec') ||
      dirName === '__tests__' ||
      dirName === 'test' ||
      dirName === 'tests'
    ) {
      continue;
    }

    const depth = id.split('/').length;

    // Files named index/main/app/server at depth <= 3
    if (entryNames.has(name) && depth <= 3) {
      result.push(id);
      continue;
    }

    // Files with inDegree=0 and outDegree>0 (excluding type-only files)
    if (node.inDegree === 0 && node.outDegree > 0) {
      const isTypeFile =
        name === 'types' ||
        name === 'type' ||
        node.symbols.every(
          (s) => s.kind === 'type' || s.kind === 'interface',
        );
      if (!isTypeFile) {
        result.push(id);
      }
    }
  }

  return [...new Set(result)].sort();
}

function findKeyModules(graph: Graph): KeyModule[] {
  const modules: KeyModule[] = [];

  for (const [id, node] of graph.nodes) {
    const totalConnections = node.inDegree + node.outDegree;
    if (totalConnections === 0) continue;

    let reason = '';
    if (node.inDegree >= 3) {
      reason = 'highly imported';
    } else if (node.outDegree >= 3) {
      reason = 'many dependencies';
    } else if (node.inDegree > 0 && node.outDegree > 0) {
      reason = 'connector module';
    } else if (node.inDegree > 0) {
      reason = 'imported module';
    } else {
      reason = 'has dependencies';
    }

    modules.push({
      id,
      reason,
      inDegree: node.inDegree,
      outDegree: node.outDegree,
    });
  }

  return modules
    .sort((a, b) => b.inDegree + b.outDegree - (a.inDegree + a.outDegree))
    .slice(0, 10);
}

function assignLayers(graph: Graph): Record<string, string[]> {
  const layers: Record<string, string[]> = {};

  for (const [id, node] of graph.nodes) {
    const name = basename(id).replace(/\.[^.]+$/, '');
    const dirName = basename(dirname(id));
    const layer = classifyLayer(name, dirName, node);
    if (!layers[layer]) layers[layer] = [];
    layers[layer].push(id);
  }

  // Sort entries in each layer
  for (const key of Object.keys(layers)) {
    layers[key].sort();
  }

  return layers;
}

function classifyLayer(
  name: string,
  dirName: string,
  node: { inDegree: number; outDegree: number; symbols: { kind: string }[] },
): string {
  // Test files
  if (
    name.endsWith('.test') ||
    name.endsWith('.spec') ||
    dirName === '__tests__' ||
    dirName === 'test' ||
    dirName === 'tests'
  ) {
    return 'test';
  }

  // Config files
  if (
    name === 'config' ||
    name.startsWith('config.') ||
    name === 'env' ||
    dirName === 'config'
  ) {
    return 'config';
  }

  // Entry points
  if (name === 'index' || name === 'main' || name === 'app' || name === 'server') {
    return 'entry';
  }

  // Type files
  if (
    name === 'types' ||
    name === 'type' ||
    name === 'interfaces' ||
    node.symbols.length > 0 &&
      node.symbols.every((s) => s.kind === 'type' || s.kind === 'interface')
  ) {
    return 'type';
  }

  // Util files
  if (
    name === 'utils' ||
    name === 'util' ||
    name === 'helpers' ||
    name === 'helper' ||
    dirName === 'utils' ||
    dirName === 'util' ||
    dirName === 'helpers'
  ) {
    return 'util';
  }

  return 'core';
}

function findCircularDeps(graph: Graph): [string, string][] {
  const edgeMap = new Map<string, Set<string>>();

  for (const edge of graph.edges) {
    if (!edgeMap.has(edge.from)) edgeMap.set(edge.from, new Set());
    edgeMap.get(edge.from)!.add(edge.to);
  }

  const circular: [string, string][] = [];
  const seen = new Set<string>();

  for (const [from, targets] of edgeMap) {
    for (const to of targets) {
      const key = [from, to].sort().join('::');
      if (seen.has(key)) continue;
      seen.add(key);

      // Check if there's a reverse edge
      if (edgeMap.get(to)?.has(from)) {
        circular.push([from, to]);
      }
    }
  }

  return circular;
}

function detectConventions(graph: Graph): Conventions {
  let namedExports = 0;
  let defaultExports = 0;
  let camelCaseFunctions = 0;
  let otherFunctions = 0;
  let pascalCaseClasses = 0;
  let otherClasses = 0;
  const dirs = new Set<string>();
  let hasTests = false;
  let testPattern = 'none';

  for (const [id, node] of graph.nodes) {
    dirs.add(dirname(id));
    const name = basename(id).replace(/\.[^.]+$/, '');

    if (name.endsWith('.test') || name.endsWith('.spec')) {
      hasTests = true;
      testPattern = name.endsWith('.test') ? '*.test.ts' : '*.spec.ts';
    }

    for (const sym of node.symbols) {
      if (!sym.exported) continue;

      if (sym.name === 'default') {
        defaultExports++;
      } else {
        namedExports++;
      }

      if (sym.kind === 'function') {
        if (/^[a-z]/.test(sym.name)) {
          camelCaseFunctions++;
        } else {
          otherFunctions++;
        }
      }
      if (sym.kind === 'class') {
        if (/^[A-Z]/.test(sym.name)) {
          pascalCaseClasses++;
        } else {
          otherClasses++;
        }
      }
    }
  }

  let exportStyle: 'named' | 'default' | 'mixed';
  if (defaultExports === 0) {
    exportStyle = 'named';
  } else if (namedExports === 0) {
    exportStyle = 'default';
  } else {
    exportStyle = 'mixed';
  }

  const namingFunctions =
    camelCaseFunctions > otherFunctions ? 'camelCase' : 'mixed';
  const namingClasses =
    pascalCaseClasses >= otherClasses && pascalCaseClasses > 0
      ? 'PascalCase'
      : 'unknown';

  const fileStructure =
    dirs.size <= 2 ? 'flat' : 'nested';

  if (!hasTests) {
    testPattern = 'none';
  }

  return {
    exportStyle,
    namingFunctions,
    namingClasses,
    fileStructure,
    testPattern,
  };
}
