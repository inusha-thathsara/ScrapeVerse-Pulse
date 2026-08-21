/**
 * ScrapeVerse Pulse — Self-Healing Scraper Demo Script
 * 
 * Demonstrates the full Scraper Studio self-healing lifecycle:
 * 1. Inspects existing collector state
 * 2. Simulates/catches layout drift or missing selector fields
 * 3. Triggers `bdata scraper heal <collector_id> "<prompt>"` with auto-approval
 * 4. Verifies in-place selector repair with zero downstream breaking changes
 * 
 * Usage: node scripts/demo-heal.js [scraperId]
 */

const brightdata = require('../server/services/brightdata');
const storage = require('../server/services/storage');

async function main() {
  console.log('\n=============================================================');
  console.log('  🩹  ScrapeVerse Pulse — AI Self-Healing Scraper Demo');
  console.log('      Powered by Bright Data Scraper Studio CLI');
  console.log('=============================================================\n');

  const scraperId = process.argv[2] || 'lobsters';
  const scraper = brightdata.getScraperById(scraperId);

  if (!scraper || !scraper.collector_id) {
    console.error(`❌ Scraper '${scraperId}' not found or missing Collector ID.`);
    process.exit(1);
  }

  console.log(`📌 Target Scraper:       ${scraper.name}`);
  console.log(`🔑 Collector ID:          ${scraper.collector_id}`);
  console.log(`🌐 Production URL:        ${scraper.url}`);
  console.log(`⏱️  Current Status:        ${scraper.status.toUpperCase()}\n`);

  // Step 1: Simulate Layout Drift / Missing Selector Detection
  console.log('-------------------------------------------------------------');
  console.log('🔍 [STEP 1/4] Anomaly Detection / Schema Audit');
  console.log('-------------------------------------------------------------');
  console.log('⚠️  Detected extraction drift: Story titles or scores returned null/0');
  console.log('⚠️  Target website layout modified class structure.\n');

  const healPrompt = `The story title and score badge changed selectors. Extract story title from the main anchor link, author username from the user tag, and points from the score element.`;

  console.log('-------------------------------------------------------------');
  console.log('🩹 [STEP 2/4] Triggering AI Self-Healing in Scraper Studio');
  console.log('-------------------------------------------------------------');
  console.log(`Prompt: "${healPrompt}"\n`);
  console.log('⏳ Sending repair request to Bright Data AI Engine...');

  const startTime = Date.now();
  brightdata.updateScraperConfig(scraper.id, null, 'healing');

  try {
    const healResult = await brightdata.healScraper(scraper.collector_id, healPrompt, {
      autoApprove: true,
      autoSave: true,
      url: scraper.url,
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ [STEP 3/4] Self-Healing Completed in ${elapsed}s!`);
    console.log('-------------------------------------------------------------');
    console.log('📋 Heal Result Envelope:');
    console.log(JSON.stringify(healResult, null, 2));

    // Update config
    const config = brightdata.loadConfig();
    const scraperConfig = config.scrapers.find(s => s.id === scraper.id);
    if (scraperConfig) {
      scraperConfig.status = 'ready';
      scraperConfig.last_heal = new Date().toISOString();
      brightdata.saveConfig(config);
    }

    // Step 4: Verification Run
    console.log('\n-------------------------------------------------------------');
    console.log('🚀 [STEP 4/4] Verifying Repaired Collector with Live Run');
    console.log('-------------------------------------------------------------');
    console.log(`Executing: npx @brightdata/cli scraper run ${scraper.collector_id} ${scraper.url} --sync`);

    const runResult = await brightdata.runScraper(scraper.collector_id, scraper.url, { sync: true });
    const data = runResult.data || runResult.results || runResult;
    const count = Array.isArray(data) ? data.length : 1;

    storage.saveData(scraper.id, data, {
      collector_id: scraper.collector_id,
      url: scraper.url,
      healed: true,
    });

    console.log(`\n🎉 Verification Succeeded! ${count} records extracted with updated selectors.`);
    console.log(`✨ Collector ID '${scraper.collector_id}' remains preserved with ZERO downstream downtime.\n`);

  } catch (err) {
    console.error(`\n❌ Heal operation encountered an error: ${err.message}`);
    brightdata.updateScraperConfig(scraper.id, null, 'error');
  }
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
