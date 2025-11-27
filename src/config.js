#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const CONFIG_FILENAME = '.crmbl-config.json';

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
  rootPath: './',
  ignore: ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.cache'],
  outputPath: './crmbl-map.json',
  readmeTemplate: 'templates/readme-template.md'
};

/**
 * Loads configuration from .crmbl-config.json
 * @param {string} cwd - Current working directory to search for config
 * @returns {Object} Configuration object (merged with defaults)
 */
export function loadConfig(cwd = process.cwd()) {
  const configPath = path.join(cwd, CONFIG_FILENAME);

  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8');
      const userConfig = JSON.parse(content);

      // Merge with defaults
      return {
        ...DEFAULT_CONFIG,
        ...userConfig,
        // Ensure arrays are replaced, not merged
        ignore: userConfig.ignore || DEFAULT_CONFIG.ignore
      };
    }
  } catch (error) {
    console.error(`Error reading config file at ${configPath}:`, error.message);
    console.log('Using default configuration');
  }

  return { ...DEFAULT_CONFIG };
}

/**
 * Creates a new .crmbl-config.json file with default values
 * @param {string} cwd - Directory where config should be created
 * @param {Object} customConfig - Optional custom configuration to merge
 * @returns {boolean} Success status
 */
export function createConfig(cwd = process.cwd(), customConfig = {}) {
  const configPath = path.join(cwd, CONFIG_FILENAME);

  if (fs.existsSync(configPath)) {
    throw new Error(`Config file already exists at ${configPath}`);
  }

  const config = {
    ...DEFAULT_CONFIG,
    ...customConfig
  };

  try {
    const content = JSON.stringify(config, null, 2);
    fs.writeFileSync(configPath, content, 'utf-8');
    return true;
  } catch (error) {
    console.error(`Error creating config file at ${configPath}:`, error.message);
    return false;
  }
}

/**
 * Validates a configuration object
 * @param {Object} config - Configuration to validate
 * @returns {Object} Validation result with valid flag and errors
 */
export function validateConfig(config) {
  const errors = [];

  if (!config) {
    return { valid: false, errors: ['Config is null or undefined'] };
  }

  if (!config.rootPath || typeof config.rootPath !== 'string') {
    errors.push('rootPath must be a non-empty string');
  }

  if (!config.outputPath || typeof config.outputPath !== 'string') {
    errors.push('outputPath must be a non-empty string');
  }

  if (!Array.isArray(config.ignore)) {
    errors.push('ignore must be an array');
  }

  if (config.readmeTemplate && typeof config.readmeTemplate !== 'string') {
    errors.push('readmeTemplate must be a string');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Finds the config file by walking up the directory tree
 * @param {string} startDir - Directory to start searching from
 * @returns {string|null} Path to config file or null if not found
 */
export function findConfig(startDir = process.cwd()) {
  let currentDir = path.resolve(startDir);
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    const configPath = path.join(currentDir, CONFIG_FILENAME);

    if (fs.existsSync(configPath)) {
      return configPath;
    }

    currentDir = path.dirname(currentDir);
  }

  return null;
}
