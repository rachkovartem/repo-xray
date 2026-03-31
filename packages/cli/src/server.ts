import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Graph, AnalysisResult } from '@repo-xray/core';
import { serializeGraph } from '@repo-xray/json';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
};

export async function startServer(graph: Graph, analysis: AnalysisResult, port: number): Promise<void> {
  const graphJson = serializeGraph(graph);

  // Resolve web dist directory - try @repo-xray/web first, fallback to relative
  let webDistDir: string;
  try {
    const webPkgPath = import.meta.resolve('@repo-xray/web/package.json');
    const webPkgDir = fileURLToPath(new URL('.', webPkgPath));
    webDistDir = join(webPkgDir, 'dist');
  } catch {
    const __dirname = fileURLToPath(new URL('.', import.meta.url));
    webDistDir = join(__dirname, '..', '..', 'web', 'dist');
  }

  const server = createServer(async (req, res) => {
    const url = req.url ?? '/';
    if (url === '/api/graph') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(graphJson);
      return;
    }
    const filePath = url === '/' ? join(webDistDir, 'index.html') : join(webDistDir, url);
    try {
      const content = await readFile(filePath);
      const ext = extname(filePath);
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] ?? 'application/octet-stream' });
      res.end(content);
    } catch {
      try {
        const index = await readFile(join(webDistDir, 'index.html'));
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(index);
      } catch {
        res.writeHead(404);
        res.end('Web UI not found. Run `pnpm build` first.');
      }
    }
  });

  server.listen(port, () => {
    console.log(`\n  repo-xray is running at http://localhost:${port}\n`);
    import('open').then(({ default: open }) => open(`http://localhost:${port}`)).catch(() => {});
  });
}
