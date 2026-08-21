/**
 * JSON Data Storage Service
 * 
 * Manages reading and writing scraped data to the filesystem.
 * Each scraper source gets its own directory under data/.
 * Supports timestamped snapshots and latest-data retrieval.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

/**
 * Ensure the data directory exists for a given source.
 * @param {string} sourceId - e.g., 'lobsters', 'huggingface'
 * @returns {string} Full path to the source directory
 */
function ensureSourceDir(sourceId) {
  const dir = path.join(DATA_DIR, sourceId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Save scraped data for a source.
 * Saves both a `latest.json` (overwritten) and a timestamped snapshot.
 * 
 * @param {string} sourceId - Source identifier
 * @param {object|Array} data - The scraped data
 * @param {object} metadata - Additional metadata (collector_id, url, etc.)
 * @returns {object} { latestPath, snapshotPath, recordCount }
 */
function saveData(sourceId, data, metadata = {}) {
  const dir = ensureSourceDir(sourceId);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  const envelope = {
    source: sourceId,
    scraped_at: new Date().toISOString(),
    collector_id: metadata.collector_id || null,
    url: metadata.url || null,
    record_count: Array.isArray(data) ? data.length : 1,
    data: data,
  };

  // Save latest (overwritten each run)
  const latestPath = path.join(dir, 'latest.json');
  fs.writeFileSync(latestPath, JSON.stringify(envelope, null, 2), 'utf-8');

  // Save timestamped snapshot
  const snapshotPath = path.join(dir, `snapshot-${timestamp}.json`);
  fs.writeFileSync(snapshotPath, JSON.stringify(envelope, null, 2), 'utf-8');

  return {
    latestPath,
    snapshotPath,
    recordCount: envelope.record_count,
  };
}

/**
 * Load the latest scraped data for a source.
 * @param {string} sourceId - Source identifier
 * @returns {object|null} The data envelope, or null if no data exists
 */
function loadLatest(sourceId) {
  const latestPath = path.join(DATA_DIR, sourceId, 'latest.json');
  if (!fs.existsSync(latestPath)) return null;

  try {
    const raw = fs.readFileSync(latestPath, 'utf-8');
    const parsed = JSON.parse(raw);
    
    // Normalize raw CLI JSON array into standard envelope format
    if (Array.isArray(parsed) || !parsed.data) {
      const stats = fs.statSync(latestPath);
      return {
        source: sourceId,
        scraped_at: stats.mtime.toISOString(),
        record_count: Array.isArray(parsed) ? parsed.length : 1,
        data: parsed,
      };
    }
    
    return parsed;
  } catch {
    return null;
  }
}

/**
 * List all available snapshots for a source.
 * @param {string} sourceId - Source identifier
 * @returns {string[]} Array of snapshot filenames, sorted newest first
 */
function listSnapshots(sourceId) {
  const dir = path.join(DATA_DIR, sourceId);
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir)
    .filter(f => f.startsWith('snapshot-') && f.endsWith('.json'))
    .sort()
    .reverse();
}

/**
 * Load a specific snapshot.
 * @param {string} sourceId
 * @param {string} filename
 * @returns {object|null}
 */
function loadSnapshot(sourceId, filename) {
  const filepath = path.join(DATA_DIR, sourceId, filename);
  if (!fs.existsSync(filepath)) return null;

  try {
    const raw = fs.readFileSync(filepath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Get a summary of all sources and their latest data stats.
 * @returns {object[]}
 */
function getAllSourceSummaries() {
  if (!fs.existsSync(DATA_DIR)) return [];

  const sources = fs.readdirSync(DATA_DIR).filter(f => {
    return fs.statSync(path.join(DATA_DIR, f)).isDirectory();
  });

  return sources.map(sourceId => {
    const latest = loadLatest(sourceId);
    const snapshots = listSnapshots(sourceId);
    return {
      source_id: sourceId,
      has_data: latest !== null,
      record_count: latest ? latest.record_count : 0,
      last_scraped: latest ? latest.scraped_at : null,
      snapshot_count: snapshots.length,
    };
  });
}

module.exports = {
  ensureSourceDir,
  saveData,
  loadLatest,
  listSnapshots,
  loadSnapshot,
  getAllSourceSummaries,
};
