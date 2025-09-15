/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
const express = require('express');
const util = require('../app/util');
const ApiConfig = require('../config/ApiConfig');

// Helper function to calculate data completeness for chain metrics
function calculateChainDataCompleteness(data) {
    const stablecoins = data.stablecoins || [];
    const coinsWithChainData = stablecoins.filter(coin => 
        coin.platforms && coin.platforms.length > 0 && 
        coin.platforms.some(p => p.circulating_supply > 0 || p.total_supply > 0)
    ).length;
    const totalCoins = stablecoins.length;
    const dataCompleteness = totalCoins > 0 ? coinsWithChainData / totalCoins : 0;
    const showChainMetrics = dataCompleteness > 0.75;
    
    return {
        dataCompleteness: Math.round(dataCompleteness * 100),
        showChainMetrics
    };
}

/**
 * Factory to create router with injected services
 * @param {Object} services - The services container with dataService and healthMonitor
 * @returns {express.Router} Configured Express router
 */
module.exports = (services) => {
const router = express.Router();

/*---------------------------------------------------------
    ROUTES
---------------------------------------------------------*/

/**
 * Home page route - displays list of all stablecoins
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.get('/', async (req, res) => {
    const svc = services || req.services || {};
    const data = svc.dataService.getData();
    
    // Calculate data completeness for chain metrics
    const { dataCompleteness, showChainMetrics } = calculateChainDataCompleteness(data);
    
    res.render('home', {
        data: data,
        dataCompleteness,
        showChainMetrics,
        active: 'home',
        formatter: {
            formatNumber: util.formatNumber,
            formatPrice: util.formatPrice,
            formatPercentage: util.formatPercentage,
            formatSupply: util.formatSupply
        }
    });
});

/**
 * Status page route - displays application and health status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.get('/status', async (req, res) => {
    const svc = services || req.services || {};
    const data = svc.dataService.getData();
    
    // Calculate data completeness for chain metrics
    const { dataCompleteness, showChainMetrics } = calculateChainDataCompleteness(data);
    
    let health = null;
    try {
        health = svc.healthMonitor ? await svc.healthMonitor.getSystemHealth() : null;
    } catch (e) {
        health = { error: e?.message || 'Unable to retrieve health' };
    }

    // Determine if any source is using mock data
    let mockMode = false;
    try {
        const cfgs = ApiConfig.getAllApiConfigs();
        mockMode = Object.values(cfgs).some(c => c?.mockData && c.mockData.enabled);
    } catch (_) { mockMode = false; }

    res.render('status', {
        data,
        dataCompleteness,
        showChainMetrics,
        health,
        mockMode,
        active: 'status',
        formatter: {
            formatNumber: require('../app/util').formatNumber,
            formatPrice: require('../app/util').formatPrice,
            formatPercentage: require('../app/util').formatPercentage,
            formatSupply: require('../app/util').formatSupply
        }
    });
});

/**
 * Health API endpoint - returns system health status as JSON
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.get('/api/health', async (req, res) => {
    try {
        const svc = services || req.services || {};
        if (!svc.healthMonitor) {
            return res.status(503).json({ error: 'Health monitor not initialized' });
        }
        const health = await svc.healthMonitor.getSystemHealth();
        res.json(health);
    } catch (err) {
        res.status(500).json({ error: err?.message || 'Failed to get health' });
    }
});

/**
 * Platforms list route - displays all blockchain platforms
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
router.get('/platforms', async (req, res) => {
    const svc = services || req.services || {};
    const data = svc.dataService.getData();
    
    // Calculate data completeness for chain metrics
    const { dataCompleteness, showChainMetrics } = calculateChainDataCompleteness(data);
    
    res.render('chains', {
        data: data,
        dataCompleteness,
        showChainMetrics,
        active: 'chains',
        formatter: {
            formatNumber: util.formatNumber,
            formatPrice: util.formatPrice,
            formatPercentage: util.formatPercentage,
            formatSupply: util.formatSupply
        }
    });
});

/**
 * Individual coin detail route - displays specific stablecoin information
 * @param {Object} req - Express request object with symbol parameter
 * @param {Object} res - Express response object
 */
router.get('/coins/:symbol', async (req, res) => {
    console.debug(`Request for coin page: ${req.params.symbol}`);
    const svc = services || req.services || {};
    const data = svc.dataService.getData();
    const symbol = req.params.symbol;
    const coin = data.stablecoins.find((p) => p.uri === symbol || p.symbol.toLowerCase() === symbol.toLowerCase());
    
    // Calculate data completeness for chain metrics
    const { dataCompleteness, showChainMetrics } = calculateChainDataCompleteness(data);
    
    res.render('coins', {
        data: data,
        dataCompleteness,
        showChainMetrics,
        coin: coin,
        active: '',
        formatter: {
            formatNumber: util.formatNumber,
            formatPrice: util.formatPrice,
            formatPercentage: util.formatPercentage,
            formatSupply: util.formatSupply
        }
    });
});

/**
 * Individual platform detail route - displays specific platform information
 * @param {Object} req - Express request object with platform name parameter
 * @param {Object} res - Express response object
 */
router.get('/platforms/:name', async (req, res) => {
    console.debug(`Request for platform page: ${req.params.name}`);
    const svc = services || req.services || {};
    const data = svc.dataService.getData();

    // Normalize route param (accept hyphens and underscores)
    const paramSlug = String(req.params.name || '').toLowerCase();

    // Try to resolve via platform_data.uri first
    let platformEntry = Array.isArray(data.platform_data)
        ? data.platform_data.find((p) => String(p.uri || '').toLowerCase() === paramSlug)
        : null;

    // Fallback: attempt to match by slugified name (back-compat)
    if (!platformEntry && Array.isArray(data.platform_data)) {
        platformEntry = data.platform_data.find((p) => {
            const slug = String(p.name || '')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
            return slug === paramSlug;
        });
    }

    // Calculate data completeness for chain metrics
    const { dataCompleteness, showChainMetrics } = calculateChainDataCompleteness(data);
    
    // Handle platform not found case
    if (!platformEntry) {
        const platformName = String(req.params.name || '').replace(/[-_]+/g, ' ');
        
        return res.render('platforms', {
            data: data,
            dataCompleteness,
            showChainMetrics,
            platform: { 
                name: platformName, 
                stablecoins: [],
                notFound: true 
            },
            platformIndex: -1,
            active: '',
            formatter: {
                formatNumber: util.formatNumber,
                formatPrice: util.formatPrice,
                formatPercentage: util.formatPercentage,
                formatSupply: util.formatSupply
            }
        });
    }

    // Enhanced platform page with rich data
    const platformIndex = data.platform_data.findIndex(p => p === platformEntry);
    
    res.render('platforms', {
        data: data,
        dataCompleteness,
        showChainMetrics,
        platform: platformEntry,
        platformIndex: platformIndex,
        active: '',
        formatter: {
            formatNumber: util.formatNumber,
            formatPrice: util.formatPrice,
            formatPercentage: util.formatPercentage,
            formatSupply: util.formatSupply
        }
    });
});

 

/*---------------------------------------------------------
    EXPORTS
---------------------------------------------------------*/
return router;
};
