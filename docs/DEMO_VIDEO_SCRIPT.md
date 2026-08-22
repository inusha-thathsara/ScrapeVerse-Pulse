# 🎬 ScrapeVerse Pulse — Demo Video Script (2–3 Minutes)

This script is structured for recording your hackathon submission video. Follow the minute-by-minute timeline and on-screen actions below.

---

## ⏱️ Timeline & Walkthrough

### [0:00 - 0:35] ⚡ Intro & The Problem
* **On-Screen:** Show **ScrapeVerse Pulse** dashboard (`http://localhost:5173`) with live dark glassmorphism visuals, glowing badges, and statistics cards.
* **Voiceover:**
  > *"Hi everyone! Welcome to **ScrapeVerse Pulse**, an AI-powered web intelligence dashboard built for the 'Into the Scrape-Verse' Hackathon using **Bright Data Scraper Studio**.*  
  > *Traditional web scraping is notoriously brittle. Whenever a target website changes its CSS classes, layout, or markup, scrapers fail silently, resulting in broken pipelines and lost data.*  
  > *ScrapeVerse Pulse solves this with natural language AI scrapers, continuous health monitoring, zero-downtime self-healing, and Gemini-powered data enrichment."*

---

### [0:35 - 1:15] 📊 Multi-Source Scraping & Visual Analytics (Track 1 & 2)
* **On-Screen:**
  1. Hover over the **SVG Donut Chart** and the **Volume Bar Graph** on the Dashboard.
  2. Click on the **'Scrapers'** tab in the navigation bar to show the 3 provisioned collectors:
     * *Lobste.rs (Tech Stories)* — Collector ID `c_mt36pdxg5cznxlkhw`
     * *HuggingFace (AI Papers)* — Collector ID `c_mt36pqqo8b6g3rt1h`
     * *Dev.to (Developer Articles)* — Collector ID `c_mt36qguy1o6htmc3m2`
  3. Click **"Run Scraper"** or show the live extraction happening.
* **Voiceover:**
  > *"Under the hood, we use the Bright Data CLI (`@brightdata/cli`) to manage multiple niche collectors. We target high-value engineering sources like Lobste.rs and daily HuggingFace AI research papers.*  
  > *Our backend Express service orchestrates child processes to execute scrapes, normalize the datasets, and generate timestamped snapshots in real time."*

---

### [1:15 - 1:55] 📰 Live Data Feed, AI Enrichment & Search
* **On-Screen:**
  1. Click **'Data Feed'** in the navigation bar.
  2. Type in the search box (e.g., `"robot"`, `"rust"`, or `"llm"`) to demonstrate instant real-time client-side filtering.
  3. Click **"✨ AI Enrich Dataset"** to show real-time generation of summaries and taxonomy tags.
  4. Click on a record to open the **Record Intelligence Analysis Modal**, showing executive summaries and impact scores.
  5. Click **"Export CSV"** and **"Export JSON"** to show instant dataset downloads.
* **Voiceover:**
  > *"In the Live Data Feed, you can search across thousands of data points instantly. With our AI Enrichment Pipeline, raw HTML extractions are transformed into structured intelligence with summaries, domain taxonomy tags, and impact scores.*  
  > *Users can export these clean datasets directly to JSON or CSV in a single click."*

---

### [1:55 - 2:40] 🩹 Self-Healing Studio & Zero Downtime (Track 3)
* **On-Screen:**
  1. Navigate to the **'Self-Heal'** tab.
  2. Show the **Live Selector Drift & Self-Healing Diff Inspector** table.
  3. Click **"⚡ Run Chaos & Heal Simulation"** to demonstrate:
     * Layout drift detection (red broken indicators).
     * AI self-healing invocation (`bdata scraper heal`).
     * In-place selector repair (green restored indicators).
  4. *(Optional terminal overlay)* Show `node scripts/demo-heal.js` running in terminal.
* **Voiceover:**
  > *"Here is the crown jewel: our **Self-Healing Studio**.*  
  > *When a target site undergoes a redesign, our engine invokes Bright Data Scraper Studio's `heal` command with natural language prompts.*  
  > *As you can see in our live diff inspector, the broken CSS selectors are re-analyzed and repaired in-place in the cloud. The production Collector ID remains completely unchanged, guaranteeing zero downtime and uninterrupted data feeds for downstream applications."*

---

### [2:40 - 3:00] 🚀 Conclusion
* **On-Screen:** Return to the Dashboard view with live activity logs and repository links.
* **Voiceover:**
  > *"ScrapeVerse Pulse unites the power of Bright Data Scraper Studio with modern AI intelligence and resilient self-healing.*  
  > *Check out our open-source code on GitHub. Thanks for watching!"*
