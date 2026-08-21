/**
 * Data Retrieval & AI Enrichment Routes
 * 
 * API endpoints for accessing scraped data, snapshots, and triggering AI enrichment.
 * 
 * Routes:
 *   GET  /api/data                     — Summary of all data sources
 *   GET  /api/data/:sourceId           — Latest data for a source
 *   GET  /api/data/:sourceId/snapshots — List all snapshots for a source
 *   GET  /api/data/:sourceId/snapshots/:filename — Load a specific snapshot
 *   POST /api/data/:sourceId/enrich    — Enrich dataset with AI summaries & tags
 *   POST /api/data/enrich-all          — Enrich all available datasets
 */

const express = require('express');
const router = express.Router();
const storage = require('../services/storage');
const enrichment = require('../services/enrichment');

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

/**
 * POST /api/data/:sourceId/enrich
 * Trigger AI enrichment on the latest dataset for a source.
 */
router.post('/:sourceId/enrich', async (req, res) => {
  const { sourceId } = req.params;
  try {
    const latest = storage.loadLatest(sourceId);
    if (!latest || !latest.data || latest.data.length === 0) {
      return res.status(404).json({ success: false, error: `No dataset available to enrich for ${sourceId}` });
    }

    const rawRecords = Array.isArray(latest.data) ? latest.data : [latest.data];
    const enrichedRecords = await enrichment.enrichDataset(rawRecords, sourceId);

    const saveResult = storage.saveData(sourceId, enrichedRecords, {
      collector_id: latest.collector_id,
      url: latest.url,
      enriched: true,
    });

    res.json({
      success: true,
      source: sourceId,
      record_count: saveResult.recordCount,
      enriched_by: enrichedRecords[0]?.ai_enriched_by || 'AI Engine',
      data: enrichedRecords,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/data/enrich-all
 * Enrich all available datasets.
 */
router.post('/enrich-all', async (req, res) => {
  try {
    const summaries = storage.getAllSourceSummaries().filter(s => s.has_data);
    const results = [];

    for (const source of summaries) {
      const latest = storage.loadLatest(source.source_id);
      if (latest && latest.data) {
        const raw = Array.isArray(latest.data) ? latest.data : [latest.data];
        const enriched = await enrichment.enrichDataset(raw, source.source_id);
        storage.saveData(source.source_id, enriched, {
          collector_id: latest.collector_id,
          url: latest.url,
          enriched: true,
        });
        results.push({ source: source.source_id, count: enriched.length });
      }
    }

    res.json({ success: true, enriched_sources: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
