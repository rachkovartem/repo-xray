<div align="center">

# repo-xray

**X-ray any codebase — for humans and AI agents**

[![npm version](https://img.shields.io/npm/v/repo-xray.svg)](https://www.npmjs.com/package/repo-xray)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## Features

- **Interactive dependency graph** — explore any codebase visually in your browser
- **AI context generation** — CLAUDE.md, .cursorrules, AGENTS.md in one command
- **Zero config, zero API keys** — works offline, runs locally, fully deterministic
- **Multi-language** — TypeScript, JavaScript (Python, Go, Rust coming soon)
- **JSON export** — raw graph data for custom integrations

## Quick Start

```bash
# Visual mode — opens interactive graph in browser
npx repo-xray

# Generate AI agent context files
npx repo-xray --agent claude     # → CLAUDE.md
npx repo-xray --agent cursor     # → .cursorrules
npx repo-xray --agent agents     # → AGENTS.md
npx repo-xray --agent all        # → all three

# JSON export
npx repo-xray --json             # → stdout
npx repo-xray --json -o map.json # → file
```

## How It Works

repo-xray statically analyzes your codebase using the TypeScript compiler API:

1. **Scans** all source files (respects .gitignore)
2. **Parses** imports, exports, functions, classes, types
3. **Builds** a dependency graph with connectivity analysis
4. **Outputs** as interactive UI, AI context files, or raw JSON

No LLMs. No API keys. No cloud. Everything runs locally and produces deterministic output.

## Comparison

| | repo-xray | GitDiagram | Repomix | CodeBoarding |
|---|---|---|---|---|
| Interactive UI | Yes | Yes | No | Yes |
| CLAUDE.md / .cursorrules | Yes | No | No | No |
| Offline / no API key | Yes | No (GPT) | Yes | No (LLM) |
| Multi-language | Yes | No | Yes | Partial |

## Supported Languages

- TypeScript (.ts, .tsx, .mts)
- JavaScript (.js, .jsx, .mjs)
- Python — coming in v0.2
- Go, Rust — coming in v0.3

## License

MIT
