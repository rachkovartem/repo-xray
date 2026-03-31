import type { Graph, AnalysisResult } from '@repo-xray/core';
import { generateClaude } from './claude.js';
import { generateCursor } from './cursor.js';
import { generateAgents } from './agents.js';

export type AgentFormat = 'claude' | 'cursor' | 'agents';

export function generateMarkdown(graph: Graph, analysis: AnalysisResult, format: AgentFormat): string {
  switch (format) {
    case 'claude': return generateClaude(graph, analysis);
    case 'cursor': return generateCursor(graph, analysis);
    case 'agents': return generateAgents(graph, analysis);
  }
}

export function getOutputFilename(format: AgentFormat): string {
  switch (format) {
    case 'claude': return 'CLAUDE.md';
    case 'cursor': return '.cursorrules';
    case 'agents': return 'AGENTS.md';
  }
}
