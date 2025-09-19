#!/usr/bin/env node
/**
 * Build static site output by rendering EJS views using the same data pipeline
 * used by the Express app. Outputs HTML + assets into `dist/`.
 */

// Load env and optional env.{NODE_ENV}
require('dotenv').config();
const fs = require('fs');
const path = require('path');
try {
  const envName = process.env.NODE_ENV || 'production';
  const envPath = path.resolve(__dirname, '..', `.env.${envName}`);
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath, override: true });
    console.info(`Loaded environment overrides from .env.${envName}`);
  }
} catch (_) {}

// Reuse app internals
const ejs = require('ejs');
const templateHelpers = require('../app/util/templateHelpers');
const utilFmt = require('../app/util');
const HealthMonitor = require('../services/HealthMonitor');
const ServiceFactory = require('../services/ServiceFactory');
const AppConfig = require('../config/AppConfig');

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function copyFile(src, dest) {
  await ensureDir(path.dirname(dest));
  await fs.promises.copyFile(src, dest);
}

async function writeFile(dest, contents) {
  await ensureDir(path.dirname(dest));
  await fs.promises.writeFile(dest, contents);
}

async function renderView(viewName, data) {
  const viewsDir = path.resolve(__dirname, '..', 'views');
  const file = path.join(viewsDir, `${viewName}.ejs`);
  const html = await ejs.renderFile(file, data, { root: viewsDir });
  return html;
}

async function main() {
  const outDir = path.resolve(__dirname, '..', 'dist');

  // Clean old build (best-effort)
  try {
    if (fs.existsSync(outDir)) {
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  } catch (_) {}

  const healthMonitor = new HealthMonitor();
  const dataService = ServiceFactory.createDataService(healthMonitor);

  console.log('Refreshing data from APIs...');
  console.log(`Enabled sources: ${process.env.ENABLED_SOURCES || 'cmc,messari (default)'}`);
  console.log(`API timeout: ${process.env.REQUEST_TIMEOUT_MS || 30000}ms`);
  
  // Add timeout wrapper to prevent indefinite hanging
  const DATA_FETCH_TIMEOUT = 8 * 60 * 1000; // 8 minutes
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Data fetch timeout after 8 minutes')), DATA_FETCH_TIMEOUT);
  });
  
  try {
    console.log('Starting data refresh with 8-minute timeout...');
    await Promise.race([
      dataService.refreshData(),
      timeoutPromise
    ]);
    console.log('Data refresh completed successfully');
  } catch (error) {
    console.error('Data refresh failed:', error.message);
    console.log('Continuing with empty/cached data...');
  }
  
  const vm = dataService.getData();

  // Derive ETH totals similar to routes
  const eth = Array.isArray(vm.platform_data)
    ? vm.platform_data.find(p => (p.name || '').toLowerCase() === 'ethereum')
    : null;
  const totalETHMCap = eth ? eth.mcap_sum : 0;
  const totalETHMCap_s = eth ? eth.mcap_sum_s : '$0';

  // Health for status page
  let health = null;
  try { health = await healthMonitor.getSystemHealth(); } catch (e) { health = { error: e.message }; }

  // Common template locals
  const commonLocals = {
    h: templateHelpers,
    formatter: {
      formatNumber: utilFmt.formatNumber,
      formatPrice: utilFmt.formatPrice,
      formatPercentage: utilFmt.formatPercentage,
      formatSupply: utilFmt.formatSupply,
    },
    featureFlags: AppConfig.featureFlags,
  };

  console.log('Rendering pages...');

  // Home (index.html)
  {
    const html = await renderView('home', {
      data: vm,
      totalETHMCap,
      totalETHMCap_s,
      active: 'home',
      ...commonLocals,
    });
    await writeFile(path.join(outDir, 'index.html'), html);
  }

  // Status
  {
    const html = await renderView('status', {
      data: vm,
      totalETHMCap,
      totalETHMCap_s,
      health,
      mockMode: false,
      active: 'status',
      ...commonLocals,
    });
    await ensureDir(path.join(outDir, 'status'));
    await writeFile(path.join(outDir, 'status', 'index.html'), html);
  }

  // Platforms list (/platforms)
  {
    const html = await renderView('chains', {
      data: vm,
      totalETHMCap,
      totalETHMCap_s,
      active: 'chains',
      ...commonLocals,
    });
    await ensureDir(path.join(outDir, 'platforms'));
    await writeFile(path.join(outDir, 'platforms', 'index.html'), html);
  }

  // Individual platform pages (/platforms/:uri)
  if (Array.isArray(vm.platform_data)) {
    for (let i = 0; i < vm.platform_data.length; i++) {
      const platform = vm.platform_data[i];
      const html = await renderView('platforms', {
        data: vm,
        totalETHMCap,
        totalETHMCap_s,
        platform,
        platformIndex: i,
        active: '',
        ...commonLocals,
      });
      const slug = String(platform.uri || platform.name || `platform-${i}`)
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const dir = path.join(outDir, 'platforms', slug);
      await ensureDir(dir);
      await writeFile(path.join(dir, 'index.html'), html);
    }
  }

  // Coin detail pages (/coins/:symbol-or-uri)
  if (Array.isArray(vm.stablecoins)) {
    for (const coin of vm.stablecoins) {
      const html = await renderView('coins', {
        data: vm,
        totalETHMCap,
        totalETHMCap_s,
        coin,
        active: '',
        ...commonLocals,
      });
      const slug = String(coin.uri || coin.symbol || coin.slug || coin.name)
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const dir = path.join(outDir, 'coins', slug);
      await ensureDir(dir);
      await writeFile(path.join(dir, 'index.html'), html);
    }
  }

  console.log('Copying static assets...');
  // Assets used by templates expect root paths like /common.css and /chart.min.js
  await copyFile(path.resolve(__dirname, '..', 'res', 'css', 'common.css'), path.join(outDir, 'common.css'));
  await copyFile(path.resolve(__dirname, '..', 'res', 'js', 'chart.min.js'), path.join(outDir, 'chart.min.js'));
  await copyFile(path.resolve(__dirname, '..', 'res', 'js', 'filter-system.js'), path.join(outDir, 'filter-system.js'));

  // Images at root (default-logo.png and others referenced by templates/logic)
  const imgDir = path.resolve(__dirname, '..', 'res', 'img');
  const imgFiles = await fs.promises.readdir(imgDir);
  for (const f of imgFiles) {
    await copyFile(path.join(imgDir, f), path.join(outDir, f));
  }

  // Expose a static JSON for health if needed
  try {
    await writeFile(path.join(outDir, 'api-health.json'), JSON.stringify(health, null, 2));
  } catch (_) {}

  console.log('Static site built at:', outDir);
}

main().catch(err => {
  console.error('Static build failed:', err);
  process.exit(1);
});

