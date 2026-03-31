import { Command } from 'commander';
import { buildGraph, analyze } from '@repo-xray/core';
import { serializeGraph } from '@repo-xray/json';
import { generateMarkdown, getOutputFilename, type AgentFormat } from '@repo-xray/markdown';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { startServer } from './server.js';

const program = new Command();

program
  .name('repo-xray')
  .description('X-ray any codebase — for humans and AI agents')
  .version('0.1.0')
  .argument('[dir]', 'directory to analyze', '.')
  .option('--agent <format>', 'generate AI agent context file (claude, cursor, agents, all)')
  .option('--json', 'output graph as JSON')
  .option('-o, --output <file>', 'write JSON to file instead of stdout')
  .option('-p, --port <number>', 'port for web UI', '3000')
  .action(async (dir, opts) => {
    const rootDir = resolve(dir);
    process.stderr.write(`Scanning ${rootDir}...\n`);

    const graph = await buildGraph(rootDir);
    const analysis = analyze(graph);
    process.stderr.write(`Found ${graph.meta.totalModules} modules, ${graph.meta.totalSymbols} symbols\n`);

    if (opts.json) {
      const json = serializeGraph(graph);
      if (opts.output) {
        await writeFile(opts.output, json, 'utf-8');
        process.stderr.write(`Written to ${opts.output}\n`);
      } else {
        process.stdout.write(json + '\n');
      }
      return;
    }

    if (opts.agent) {
      const formats: AgentFormat[] = opts.agent === 'all'
        ? ['claude', 'cursor', 'agents']
        : [opts.agent as AgentFormat];
      for (const format of formats) {
        const md = generateMarkdown(graph, analysis, format);
        const filename = getOutputFilename(format);
        const outPath = resolve(rootDir, filename);
        await writeFile(outPath, md, 'utf-8');
        process.stderr.write(`Generated ${outPath}\n`);
      }
      return;
    }

    const port = parseInt(opts.port ?? '3000', 10);
    await startServer(graph, analysis, port);
  });

program.parse();
