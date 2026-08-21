/**
 * ScrapeVerse Pulse — Comprehensive Automated Test Suite
 * Built using Node.js native test runner (node:test) and assertion library.
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const http = require('http');

const express = require('express');
const cors = require('cors');

const brightdata = require('../server/services/brightdata');
const storage = require('../server/services/storage');
const scraperRoutes = require('../server/routes/scraper');
const dataRoutes = require('../server/routes/data');

describe('ScrapeVerse Pulse — Test Suite', () => {
  let server;
  let port;
  let baseUrl;

  before(async () => {
    // Spin up an in-memory test server
    const app = express();
    app.use(cors());
    app.use(express.json());
    app.use('/api/scraper', scraperRoutes);
    app.use('/api/data', dataRoutes);
    app.get('/api/health', (req, res) => res.json({ status: 'ok', name: 'ScrapeVerse Pulse API' }));

    server = app.listen(0);
    port = server.address().port;
    baseUrl = `http://localhost:${port}`;
  });

  after(() => {
    if (server) server.close();
  });

  // Helper fetch function
  async function apiGet(endpoint) {
    const res = await fetch(`${baseUrl}${endpoint}`);
    const json = await res.json();
    return { status: res.status, body: json };
  }

  async function apiPost(endpoint, data = {}) {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    return { status: res.status, body: json };
  }

  // ─── 1. Health & Configuration Tests ─────────────────────────────
  describe('1. Health & Registry Configuration', () => {
    test('GET /api/health returns 200 and status ok', async () => {
      const { status, body } = await apiGet('/api/health');
      assert.strictEqual(status, 200);
      assert.strictEqual(body.status, 'ok');
      assert.strictEqual(body.name, 'ScrapeVerse Pulse API');
    });

    test('Scraper registry loads all provisioned scrapers with Collector IDs', () => {
      const scrapers = brightdata.getScrapers();
      assert.ok(Array.isArray(scrapers), 'Scrapers should be an array');
      assert.strictEqual(scrapers.length, 3, 'Should have 3 configured scrapers');

      const lobsters = scrapers.find(s => s.id === 'lobsters');
      assert.ok(lobsters, 'Lobste.rs scraper must exist');
      assert.strictEqual(lobsters.collector_id, 'c_mt36pdxg5cznxlkhw');
      assert.strictEqual(lobsters.status, 'ready');

      const huggingface = scrapers.find(s => s.id === 'huggingface');
      assert.ok(huggingface, 'HuggingFace scraper must exist');
      assert.strictEqual(huggingface.collector_id, 'c_mt36pqqo8b6g3rt1h');

      const devto = scrapers.find(s => s.id === 'devto');
      assert.ok(devto, 'Dev.to scraper must exist');
      assert.strictEqual(devto.collector_id, 'c_mt36qguy1o6htmc3m2');
    });

    test('GET /api/scraper returns all registered scrapers', async () => {
      const { status, body } = await apiGet('/api/scraper');
      assert.strictEqual(status, 200);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.scrapers.length, 3);
    });

    test('GET /api/scraper/:id returns single scraper details', async () => {
      const { status, body } = await apiGet('/api/scraper/lobsters');
      assert.strictEqual(status, 200);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.scraper.id, 'lobsters');
      assert.strictEqual(body.scraper.collector_id, 'c_mt36pdxg5cznxlkhw');
    });

    test('GET /api/scraper/invalid-id returns 404', async () => {
      const { status, body } = await apiGet('/api/scraper/non-existent-source');
      assert.strictEqual(status, 404);
      assert.strictEqual(body.success, false);
    });
  });

  // ─── 2. Data Storage & Persistence Tests ─────────────────────────
  describe('2. Storage Service & Snapshots', () => {
    test('saveData persists latest.json and snapshot file', () => {
      const testData = [{ id: 1, title: 'Test Article', url: 'https://example.com' }];
      const result = storage.saveData('test-source', testData, { url: 'https://example.com' });

      assert.ok(fs.existsSync(result.latestPath), 'latest.json must exist');
      assert.ok(fs.existsSync(result.snapshotPath), 'snapshot must exist');
      assert.strictEqual(result.recordCount, 1);

      // Verify loaded data matches
      const loaded = storage.loadLatest('test-source');
      assert.strictEqual(loaded.source, 'test-source');
      assert.strictEqual(loaded.record_count, 1);
      assert.deepStrictEqual(loaded.data, testData);

      // Clean up test files
      const testDir = path.join(__dirname, '..', 'data', 'test-source');
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    });

    test('GET /api/data returns data summaries', async () => {
      const { status, body } = await apiGet('/api/data');
      assert.strictEqual(status, 200);
      assert.strictEqual(body.success, true);
      assert.ok(Array.isArray(body.sources), 'sources should be array');
    });

    test('GET /api/data/lobsters returns real scraped data', async () => {
      const { status, body } = await apiGet('/api/data/lobsters');
      assert.strictEqual(status, 200);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.source, 'lobsters');
      assert.ok(Array.isArray(body.data), 'data should be array');
      assert.ok(body.data.length > 0, 'Lobste.rs should have scraped records');
      assert.ok(body.data[0].product_page_url, 'Record must contain product_page_url');
    });
  });

  // ─── 3. Self-Healing & Scraper Controller Validation ─────────────
  describe('3. Scraper Control & Validation Logic', () => {
    test('POST /api/scraper/:id/heal requires prompt', async () => {
      const { status, body } = await apiPost('/api/scraper/lobsters/heal', {});
      assert.strictEqual(status, 400);
      assert.strictEqual(body.success, false);
      assert.ok(body.error.includes('prompt is required'));
    });

    test('POST /api/scraper/invalid-id/run returns 404', async () => {
      const { status, body } = await apiPost('/api/scraper/invalid-id/run');
      assert.strictEqual(status, 404);
      assert.strictEqual(body.success, false);
    });
  });
});
