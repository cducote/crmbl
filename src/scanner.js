#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

/**
 * Scans a directory tree and compares it against existing crmbl-map.json
 * @param {Object} config - Configuration object
 * @param {string} config.rootPath - Root directory to scan
 * @param {string[]} config.ignore - Patterns to ignore
 * @param {string} config.outputPath - Path to crmbl-map.json
 * @returns {Promise<Object>} Scan results with newDirs, missingDirs, unchangedDirs
 */
export async function scanDirectories(config) {
  const { rootPath, ignore, outputPath } = config;

  // Read existing map if it exists
  const existingMap = readExistingMap(outputPath);
  const existingDirs = existingMap ? Object.keys(existingMap.directories || {}) : [];

  // Find all directories in the project
  const currentDirs = await findAllDirectories(rootPath, ignore);

  // Compare current state with existing map
  const results = compareDirectories(currentDirs, existingDirs, rootPath);

  return results;
}

/**
 * Reads the existing crmbl-map.json file
 * @param {string} outputPath - Path to the JSON file
 * @returns {Object|null} Parsed JSON or null if doesn't exist
 */
function readExistingMap(outputPath) {
  try {
    if (fs.existsSync(outputPath)) {
      const content = fs.readFileSync(outputPath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.warn(`Warning: Could not read existing map at ${outputPath}:`, error.message);
  }
  return null;
}

/**
 * Finds all directories in the given root path, excluding ignored patterns
 * @param {string} rootPath - Root directory to scan
 * @param {string[]} ignorePatterns - Patterns to ignore
 * @returns {Promise<string[]>} Array of relative directory paths
 */
async function findAllDirectories(rootPath, ignorePatterns) {
  const absoluteRoot = path.resolve(rootPath);

  // Build ignore patterns for glob
  const ignoreGlobs = ignorePatterns.map(pattern => `**/${pattern}/**`);

  // Find all directories
  const pattern = '**/*';
  const files = await glob(pattern, {
    cwd: absoluteRoot,
    ignore: ignoreGlobs,
    nodir: false,
    dot: false,
    absolute: false
  });

  // Filter to only directories and normalize paths
  const dirs = new Set();

  for (const file of files) {
    const fullPath = path.join(absoluteRoot, file);

    try {
      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        // Store as relative path with leading slash for consistency
        const relativePath = '/' + file.replace(/\\/g, '/');
        dirs.add(relativePath);

        // Also add all parent directories
        const parts = file.split(path.sep);
        for (let i = 1; i < parts.length; i++) {
          const parentPath = '/' + parts.slice(0, i).join('/');
          dirs.add(parentPath);
        }
      }
    } catch (err) {
      // Skip files that can't be accessed
      continue;
    }
  }

  // Sort for consistent output
  return Array.from(dirs).sort();
}

/**
 * Compares current directories with existing documented directories
 * @param {string[]} currentDirs - Directories found in current scan
 * @param {string[]} existingDirs - Directories in existing map
 * @param {string} rootPath - Root path for filtering
 * @returns {Object} Results with newDirs, missingDirs, unchangedDirs
 */
function compareDirectories(currentDirs, existingDirs, rootPath) {
  const currentSet = new Set(currentDirs);
  const existingSet = new Set(existingDirs);

  const newDirs = currentDirs.filter(dir => !existingSet.has(dir));
  const missingDirs = existingDirs.filter(dir => !currentSet.has(dir));
  const unchangedDirs = currentDirs.filter(dir => existingSet.has(dir));

  return {
    newDirs: newDirs.sort(),
    missingDirs: missingDirs.sort(),
    unchangedDirs: unchangedDirs.sort(),
    stats: {
      total: currentDirs.length,
      new: newDirs.length,
      missing: missingDirs.length,
      documented: unchangedDirs.length
    }
  };
}

/**
 * Saves scan results to a JSON file
 * @param {Object} results - Scan results object
 * @param {string} outputPath - Where to save the results
 */
export function saveScanResults(results, outputPath = './scan-results.json') {
  try {
    const content = JSON.stringify(results, null, 2);
    fs.writeFileSync(outputPath, content, 'utf-8');
  } catch (error) {
    console.error(`Error saving scan results to ${outputPath}:`, error.message);
    throw error;
  }
}

/**
 * Verifies that all directories have corresponding READMEs
 * @param {Object} config - Configuration object
 * @param {Object} map - The crmbl-map.json content
 * @returns {Object} Verification results with missing READMEs
 */
export function verifyDocumentation(config, map) {
  if (!map || !map.directories) {
    return {
      valid: false,
      missingReadmes: [],
      error: 'No crmbl-map.json found or invalid format'
    };
  }

  const missingReadmes = [];
  const { rootPath } = config;

  for (const [dirPath, dirInfo] of Object.entries(map.directories)) {
    if (dirInfo.readmePath) {
      const fullPath = path.join(rootPath, dirInfo.readmePath);
      if (!fs.existsSync(fullPath)) {
        missingReadmes.push({
          directory: dirPath,
          expectedReadme: dirInfo.readmePath
        });
      }
    } else {
      missingReadmes.push({
        directory: dirPath,
        expectedReadme: 'No README path specified'
      });
    }
  }

  return {
    valid: missingReadmes.length === 0,
    missingReadmes,
    totalDirectories: Object.keys(map.directories).length,
    documented: Object.keys(map.directories).length - missingReadmes.length
  };
}
