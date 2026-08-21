/**
 * API Client Module
 * 
 * Clean abstraction over all backend API calls.
 * Handles fetch requests, error formatting, and response parsing.
 */

const API_BASE = '/api';

/**
 * Make a fetch request to the API.
 * @param {string} endpoint - API path (e.g., '/scraper')
 * @param {object} options - fetch options
 * @returns {Promise<object>} Parsed JSON response
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok || data.success === false) {
      throw new Error(data.error || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err);
    throw err;
  }
}

// ─── Scraper Endpoints ───────────────────────────────────────

/** Get all registered scrapers */
export async function getScrapers() {
  return request('/scraper');
}

/** Get a specific scraper by ID */
export async function getScraper(id) {
  return request(`/scraper/${id}`);
}

/** Run a scraper and return the results */
export async function runScraper(id, url = null) {
  return request(`/scraper/${id}/run`, {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
}

/** Trigger self-healing on a scraper */
export async function healScraper(id, prompt, options = {}) {
  return request(`/scraper/${id}/heal`, {
    method: 'POST',
    body: JSON.stringify({ prompt, ...options }),
  });
}

/** Get account budget/balance */
export async function getBudget() {
  return request('/scraper/budget');
}

// ─── Data Endpoints ──────────────────────────────────────────

/** Get summary of all data sources */
export async function getDataSummary() {
  return request('/data');
}

/** Get latest data for a source */
export async function getSourceData(sourceId) {
  return request(`/data/${sourceId}`);
}

/** List snapshots for a source */
export async function getSnapshots(sourceId) {
  return request(`/data/${sourceId}/snapshots`);
}

/** Trigger AI enrichment for a specific dataset */
export async function enrichSource(sourceId) {
  return request(`/data/${sourceId}/enrich`, {
    method: 'POST',
  });
}

/** Trigger AI enrichment for all datasets */
export async function enrichAllSources() {
  return request('/data/enrich-all', {
    method: 'POST',
  });
}

/** Get API health check */
export async function getHealth() {
  return request('/health');
}
