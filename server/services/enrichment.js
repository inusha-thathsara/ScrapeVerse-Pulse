/**
 * ScrapeVerse Pulse — AI Data Enrichment Service
 * 
 * Enriches raw scraped JSON records with AI-generated metadata:
 * - Concise executive summaries
 * - Categorization & topic taxonomy tags
 * - Technical sentiment & impact ratings
 * - Key takeaways
 * 
 * Supports Google Gemini API (via HTTP endpoint) with an intelligent
 * local heuristic NLP fallback for offline resilience.
 */

const https = require('https');

/**
 * Call Gemini API to enrich a batch of text records.
 * @param {string} prompt - Enrichment instruction prompt
 * @param {string} apiKey - Gemini API Key
 * @returns {Promise<string>} Model response text
 */
function callGemini(prompt, apiKey) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const parsedUrl = new URL(url);

    const req = https.request(parsedUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: 15000,
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`Gemini API returned status ${res.statusCode}: ${body}`));
          return;
        }
        try {
          const json = JSON.parse(body);
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
          resolve(text);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Gemini API request timed out'));
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Local Heuristic NLP Enrichment Fallback
 * Used when API key is not configured or in offline mode.
 * @param {object} item - Raw scraped record
 * @param {string} sourceId - e.g. 'lobsters', 'huggingface'
 * @returns {object} Enriched fields
 */
function localHeuristicEnrich(item, sourceId) {
  const title = item.paper_title || item.title || item.product_page_url || 'Untitled Record';
  const text = `${title} ${item.abstract || ''} ${item.description || ''}`.toLowerCase();

  // Extract Category
  let category = 'Engineering';
  if (text.includes('llm') || text.includes('gpt') || text.includes('language model') || text.includes('transformer')) {
    category = 'Generative AI';
  } else if (text.includes('robot') || text.includes('manipulation') || text.includes('grasp') || text.includes('vla')) {
    category = 'Robotics & Embodied AI';
  } else if (text.includes('audio') || text.includes('speech') || text.includes('sound') || text.includes('asr')) {
    category = 'Audio & Speech';
  } else if (text.includes('vision') || text.includes('video') || text.includes('image') || text.includes('diffusion')) {
    category = 'Computer Vision';
  } else if (text.includes('rust') || text.includes('zig') || text.includes('compiler') || text.includes('memory') || text.includes('linux')) {
    category = 'Systems & Infrastructure';
  } else if (text.includes('security') || text.includes('attack') || text.includes('vulnerability')) {
    category = 'Cybersecurity';
  }

  // Calculate Impact Score (0 - 100)
  const scoreBase = item.score || item.upvotes || item.likes || 10;
  const impactScore = Math.min(Math.max(scoreBase * 2 + (text.length > 200 ? 30 : 15), 35), 98);

  // Generate Summary
  let summary = '';
  if (item.abstract) {
    const sentences = item.abstract.split('. ');
    summary = sentences.slice(0, 2).join('. ') + (sentences.length > 2 ? '.' : '');
  } else {
    summary = `Key tech development in ${category}: ${title}.`;
  }

  return {
    ai_summary: summary,
    ai_category: category,
    ai_impact_score: impactScore,
    ai_tags: [category, sourceId, 'Trending'],
    ai_enriched_by: 'Local Smart NLP Engine',
  };
}

/**
 * Main Data Enrichment Function
 * Enriches an array of scraped records.
 * @param {Array<object>} records - Array of raw items
 * @param {string} sourceId - Source identifier
 * @param {string} [apiKey] - Optional Gemini API key
 * @returns {Promise<Array<object>>} Enriched records array
 */
async function enrichDataset(records, sourceId, apiKey = process.env.GEMINI_API_KEY) {
  if (!records || records.length === 0) return [];

  // If valid Gemini API key is provided, attempt Gemini batch enrichment
  if (apiKey && apiKey !== 'your_gemini_api_key_here' && !apiKey.startsWith('AQ.')) {
    try {
      const sample = records.slice(0, 8); // Enrich top items via Gemini
      const prompt = `You are a tech intelligence analyst. Analyze the following ${sample.length} items from ${sourceId}.
For each item, return a JSON array with objects containing:
- "index": index number (0 to ${sample.length - 1})
- "ai_summary": 1 punchy summary sentence
- "ai_category": specific category tag
- "ai_impact_score": integer 1-100
- "ai_tags": list of 3 keyword tags

Items:
${JSON.stringify(sample.map((r, i) => ({ i, title: r.paper_title || r.title || r.product_page_url, text: r.abstract || r.description || '' })))}
`;
      const geminiResult = await callGemini(prompt, apiKey);
      const parsed = JSON.parse(geminiResult);

      if (Array.isArray(parsed)) {
        const enrichedSample = sample.map((rec, i) => {
          const match = parsed.find(p => p.index === i) || {};
          return {
            ...rec,
            ai_summary: match.ai_summary || localHeuristicEnrich(rec, sourceId).ai_summary,
            ai_category: match.ai_category || localHeuristicEnrich(rec, sourceId).ai_category,
            ai_impact_score: match.ai_impact_score || 85,
            ai_tags: match.ai_tags || [sourceId, 'AI Analyzed'],
            ai_enriched_by: 'Gemini 2.5 Flash',
          };
        });

        // Combine with remaining items using local enrichment
        const remaining = records.slice(8).map(rec => ({
          ...rec,
          ...localHeuristicEnrich(rec, sourceId),
        }));

        return [...enrichedSample, ...remaining];
      }
    } catch (err) {
      console.warn(`[AI Enrichment] Gemini API fallback triggered: ${err.message}`);
    }
  }

  // Use robust local heuristic enrichment
  return records.map(rec => ({
    ...rec,
    ...localHeuristicEnrich(rec, sourceId),
  }));
}

module.exports = {
  enrichDataset,
  localHeuristicEnrich,
};
