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
- **Code health analysis** — automatically detects God Objects, unstable hubs, and excessive fan-out. Red/yellow indicators on the graph + issues panel with actionable warnings.
- **AI context generation** — generates CLAUDE.md, .cursorrules, and AGENTS.md with stack detection, architecture overview, key modules, directory-level dependencies, and coding conventions.
- **Monorepo-aware** — detects monorepo structure, reads all package.json files, shows per-package tech stack.
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

- **Directory name** and **file count** (all nested files, not just first level)
- **External connections count** (imports going in/out of this directory)
- **Edge thickness** between directories = number of cross-directory imports

Monorepo directories are grouped intelligently: `backend/src/domain`, `frontend/src/components` — not just `backend/src` as one blob.

Click any directory to drill in.

### File View

Inside a directory, you see individual files:

- **Node size** = how connected the file is (imports + imported by)
- **Red nodes with glow** = God Objects (high inDegree AND high outDegree) — modules that everything depends on and that depend on everything
- **Yellow nodes** = modules that need attention (excessive fan-out or unstable hubs)
- **Arrows** show import direction
- **Hover** any node to highlight its connections and dim everything else
- **Click** a node to open the detail panel with exported symbols, imports, dependents, and health warnings

### Issues Panel

When problems are detected, an issues panel appears in the top-right corner showing all problematic modules with severity levels:

- **CRITICAL** — God Object: 10+ modules depend on it AND it imports 10+ modules. Very hard to change safely. Consider splitting.
- **WARNING** — High fan-out (imports 15+ modules) or unstable hub (15+ dependents but also has its own dependencies).

Click any issue to navigate directly to the problematic file.

## AI Context Generation

repo-xray generates context files tailored for each AI coding tool. The output is designed to be **token-efficient** — structured summaries, not code dumps.

### What's included

- **Stack detection** — automatically identifies frameworks and libraries from all package.json files (Next.js, React, NestJS, Prisma, Zustand, Tailwind, etc.)
- **Monorepo structure** — detects packages, shows per-package tech stack
- **Directory breakdown** — file counts at meaningful directory depth
- **Entry points** — only real app entry points (main.ts, pages), not stores or utilities
- **Key modules** — most connected modules with human-readable descriptions ("core dependency — 44 modules depend on it", "orchestrator — imports 29 modules")
- **Directory-level dependencies** — compact dependency map showing how directories depend on each other, with import counts
- **Conventions** — export style, naming patterns, test patterns (skips unknown/mixed values)
- **Circular dependencies** — flagged when detected

### Example output (CLAUDE.md)

```markdown
# my-app

> Auto-generated by repo-xray

**Stack:** Next.js, React, NestJS, Prisma, Zustand, Tailwind CSS, Vitest, PostgreSQL

## Project Structure

Monorepo with 2 packages:

- **backend/** (NestJS, Prisma, Jest, PostgreSQL)
- **frontend/** (Next.js, React, Zustand, Tailwind CSS, Vitest)

381 modules across 23 directories:

- `backend/src/application/` — 92 files
- `frontend/src/components/` — 31 files
- `frontend/src/app/` — 23 files
- ...

## Entry Points

- `backend/src/main.ts`
- `frontend/src/app/[locale]/app/page.tsx`
- `frontend/src/app/[locale]/layout.tsx`

## Key Modules

- **backend/src/domain/repositories/user-media-item.repository.interface.ts**
  — core dependency (44 modules depend on it)
- **backend/src/modules/lists/lists.module.ts**
  — orchestrator (imports 29 modules)
- **frontend/src/lib/cn.ts**
  — core dependency (32 modules depend on it)

## Module Dependencies

- `backend/src/application` → backend/src/domain (246)
- `backend/src/modules` → backend/src/application (123), backend/src/domain (68)
- `frontend/src/components` → frontend/src/lib (34), frontend/src/i18n (25)

## Conventions

named exports · classes: PascalCase · tests: *.test.ts
```

### .cursorrules

Same analysis, formatted as project rules for Cursor: project structure, directory overview, key files, coding conventions.

### AGENTS.md

Same analysis, formatted for multi-agent systems: codebase overview, directory structure, key modules, conventions.

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
    |             (handles .js→.ts resolution, extensionless imports,
    |              non-standard extensions like .store.ts, index files)
    |
 [Analyzer]      detects entry points, key modules, health issues,
    |             circular dependencies, coding conventions
    |
 [Output]
    +-- Web UI       interactive graph with health indicators
    +-- Markdown     CLAUDE.md / .cursorrules / AGENTS.md
    +-- JSON         raw graph for integrations
```

The analysis is fully static — no code execution, no network calls, no LLM inference. The same codebase always produces the same output.

## Comparison

| | repo-xray | GitDiagram | Repomix | CodeBoarding |
|---|---|---|---|---|
| Interactive UI | Yes | Yes | No | Yes |
| Code health analysis | Yes | No | No | No |
| CLAUDE.md / .cursorrules / AGENTS.md | Yes | No | No | No |
| Directory + file level views | Yes | No | N/A | Partial |
| Monorepo-aware | Yes | No | Partial | No |
| Stack detection | Yes | No | No | No |
| Offline / no API key | Yes | No (GPT) | Yes | No (LLM) |
| Deterministic output | Yes | No | Yes | No |
| JSON export | Yes | No | Yes | No |

**GitDiagram** generates diagrams via GPT — requires API key, non-deterministic, no file-level drill-down, no health analysis.

**Repomix** packs your entire codebase into one file for LLMs — useful but different: no visualization, no structured context, no health analysis, dumps raw code.

**CodeBoarding** generates onboarding docs via LLM — requires API key, non-deterministic, uses proprietary format instead of standard CLAUDE.md/.cursorrules.

## Supported Languages

| Language | Status |
|---|---|
| TypeScript (.ts, .tsx, .mts) | Supported |
| JavaScript (.js, .jsx, .mjs) | Supported |
| Python | Coming in v0.2 |
| Go, Rust, Java | Coming in v0.3 |

## Roadmap

- **v0.2** — MCP server for real-time codebase queries from AI agents, Python support, call graph analysis (who calls whom)
- **v0.3** — Go/Rust support, file watching (live updates), git hook integration, diff mode

## Contributing

Contributions welcome! The project is a TypeScript monorepo (pnpm + Turborepo):

```bash
git clone https://github.com/rachkovartem/repo-xray
cd repo-xray
pnpm install
pnpm build
pnpm test

# Run on any project
node packages/cli/dist/index.js /path/to/project
```

## License

MIT
