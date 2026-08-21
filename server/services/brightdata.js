/**
 * Bright Data CLI Wrapper Service
 * 
 * Provides a clean programmatic interface around the Bright Data CLI
 * for creating, running, healing, and monitoring scrapers.
 * 
 * All scraper operations flow through this service, which spawns
 * the CLI as child processes and parses their JSON output.
 */

const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

const CONFIG_PATH = path.join(__dirname, '..', 'config', 'scrapers.json');

/**
 * Execute a Bright Data CLI command and return parsed JSON output.
 * @param {string[]} args - CLI arguments
 * @param {object} options - { timeout, cwd }
 * @returns {Promise<object>} Parsed JSON response
 */
function runCli(args, options = {}) {
  const timeout = options.timeout || 700000; // 700s default (scraper create can take up to 25 min)

  return new Promise((resolve, reject) => {
    const proc = execFile('npx', ['@brightdata/cli', ...args, '--json'], {
      cwd: options.cwd || process.cwd(),
      timeout,
      shell: true,
      maxBuffer: 1024 * 1024 * 10, // 10 MB buffer for large outputs
    }, (error, stdout, stderr) => {
      if (error && !stdout) {
        reject(new Error(`CLI command failed: ${error.message}\n${stderr}`));
        return;
      }

      try {
        const result = JSON.parse(stdout.trim());
        resolve(result);
      } catch (parseErr) {
        // If JSON parsing fails, return raw output
        resolve({ raw: stdout.trim(), stderr: stderr.trim() });
      }
    });
  });
}

/**
 * Load the scraper registry from disk.
 * @returns {object} The scrapers config
 */
function loadConfig() {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
  return JSON.parse(raw);
}

/**
 * Save the scraper registry to disk.
 * @param {object} config - The scrapers config object
 */
function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Create a new scraper via Scraper Studio AI.
 * This is a long-running operation (5-15 minutes).
 * 
 * @param {string} url - Target URL to scrape
 * @param {string} description - Natural language description of data to extract
 * @param {string} name - Scraper template name
 * @returns {Promise<object>} { collector_id, name, status, ... }
 */
async function createScraper(url, description, name) {
  const args = ['scraper', 'create', url, description];
  if (name) args.push('--name', name);
  
  const result = await runCli(args, { timeout: 1800000 }); // 30 min timeout
  return result;
}

/**
 * Run a scraper against a URL and return structured data.
 * 
 * @param {string} collectorId - The Collector ID (c_xxxxxx)
 * @param {string} url - Target URL (optional if scraper has a default)
 * @param {object} options - { sync, output }
 * @returns {Promise<object>} Scraped data as JSON
 */
async function runScraper(collectorId, url, options = {}) {
  const args = ['scraper', 'run', collectorId];
  if (url) args.push(url);
  if (options.sync) args.push('--sync');
  
  const result = await runCli(args, { timeout: 700000 });
  return result;
}

/**
 * Heal a broken scraper via AI self-healing.
 * 
 * @param {string} collectorId - The Collector ID to heal
 * @param {string} prompt - Description of what broke
 * @param {object} options - { autoApprove, autoSave, url }
 * @returns {Promise<object>} Heal result
 */
async function healScraper(collectorId, prompt, options = {}) {
  const args = ['scraper', 'heal', collectorId, prompt];
  if (options.url) args.push('--url', options.url);
  if (options.autoApprove) args.push('--auto-approve');
  if (options.autoSave) args.push('--auto-save');
  
  const result = await runCli(args, { timeout: 900000 }); // 15 min timeout
  return result;
}

/**
 * Approve (or reject) a pending heal operation.
 * 
 * @param {string} collectorId - The Collector ID
 * @param {boolean} reject - If true, reject instead of approve
 * @returns {Promise<object>}
 */
async function approveHeal(collectorId, reject = false) {
  const args = ['scraper', 'approve', collectorId];
  if (reject) args.push('--reject');
  
  const result = await runCli(args);
  return result;
}

/**
 * Check account budget/balance.
 * @returns {Promise<object>}
 */
async function getBudget() {
  return runCli(['budget']);
}

/**
 * Update a scraper's collector ID and status in the registry.
 * 
 * @param {string} scraperId - Internal scraper ID (e.g., 'lobsters')
 * @param {string} collectorId - Bright Data Collector ID (c_xxxxxx)
 * @param {string} status - 'ready' | 'running' | 'error' | 'healing'
 */
function updateScraperConfig(scraperId, collectorId, status = 'ready') {
  const config = loadConfig();
  const scraper = config.scrapers.find(s => s.id === scraperId);
  if (scraper) {
    if (collectorId) scraper.collector_id = collectorId;
    scraper.status = status;
    saveConfig(config);
  }
}

/**
 * Get the full scraper registry.
 * @returns {object[]} Array of scraper configs
 */
function getScrapers() {
  return loadConfig().scrapers;
}

/**
 * Get a specific scraper config by ID.
 * @param {string} scraperId - Internal scraper ID
 * @returns {object|null}
 */
function getScraperById(scraperId) {
  return loadConfig().scrapers.find(s => s.id === scraperId) || null;
}

module.exports = {
  runCli,
  createScraper,
  runScraper,
  healScraper,
  approveHeal,
  getBudget,
  loadConfig,
  saveConfig,
  updateScraperConfig,
  getScrapers,
  getScraperById,
};
