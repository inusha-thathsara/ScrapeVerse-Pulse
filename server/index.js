/**
 * ScrapeVerse Pulse — Express API Server
 * 
 * Backend server that orchestrates Bright Data Scraper Studio operations
 * and serves scraped data to the frontend dashboard.
 * 
 * Endpoints:
 *   /api/scraper/*  — Scraper control (create, run, heal, status)
 *   /api/data/*     — Data retrieval (latest, snapshots, summaries)
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const scraperRoutes = require('./routes/scraper');
const dataRoutes = require('./routes/data');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging (lightweight — no external logger needed)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
  });
  next();
});

// API Routes
app.use('/api/scraper', scraperRoutes);
app.use('/api/data', dataRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    name: 'ScrapeVerse Pulse API',
  });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('  ⚡ ScrapeVerse Pulse API Server');
  console.log(`  🌐 http://localhost:${PORT}`);
  console.log(`  📡 Scraper API:  http://localhost:${PORT}/api/scraper`);
  console.log(`  📊 Data API:     http://localhost:${PORT}/api/data`);
  console.log('');
});
