# crmbl

*Pronounced "crumble"*

Break down your monorepo into breadcrumbs for AI agents to navigate efficiently.

## What is crmbl?

**crmbl** is a CLI tool that scans your monorepo and creates hierarchical documentation (READMEs + JSON map) so AI agents can understand your codebase structure without wasting tokens on deep scans.

Instead of having AI agents blindly explore your entire monorepo, **crmbl** creates a structured map that agents can use to:
- Quickly understand what each directory does
- Find the right code to modify
- Navigate dependencies between modules
- Identify entry points and key files

## Key Features

- **Agent-agnostic**: Works with Claude Code, Cursor, and any AI coding assistant
- **Two-phase workflow**: Fast scanning + separate documentation generation
- **Zero AI integration**: Just generates files and prompts - you choose how to use them
- **CI-friendly**: Verify command ensures docs stay current
- **Lightweight**: Minimal dependencies, fast execution

## Installation

```bash
npm install -g crmbl
```

Or use directly with npx:

```bash
npx crmbl init
```

## Quick Start

```bash
# Initialize in your monorepo
cd my-monorepo
crmbl init

# Scan for directories
crmbl scan

# Generate prompt for your AI agent
crmbl prompt

# Copy crmbl-prompt.txt content to your AI agent
# Let it generate READMEs and update crmbl-map.json

# Verify documentation is complete (great for CI)
crmbl verify
```

## Commands

### `crmbl init`

Creates a `.crmbl-config.json` file with default settings.

**Options:**
- `-f, --force` - Overwrite existing config file

**Example:**
```bash
crmbl init
```

### `crmbl scan`

Scans your directory tree and compares it against the existing `crmbl-map.json` to identify:
- New directories (not yet documented)
- Missing directories (in map but deleted from disk)
- Documented directories (already in the map)

**Options:**
- `-o, --output <path>` - Custom output path for scan results (default: `./scan-results.json`)
- `-q, --quiet` - Suppress detailed output

**Example:**
```bash
crmbl scan
crmbl scan -o ./my-scan.json
```

### `crmbl prompt`

Generates a prompt file with context about new directories that needs documentation. This prompt can be copied to any AI agent (Claude Code, Cursor, etc.) to generate the READMEs and update the map.

**Options:**
- `-o, --output <path>` - Custom output path for prompt (default: `./crmbl-prompt.txt`)
- `-t, --template <path>` - Use a custom prompt template

**Example:**
```bash
crmbl prompt
crmbl prompt -o ./docs/prompt.txt
```

### `crmbl verify`

Verifies that all documented directories have their corresponding README files. Useful for CI/CD pipelines to ensure documentation stays current.

**Options:**
- `-q, --quiet` - Only output errors

**Example:**
```bash
crmbl verify
```

**CI Usage:**
```yaml
# .github/workflows/verify-docs.yml
- name: Verify crmbl documentation
  run: npx crmbl verify
```

## Configuration

The `.crmbl-config.json` file controls how crmbl scans your repository:

```json
{
  "rootPath": "./",
  "ignore": [
    "node_modules",
    ".git",
    "dist",
    "build",
    ".next",
    "coverage",
    ".cache"
  ],
  "outputPath": "./crmbl-map.json",
  "readmeTemplate": "templates/readme-template.md"
}
```

**Options:**
- `rootPath` - Root directory to scan (relative to config file)
- `ignore` - Array of directory patterns to exclude from scanning
- `outputPath` - Where to save/read the monorepo map JSON
- `readmeTemplate` - Path to custom README template (optional)

## crmbl-map.json Schema

The JSON map file contains structured metadata about each directory:

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

### Directory Entry Fields

- `purpose` - Brief description of what the directory does
- `complexity` - Score from 1-5 indicating code complexity
- `changeFrequency` - One of: `Stable`, `Moderate`, `Frequently Modified`
- `entryPoints` - Main files that serve as entry points
- `internalDeps` - Paths to other directories this depends on
- `externalDeps` - External npm packages used
- `readmePath` - Location of the directory's README
- `keyFiles` - Important files with descriptions
- `subdirectories` - Child directories

## Workflow Example

Here's a complete workflow for documenting a monorepo:

```bash
# 1. Set up crmbl
cd my-monorepo
crmbl init

# 2. Initial scan
crmbl scan
# Output: Found 47 new directories

# 3. Generate prompt for AI
crmbl prompt

# 4. Use your AI agent (Claude Code example)
claude-code
# Paste contents of crmbl-prompt.txt
# Agent creates READMEs and updates crmbl-map.json

# 5. Verify everything is documented
crmbl verify
# Output: ✓ All directories have valid READMEs

# 6. Commit the documentation
git add crmbl-map.json **/README.md .crmbl-config.json
git commit -m "Add crmbl documentation"

# 7. Set up CI to keep docs current
# Add `crmbl verify` to your CI pipeline
```

## Why crmbl?

**Before crmbl:**
- AI agents waste tokens scanning entire directory trees
- No structured way for agents to understand codebase organization
- Documentation gets stale and isn't machine-readable
- Hard to onboard new AI agents to large codebases

**After crmbl:**
- Agents navigate efficiently using the JSON map
- Human-readable READMEs + machine-readable metadata
- CI verification keeps docs current
- Works with any AI agent or tool

## Use Cases

### For AI Agent Users
- Point Claude Code/Cursor at your crmbl-map.json to give instant context
- Reduce token usage by helping agents explore only relevant directories
- Improve AI accuracy with structured documentation

### For Teams
- Maintain living documentation that evolves with your codebase
- Enforce documentation standards across all directories
- Quick onboarding for both humans and AI agents

### For CI/CD
- Verify all new directories are documented before merging
- Catch missing or stale documentation automatically
- Integrate with code review workflows

## Requirements

- Node.js >= 18.0.0
- npm or yarn

## Development

```bash
# Clone the repo
git clone https://github.com/yourusername/crmbl.git
cd crmbl

# Install dependencies
npm install

# Run tests
npm test

# Test locally
node src/cli.js init
```

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

## License

MIT - See [LICENSE](./LICENSE) file for details

## Credits

Built to make AI agents better at navigating monorepos without token waste.

## Links

- [GitHub Repository](https://github.com/yourusername/crmbl)
- [npm Package](https://www.npmjs.com/package/crmbl)
- [Issue Tracker](https://github.com/yourusername/crmbl/issues)
