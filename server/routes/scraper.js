/**
 * Scraper Control Routes
 * 
 * API endpoints for creating, running, healing, and monitoring scrapers.
 * All operations delegate to the Bright Data CLI wrapper service.
 * 
 * Routes:
 *   GET    /api/scraper          — List all registered scrapers
 *   GET    /api/scraper/:id      — Get a specific scraper's config
 *   POST   /api/scraper/:id/run  — Run a scraper and store results
 *   POST   /api/scraper/:id/heal — Trigger self-healing on a scraper
 *   GET    /api/scraper/budget   — Check Bright Data account balance
 */

const express = require('express');
const router = express.Router();
const brightdata = require('../services/brightdata');
const storage = require('../services/storage');

/**
 * GET /api/scraper
 * List all registered scrapers with their status and metadata.
 */
router.get('/', (req, res) => {
  try {
    const scrapers = brightdata.getScrapers().map(s => {
      const latest = storage.loadLatest(s.id);
      return {
        ...s,
        record_count: latest ? latest.record_count : (s.record_count || 0),
        last_run: latest ? (latest.scraped_at || s.last_run) : s.last_run,
      };
    });
    res.json({ success: true, scrapers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/scraper/budget
 * Check Bright Data account balance and spending.
 */
router.get('/budget', async (req, res) => {
  try {
    const budget = await brightdata.getBudget();
    res.json({ success: true, budget });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/scraper/:id
 * Get a specific scraper's configuration and status.
 */
router.get('/:id', (req, res) => {
  try {
    const scraper = brightdata.getScraperById(req.params.id);
    if (!scraper) {
      return res.status(404).json({ success: false, error: 'Scraper not found' });
    }
    const latest = storage.loadLatest(scraper.id);
    const enriched = {
      ...scraper,
      record_count: latest ? latest.record_count : (scraper.record_count || 0),
      last_run: latest ? (latest.scraped_at || scraper.last_run) : scraper.last_run,
    };
    res.json({ success: true, scraper: enriched });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/scraper/:id/run
 * Run a scraper against its target URL.
 * Stores the result data and updates the scraper's status.
 * 
 * Body: { url?: string } — optional override URL
 */
router.post('/:id/run', async (req, res) => {
  const { id } = req.params;

  try {
    const scraper = brightdata.getScraperById(id);
    if (!scraper) {
      return res.status(404).json({ success: false, error: 'Scraper not found' });
    }
    if (!scraper.collector_id) {
      return res.status(400).json({ success: false, error: 'No Collector ID set. Scraper not yet created.' });
    }

    // Update status to running
    brightdata.updateScraperConfig(id, null, 'running');

    const url = req.body.url || scraper.url;
    const result = await brightdata.runScraper(scraper.collector_id, url);

    // Extract the actual data array from the result
    const data = result.data || result.results || result;

    // Save to storage
    const saveResult = storage.saveData(id, data, {
      collector_id: scraper.collector_id,
      url,
    });

    // Update config with success
    const config = brightdata.loadConfig();
    const scraperConfig = config.scrapers.find(s => s.id === id);
    if (scraperConfig) {
      scraperConfig.status = 'ready';
      scraperConfig.last_run = new Date().toISOString();
      scraperConfig.record_count = saveResult.recordCount;
      brightdata.saveConfig(config);
    }

    res.json({
      success: true,
      scraper_id: id,
      collector_id: scraper.collector_id,
      record_count: saveResult.recordCount,
      snapshot: saveResult.snapshotPath,
      data,
    });
  } catch (err) {
    // Update status to error
    brightdata.updateScraperConfig(id, null, 'error');
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/scraper/:id/heal
 * Trigger self-healing on a broken scraper.
 * 
 * Body: { prompt: string, autoApprove?: boolean, autoSave?: boolean }
 */
router.post('/:id/heal', async (req, res) => {
  const { id } = req.params;
  const { prompt, autoApprove = true, autoSave = true } = req.body;

  if (!prompt) {
    return res.status(400).json({ success: false, error: 'Heal prompt is required' });
  }

  try {
    const scraper = brightdata.getScraperById(id);
    if (!scraper) {
      return res.status(404).json({ success: false, error: 'Scraper not found' });
    }
    if (!scraper.collector_id) {
      return res.status(400).json({ success: false, error: 'No Collector ID set.' });
    }

    // Update status to healing
    brightdata.updateScraperConfig(id, null, 'healing');

    const result = await brightdata.healScraper(scraper.collector_id, prompt, {
      autoApprove,
      autoSave,
      url: scraper.url,
    });

    // Update config with heal timestamp
    const config = brightdata.loadConfig();
    const scraperConfig = config.scrapers.find(s => s.id === id);
    if (scraperConfig) {
      scraperConfig.status = 'ready';
      scraperConfig.last_heal = new Date().toISOString();
      brightdata.saveConfig(config);
    }

    res.json({
      success: true,
      scraper_id: id,
      collector_id: scraper.collector_id,
      heal_result: result,
    });
  } catch (err) {
    brightdata.updateScraperConfig(id, null, 'error');
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
