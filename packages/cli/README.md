<div align="center">

# repo-xray

**X-ray any codebase — for humans and AI agents**

[![npm version](https://img.shields.io/npm/v/repo-xray.svg)](https://www.npmjs.com/package/repo-xray)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

<!-- TODO: GIF demo here -->

</div>

---

Most developer tools help you *write* code. repo-xray helps you *understand* it.

Point it at any TypeScript/JavaScript project and get an interactive dependency graph in your browser — or generate AI agent context files (CLAUDE.md, .cursorrules, AGENTS.md) so your AI coding assistant actually understands your codebase.

No API keys. No cloud. No LLMs. Pure static analysis, fully deterministic, runs offline.

## Features

- **Interactive dependency graph** — two-level visualization: directories first, then drill into files. Hover to highlight connections, click for details.
- **AI context generation** — generates CLAUDE.md, .cursorrules, and AGENTS.md with architecture overview, key modules, dependency map, and coding conventions.
- **Zero config** — just run `npx repo-xray` in any project. No setup, no API keys, no config files.
- **Deterministic** — same code always produces same output. No LLM randomness, no API calls.
- **JSON export** — raw dependency graph as JSON for custom tooling and integrations.

## Quick Start

```bash
npx repo-xray
```

That's it. Opens an interactive graph of your codebase at `localhost:3000`.

### Generate AI context files

```bash
npx repo-xray --agent claude     # generates CLAUDE.md
npx repo-xray --agent cursor     # generates .cursorrules
npx repo-xray --agent agents     # generates AGENTS.md
npx repo-xray --agent all        # generates all three
```

### Other options

```bash
npx repo-xray ./path/to/project         # analyze a specific directory
npx repo-xray --json                    # output raw graph to stdout
npx repo-xray --json -o graph.json      # save graph to file
npx repo-xray -p 8080                   # use a different port
```

## Interactive Graph

The web UI has two levels:

### Directory View (default)

The initial view shows your project's directories as nodes. Each node displays:

- **Directory name** and **file count**
- **External connections count** (imports going in/out of this directory)
- **Edge thickness** between directories = number of cross-directory imports

Click any directory to drill in.

### File View

Inside a directory, you see individual files:

- **Node size** = how connected the file is (imports + imported by)
- **Dashed ring** around a node = this file has imports from other directories
- **Arrows** show import direction
- **Hover** any node to highlight its connections and dim everything else
- **Click** a node to open the detail panel with exported symbols, imports, and dependents

## AI Context Generation

repo-xray generates context files tailored for each AI coding tool:

### CLAUDE.md

```markdown
# Project: my-app

## Architecture
- Entry points: src/index.ts, src/server.ts
- 142 modules, 847 exported symbols

## Key Modules
- src/core/engine.ts — business logic core (34 dependents)
- src/api/router.ts — main API router (23 routes)

## Dependency Map
- src/api/router.ts → src/core/engine.ts, src/auth/middleware.ts
- src/core/engine.ts → src/db/prisma.ts

## Conventions
- Export style: named
- Functions: camelCase, Classes: PascalCase
- Tests: co-located (*.test.ts)
```

### .cursorrules

Same data, formatted as rules for Cursor: project structure, key files, coding conventions, module dependencies.

### AGENTS.md

Same data, formatted for multi-agent systems: codebase overview, module map organized by architectural layers, conventions and warnings.

All formats are **token-efficient** — they provide a structured summary, not a code dump. Designed to fit in an LLM's context window while giving it a complete picture of your project.

## How It Works

```
Source Code
    |
 [Scanner]       finds all .ts/.js files (respects .gitignore)
    |
 [Parser]        extracts imports, exports, functions, classes, types
    |             (uses TypeScript compiler API — not regex, not LLM)
    |
 [Graph Builder] resolves imports, builds dependency graph
    |
 [Analyzer]      detects entry points, key modules, layers,
    |             circular dependencies, coding conventions
    |
 [Output]
    +-- Web UI       interactive graph in browser
    +-- Markdown     CLAUDE.md / .cursorrules / AGENTS.md
    +-- JSON         raw graph for integrations
```

The analysis is fully static — no code execution, no network calls, no LLM inference. The same codebase always produces the same output.

## Comparison

| | repo-xray | GitDiagram | Repomix | CodeBoarding |
|---|---|---|---|---|
| Interactive UI | Yes | Yes | No | Yes |
| CLAUDE.md / .cursorrules / AGENTS.md | Yes | No | No | No |
| Directory + file level views | Yes | No | N/A | Partial |
| Offline / no API key | Yes | No (GPT) | Yes | No (LLM) |
| Deterministic output | Yes | No | Yes | No |
| JSON export | Yes | No | Yes | No |
| Multi-language | TS/JS (more coming) | Any (via LLM) | Any | Partial |

**GitDiagram** generates diagrams via GPT — requires API key, non-deterministic, no file-level drill-down.

**Repomix** packs your entire codebase into one file for LLMs — useful but different: no visualization, no structured context, dumps raw code.

**CodeBoarding** generates onboarding docs via LLM — requires API key, non-deterministic, uses proprietary format instead of standard CLAUDE.md/.cursorrules.

## Supported Languages

| Language | Status |
|---|---|
| TypeScript (.ts, .tsx, .mts) | Supported |
| JavaScript (.js, .jsx, .mjs) | Supported |
| Python | Coming in v0.2 |
| Go, Rust, Java | Coming in v0.3 |

## Roadmap

- **v0.2** — MCP server for real-time codebase queries from AI agents, Python support, call graph analysis (who calls whom), circular dependency detection
- **v0.3** — Go/Rust support, file watching (live updates), git hook integration, diff mode

## Contributing

Contributions welcome! The project is a TypeScript monorepo (pnpm + Turborepo):

```bash
git clone https://github.com/ArtRachmo/repo-xray
cd repo-xray
pnpm install
pnpm build
pnpm test

# Run on any project
node packages/cli/dist/index.js /path/to/project
```

## License

MIT
