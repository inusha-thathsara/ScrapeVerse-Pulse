/**
 * Data Retrieval Routes
 * 
 * API endpoints for accessing scraped data, snapshots, and summaries.
 * 
 * Routes:
 *   GET /api/data                  — Summary of all data sources
 *   GET /api/data/:sourceId        — Latest data for a source
 *   GET /api/data/:sourceId/snapshots — List all snapshots for a source
 *   GET /api/data/:sourceId/snapshots/:filename — Load a specific snapshot
 */

const express = require('express');
const router = express.Router();
const storage = require('../services/storage');

/**
 * GET /api/data
 * Returns a summary of all data sources with counts and timestamps.
 */
router.get('/', (req, res) => {
  try {
    const summaries = storage.getAllSourceSummaries();
    res.json({ success: true, sources: summaries });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/data/:sourceId
 * Returns the latest scraped data for a given source.
 */
router.get('/:sourceId', (req, res) => {
  try {
    const data = storage.loadLatest(req.params.sourceId);
    if (!data) {
      return res.status(404).json({ 
        success: false, 
        error: `No data found for source: ${req.params.sourceId}` 
      });
    }
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/data/:sourceId/snapshots
 * Lists all available timestamped snapshots for a source.
 */
router.get('/:sourceId/snapshots', (req, res) => {
  try {
    const snapshots = storage.listSnapshots(req.params.sourceId);
    res.json({ success: true, source: req.params.sourceId, snapshots });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/data/:sourceId/snapshots/:filename
 * Loads a specific snapshot file.
 */
router.get('/:sourceId/snapshots/:filename', (req, res) => {
  try {
    const data = storage.loadSnapshot(req.params.sourceId, req.params.filename);
    if (!data) {
      return res.status(404).json({ success: false, error: 'Snapshot not found' });
    }
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
