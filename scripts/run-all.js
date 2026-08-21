/**
 * Run All Scrapers Script
 * 
 * Executes all provisioned scrapers sequentially and stores results.
 * Can be run standalone from the command line or triggered via cron/CI.
 * 
 * Usage: node scripts/run-all.js
 */

const brightdata = require('../server/services/brightdata');
const storage = require('../server/services/storage');

async function main() {
  console.log('🚀 [ScrapeVerse Pulse] Starting sequential scraper run...\n');

  const scrapers = brightdata.getScrapers().filter(s => s.collector_id);

  if (scrapers.length === 0) {
    console.log('⚠️ No scrapers with Collector IDs found in server/config/scrapers.json.');
    process.exit(1);
  }

  for (const scraper of scrapers) {
    console.log(`📡 Running scraper: ${scraper.name} (${scraper.collector_id})...`);
    const startTime = Date.now();

    try {
      brightdata.updateScraperConfig(scraper.id, null, 'running');
      const result = await brightdata.runScraper(scraper.collector_id, scraper.url);

      const data = result.data || result.results || result;
      const saveResult = storage.saveData(scraper.id, data, {
        collector_id: scraper.collector_id,
        url: scraper.url,
      });

      const config = brightdata.loadConfig();
      const scraperConfig = config.scrapers.find(s => s.id === scraper.id);
      if (scraperConfig) {
        scraperConfig.status = 'ready';
        scraperConfig.last_run = new Date().toISOString();
        scraperConfig.record_count = saveResult.recordCount;
        brightdata.saveConfig(config);
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`✅ ${scraper.name}: Scraped ${saveResult.recordCount} records in ${elapsed}s`);
    } catch (err) {
      brightdata.updateScraperConfig(scraper.id, null, 'error');
      console.error(`❌ Error running ${scraper.name}:`, err.message);
    }
    console.log('----------------------------------------------------');
  }

  console.log('\n🎉 [ScrapeVerse Pulse] Scraper run complete!');
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
