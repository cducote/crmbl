#!/usr/bin/env node

/**
 * JSON schema and validation for crmbl-map.json
 */

/**
 * Creates a new empty monorepo map structure
 * @returns {Object} Empty map with metadata
 */
export function createEmptyMap() {
  return {
    generated: new Date().toISOString(),
    directories: {}
  };
}

/**
 * Creates a directory entry with the given information
 * @param {Object} info - Directory information
 * @returns {Object} Directory entry matching the schema
 */
export function createDirectoryEntry(info = {}) {
  return {
    purpose: info.purpose || '',
    complexity: info.complexity || 1,
    changeFrequency: info.changeFrequency || 'Unknown',
    entryPoints: info.entryPoints || [],
    internalDeps: info.internalDeps || [],
    externalDeps: info.externalDeps || [],
    readmePath: info.readmePath || '',
    keyFiles: info.keyFiles || [],
    subdirectories: info.subdirectories || [],
    lastUpdated: info.lastUpdated || new Date().toISOString()
  };
}

/**
 * Validates a monorepo map structure
 * @param {Object} map - The map to validate
 * @returns {Object} Validation result with valid flag and errors array
 */
export function validateMap(map) {
  const errors = [];

  if (!map) {
    return { valid: false, errors: ['Map is null or undefined'] };
  }

  if (!map.generated) {
    errors.push('Missing required field: generated');
  } else if (isNaN(Date.parse(map.generated))) {
    errors.push('Invalid date format for generated field');
  }

  if (!map.directories) {
    errors.push('Missing required field: directories');
  } else if (typeof map.directories !== 'object') {
    errors.push('directories field must be an object');
  } else {
    // Validate each directory entry
    for (const [dirPath, dirInfo] of Object.entries(map.directories)) {
      const dirErrors = validateDirectoryEntry(dirPath, dirInfo);
      errors.push(...dirErrors);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates a single directory entry
 * @param {string} dirPath - The directory path key
 * @param {Object} dirInfo - The directory information
 * @returns {string[]} Array of error messages
 */
function validateDirectoryEntry(dirPath, dirInfo) {
  const errors = [];
  const prefix = `Directory '${dirPath}':`;

  if (typeof dirInfo !== 'object') {
    return [`${prefix} must be an object`];
  }

  // Check required fields
  if (dirInfo.purpose === undefined) {
    errors.push(`${prefix} missing 'purpose' field`);
  }

  if (dirInfo.complexity !== undefined) {
    if (typeof dirInfo.complexity !== 'number' || dirInfo.complexity < 1 || dirInfo.complexity > 5) {
      errors.push(`${prefix} complexity must be a number between 1 and 5`);
    }
  }

  if (dirInfo.changeFrequency !== undefined) {
    const validFrequencies = ['Stable', 'Moderate', 'Frequently Modified', 'Unknown'];
    if (!validFrequencies.includes(dirInfo.changeFrequency)) {
      errors.push(`${prefix} changeFrequency must be one of: ${validFrequencies.join(', ')}`);
    }
  }

  // Validate array fields
  const arrayFields = ['entryPoints', 'internalDeps', 'externalDeps', 'subdirectories'];
  for (const field of arrayFields) {
    if (dirInfo[field] !== undefined && !Array.isArray(dirInfo[field])) {
      errors.push(`${prefix} ${field} must be an array`);
    }
  }

  // Validate keyFiles structure
  if (dirInfo.keyFiles !== undefined) {
    if (!Array.isArray(dirInfo.keyFiles)) {
      errors.push(`${prefix} keyFiles must be an array`);
    } else {
      dirInfo.keyFiles.forEach((kf, idx) => {
        if (!kf.file) {
          errors.push(`${prefix} keyFiles[${idx}] missing 'file' field`);
        }
        if (!kf.description) {
          errors.push(`${prefix} keyFiles[${idx}] missing 'description' field`);
        }
      });
    }
  }

  return errors;
}

/**
 * Merges new directory information into an existing map
 * @param {Object} existingMap - The current map
 * @param {string} dirPath - Directory path to add/update
 * @param {Object} dirInfo - Directory information
 * @returns {Object} Updated map
 */
export function updateMap(existingMap, dirPath, dirInfo) {
  const map = existingMap || createEmptyMap();

  map.directories[dirPath] = {
    ...createDirectoryEntry(),
    ...dirInfo,
    lastUpdated: new Date().toISOString()
  };

  map.generated = new Date().toISOString();

  return map;
}

/**
 * Removes directories from the map
 * @param {Object} existingMap - The current map
 * @param {string[]} dirPaths - Array of directory paths to remove
 * @returns {Object} Updated map
 */
export function removeDirectories(existingMap, dirPaths) {
  if (!existingMap || !existingMap.directories) {
    return existingMap;
  }

  const map = { ...existingMap };

  for (const dirPath of dirPaths) {
    delete map.directories[dirPath];
  }

  map.generated = new Date().toISOString();

  return map;
}
