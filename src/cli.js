#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { loadConfig, createConfig, validateConfig } from './config.js';
import { scanDirectories, saveScanResults, verifyDocumentation } from './scanner.js';
import { createEmptyMap, validateMap } from './schema.js';

const program = new Command();

program
  .name('crmbl')
  .description('Break down your monorepo into breadcrumbs for AI agents')
  .version('0.1.0');

// INIT command
program
  .command('init')
  .description('Creates .crmbl-config.json with default settings')
  .option('-f, --force', 'Overwrite existing config file')
  .action(async (options) => {
    try {
      const cwd = process.cwd();
      const configPath = path.join(cwd, '.crmbl-config.json');

      if (fs.existsSync(configPath) && !options.force) {
        console.log(chalk.yellow('⚠ Config file already exists at .crmbl-config.json'));
        console.log(chalk.dim('Use --force to overwrite'));
        process.exit(1);
      }

      if (options.force && fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
      }

      createConfig(cwd);
      console.log(chalk.green('✓ Created .crmbl-config.json'));
      console.log(chalk.dim('\nNext steps:'));
      console.log(chalk.dim('  1. Review and customize .crmbl-config.json'));
      console.log(chalk.dim('  2. Run: crmbl scan'));
    } catch (error) {
      console.error(chalk.red('✗ Error creating config:'), error.message);
      process.exit(1);
    }
  });

// SCAN command
program
  .command('scan')
  .description('Scans directory tree and identifies new/missing/documented directories')
  .option('-o, --output <path>', 'Output path for scan results (default: ./scan-results.json)')
  .option('-q, --quiet', 'Suppress detailed output')
  .action(async (options) => {
    try {
      const config = loadConfig();
      const validation = validateConfig(config);

      if (!validation.valid) {
        console.error(chalk.red('✗ Invalid configuration:'));
        validation.errors.forEach(err => console.error(chalk.red(`  - ${err}`)));
        process.exit(1);
      }

      if (!options.quiet) {
        console.log(chalk.blue('🔍 Scanning directories...'));
        console.log(chalk.dim(`Root: ${config.rootPath}`));
      }

      const results = await scanDirectories(config);

      // Save results to file
      const outputPath = options.output || './scan-results.json';
      saveScanResults(results, outputPath);

      // Display results
      console.log('\n' + chalk.bold('Scan Results:'));
      console.log(chalk.dim('─'.repeat(50)));

      console.log(chalk.cyan(`📊 Total directories: ${results.stats.total}`));
      console.log(chalk.green(`✓ Documented: ${results.stats.documented}`));

      if (results.stats.new > 0) {
        console.log(chalk.yellow(`\n📝 New directories (${results.stats.new}):`));
        results.newDirs.slice(0, 10).forEach(dir => {
          console.log(chalk.yellow(`   ${dir}`));
        });
        if (results.stats.new > 10) {
          console.log(chalk.dim(`   ... and ${results.stats.new - 10} more`));
        }
      }

      if (results.stats.missing > 0) {
        console.log(chalk.red(`\n🗑 Missing directories (${results.stats.missing}):`));
        results.missingDirs.slice(0, 10).forEach(dir => {
          console.log(chalk.red(`   ${dir}`));
        });
        if (results.stats.missing > 10) {
          console.log(chalk.dim(`   ... and ${results.stats.missing - 10} more`));
        }
      }

      console.log(chalk.dim(`\n💾 Full results saved to: ${outputPath}`));

      if (results.stats.new > 0) {
        console.log(chalk.dim('\nNext steps:'));
        console.log(chalk.dim('  1. Run: crmbl prompt'));
        console.log(chalk.dim('  2. Use the generated prompt with your AI agent'));
      }

    } catch (error) {
      console.error(chalk.red('✗ Scan failed:'), error.message);
      if (!options.quiet) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

// VERIFY command
program
  .command('verify')
  .description('Verifies all documented directories have READMEs (useful for CI)')
  .option('-q, --quiet', 'Only output errors')
  .action((options) => {
    try {
      const config = loadConfig();
      const mapPath = path.resolve(config.outputPath);

      if (!fs.existsSync(mapPath)) {
        console.error(chalk.red('✗ No crmbl-map.json found'));
        console.error(chalk.dim(`Expected at: ${mapPath}`));
        process.exit(1);
      }

      const mapContent = fs.readFileSync(mapPath, 'utf-8');
      const map = JSON.parse(mapContent);

      // Validate map structure
      const mapValidation = validateMap(map);
      if (!mapValidation.valid) {
        console.error(chalk.red('✗ Invalid crmbl-map.json:'));
        mapValidation.errors.forEach(err => console.error(chalk.red(`  - ${err}`)));
        process.exit(1);
      }

      // Verify READMEs
      const verification = verifyDocumentation(config, map);

      if (!options.quiet) {
        console.log(chalk.blue('📋 Verifying documentation...'));
        console.log(chalk.dim(`Total directories: ${verification.totalDirectories}`));
        console.log(chalk.dim(`Documented: ${verification.documented}`));
      }

      if (verification.valid) {
        console.log(chalk.green('✓ All directories have valid READMEs'));
        process.exit(0);
      } else {
        console.error(chalk.red(`✗ Found ${verification.missingReadmes.length} missing READMEs:`));
        verification.missingReadmes.forEach(({ directory, expectedReadme }) => {
          console.error(chalk.red(`  ${directory}: ${expectedReadme}`));
        });
        process.exit(1);
      }

    } catch (error) {
      console.error(chalk.red('✗ Verification failed:'), error.message);
      process.exit(1);
    }
  });

// PROMPT command
program
  .command('prompt')
  .description('Generates LLM prompt with context about new directories')
  .option('-o, --output <path>', 'Output path for prompt file (default: ./crmbl-prompt.txt)')
  .option('-t, --template <path>', 'Custom prompt template file')
  .action(async (options) => {
    try {
      const config = loadConfig();
      const scanResultsPath = './scan-results.json';

      if (!fs.existsSync(scanResultsPath)) {
        console.error(chalk.yellow('⚠ No scan-results.json found'));
        console.log(chalk.dim('Run "crmbl scan" first'));
        process.exit(1);
      }

      const scanResults = JSON.parse(fs.readFileSync(scanResultsPath, 'utf-8'));

      if (scanResults.stats.new === 0) {
        console.log(chalk.green('✓ No new directories to document'));
        process.exit(0);
      }

      // Load template
      const templatePath = options.template || path.join(path.dirname(new URL(import.meta.url).pathname), '../templates/prompt-template.txt');
      let template;

      if (fs.existsSync(templatePath)) {
        template = fs.readFileSync(templatePath, 'utf-8');
      } else {
        // Use default inline template
        template = generateDefaultPromptTemplate();
      }

      // Generate prompt
      const prompt = generatePrompt(template, scanResults, config);

      // Save prompt
      const outputPath = options.output || './crmbl-prompt.txt';
      fs.writeFileSync(outputPath, prompt, 'utf-8');

      console.log(chalk.green(`✓ Generated prompt for ${scanResults.stats.new} new directories`));
      console.log(chalk.dim(`📄 Saved to: ${outputPath}`));
      console.log(chalk.dim('\nNext steps:'));
      console.log(chalk.dim('  1. Copy the prompt to your AI agent (Claude Code, Cursor, etc.)'));
      console.log(chalk.dim('  2. Review and refine the generated READMEs'));
      console.log(chalk.dim('  3. Run: crmbl verify'));

    } catch (error) {
      console.error(chalk.red('✗ Prompt generation failed:'), error.message);
      process.exit(1);
    }
  });

/**
 * Generates the default prompt template
 */
function generateDefaultPromptTemplate() {
  return `# Monorepo Documentation Task

I need you to help document the following directories in my monorepo by:
1. Creating a README.md file in each directory
2. Updating the monorepo-map.json file with metadata about each directory

## New Directories to Document
{{NEW_DIRS}}

## Instructions

For each directory above, please:

1. **Analyze the directory contents** to understand:
   - What is the purpose of this directory?
   - What are the key files and their roles?
   - What dependencies does it have (internal and external)?
   - What is the complexity level (1-5)?
   - How frequently does it change?

2. **Create a README.md** in each directory with:
   - Clear purpose statement
   - List of key files with descriptions
   - Dependencies (both internal paths and external npm packages)
   - Entry points for the code
   - Any important architectural notes

3. **Update monorepo-map.json** with a new entry for each directory following this schema:
\`\`\`json
{
  "purpose": "Brief description of what this directory does",
  "complexity": 1-5,
  "changeFrequency": "Stable|Moderate|Frequently Modified",
  "entryPoints": ["main.ts", "index.ts"],
  "internalDeps": ["/other/directory/path"],
  "externalDeps": ["package-name"],
  "readmePath": "/path/to/README.md",
  "keyFiles": [
    {"file": "filename.ts", "description": "What it does"}
  ],
  "subdirectories": ["/path/to/subdirs"]
}
\`\`\`

## Current Configuration
- Root path: {{ROOT_PATH}}
- Output file: {{OUTPUT_PATH}}

Please be thorough and accurate in your documentation.
`;
}

/**
 * Generates the final prompt from template and scan results
 */
function generatePrompt(template, scanResults, config) {
  let prompt = template;

  // Replace placeholders
  const newDirsList = scanResults.newDirs.map(dir => `- ${dir}`).join('\n');

  prompt = prompt.replace('{{NEW_DIRS}}', newDirsList);
  prompt = prompt.replace('{{ROOT_PATH}}', config.rootPath);
  prompt = prompt.replace('{{OUTPUT_PATH}}', config.outputPath);
  prompt = prompt.replace('{{TOTAL_NEW}}', scanResults.stats.new.toString());

  return prompt;
}

// Parse and execute
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
