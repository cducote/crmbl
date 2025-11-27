# crmbl - Monorepo Documentation Tool

*Pronounced "crumble"*

## What We're Building

A CLI tool that scans monorepos and creates hierarchical documentation (READMEs + JSON map) so AI agents can navigate codebases efficiently without wasting tokens on deep scans.

**Core Concept**: Break down your monorepo into breadcrumbs - each directory gets a README and an entry in a machine-readable JSON file that agents can use to decide where to explore.

## Key Requirements

### The tool must be agent-agnostic
- Core functionality is just file system scanning and JSON generation
- NO Claude/LLM integration in the tool itself
- Users point their own agents (Claude Code, Cursor, etc.) at the output

### Two-phase workflow
1. **Scan (free/fast)**: Walk directory tree, compare against existing `monorepo-map.json`, output list of new/missing directories
2. **Document (manual)**: User runs their LLM with the scan output to generate READMEs and update the JSON

## Repository Structure
```
crmbl/
├── src/
│   ├── scanner.js          # Directory traversal logic
│   ├── schema.js           # JSON schema definition
│   ├── config.js           # Config file handling
│   └── cli.js              # CLI entry point (commander)
├── templates/
│   ├── readme-template.md  # Default README structure
│   └── prompt-template.txt # LLM prompt template
├── tests/
│   └── scanner.test.js
├── examples/
│   └── sample-output/
├── .crmbl-config.example.json
├── package.json
├── README.md
└── LICENSE (MIT)
```

## CLI Commands
```bash
crmbl init        # Creates .crmbl-config.json with defaults
crmbl scan        # Walks dirs, outputs new/missing/unchanged
crmbl verify      # Checks if all dirs have READMEs (for CI)
crmbl prompt      # Generates prompt file with context for LLM
```

## Config File (.crmbl-config.json)
```json
{
  "rootPath": "./",
  "ignore": ["node_modules", ".git", "dist", "build", ".next"],
  "outputPath": "./monorepo-map.json",
  "readmeTemplate": "templates/readme-template.md"
}
```

## JSON Schema (monorepo-map.json)
```json
{
  "generated": "2025-01-15T10:30:00Z",
  "directories": {
    "/src/api": {
      "purpose": "API endpoints and business logic",
      "complexity": 4,
      "changeFrequency": "Frequently Modified",
      "entryPoints": ["index.ts", "routes.ts"],
      "internalDeps": ["/src/database", "/src/utils"],
      "externalDeps": ["express", "zod"],
      "readmePath": "/src/api/README.md",
      "keyFiles": [
        {"file": "routes.ts", "description": "API route definitions"},
        {"file": "middleware.ts", "description": "Auth and validation"}
      ],
      "subdirectories": ["/src/api/v1", "/src/api/v2"]
    }
  }
}
```

## README Template Structure

Each directory gets a README with:
- Purpose (what this directory does)
- Complexity score (1-5)
- Change frequency (Stable/Moderate/Frequently Modified)
- Last updated timestamp
- Key files with descriptions
- Internal/external dependencies
- Entry points
- Architecture notes

## Scanner Logic (scanner.js)

Core function should:
1. Read existing `monorepo-map.json` if it exists
2. Walk directory tree using glob/fs (respect ignore patterns from config)
3. Compare current directory structure vs what's in the JSON
4. Return object with:
   - `newDirs`: directories not in JSON yet
   - `missingDirs`: directories in JSON but no longer exist
   - `unchangedDirs`: directories that are already documented

Output should be human-readable (for CLI) and also save a `scan-results.json` for programmatic use.

## Dependencies

Keep it minimal:
- `commander` - CLI framework
- `glob` - File pattern matching
- `chalk` - Terminal colors (optional, for nice output)
- `jest` - Testing

## Build Order

1. Start with `scanner.js` - get directory traversal working
2. Add `cli.js` with `init` and `scan` commands
3. Create default config and template files
4. Add `verify` command for CI checks
5. Add `prompt` command to generate LLM-ready output
6. Write tests
7. Polish README and documentation
8. Publish to npm

## Usage Flow (After Tool is Built)
```bash
# User sets up in their monorepo
cd my-monorepo
npx crmbl init

# Scan for new directories
npx crmbl scan
# Output: "Found 3 new directories: /src/new-feature, /packages/api-v2, /lib/utils"

# User copies the prompt output and runs it with their agent
claude-code -f crmbl-prompt.txt
# OR paste into Cursor, etc.

# Agent generates READMEs and updates monorepo-map.json

# Set up CI to verify docs stay current
npx crmbl verify  # exits 1 if undocumented dirs found
```

## Package.json Essentials
```json
{
  "name": "crmbl",
  "version": "0.1.0",
  "description": "Break down your monorepo into breadcrumbs for AI agents",
  "bin": {
    "crmbl": "./src/cli.js"
  },
  "keywords": ["monorepo", "documentation", "ai-agents", "codebase-navigation"]
}
```

## First Test Case

After TechLens monorepo, use crmbl on itself to validate:
- Does it correctly identify its own directories?
- Is the JSON output valid?
- Are the generated READMEs useful?
- Does it save time when onboarding agents to the codebase?