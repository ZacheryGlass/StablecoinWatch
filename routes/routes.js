/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
const express = require('express');
const util = require('../app/util');

/*---------------------------------------------------------
    constants
---------------------------------------------------------*/
const router = express.Router();

/*---------------------------------------------------------
    ROUTES
---------------------------------------------------------*/

/*-----------------------------------------------
    Home (Coins List)
-----------------------------------------------*/
router.get('/', async (req, res) => {
    const data = global.dataService.getData();
    // compute ETH totals from platform_data
    const eth = Array.isArray(data.platform_data) ? data.platform_data.find(p => (p.name || '').toLowerCase() === 'ethereum') : null;
    const totalETHMCap = eth ? eth.mcap_sum : 0;
    const totalETHMCap_s = eth ? eth.mcap_sum_s : '$0';
    res.render('home', {
        data: data,
        totalETHMCap,
        totalETHMCap_s,
        active: 'home',
        formatter: {
            formatNumber: util.formatNumber,
            formatPrice: util.formatPrice,
            formatPercentage: util.formatPercentage,
            formatSupply: util.formatSupply
        }
    });
}); // home

/*-----------------------------------------------
    Platforms List
-----------------------------------------------*/
router.get('/platforms', async (req, res) => {
    const data = global.dataService.getData();
    const eth = Array.isArray(data.platform_data) ? data.platform_data.find(p => (p.name || '').toLowerCase() === 'ethereum') : null;
    const totalETHMCap = eth ? eth.mcap_sum : 0;
    const totalETHMCap_s = eth ? eth.mcap_sum_s : '$0';
    res.render('chains', {
        data: data,
        totalETHMCap,
        totalETHMCap_s,
        active: 'chains',
        formatter: {
            formatNumber: util.formatNumber,
            formatPrice: util.formatPrice,
            formatPercentage: util.formatPercentage,
            formatSupply: util.formatSupply
        }
    });
}); // chains

/*-----------------------------------------------
    Coins
-----------------------------------------------*/
router.get('/coins/:symbol', async (req, res) => {
    console.debug(`Request for coin page: ${req.params.symbol}`);
    const data = global.dataService.getData();
    const symbol = req.params.symbol;
    const coin = data.stablecoins.find((p) => p.uri === symbol || p.symbol.toLowerCase() === symbol.toLowerCase());
    const eth = Array.isArray(data.platform_data) ? data.platform_data.find(p => (p.name || '').toLowerCase() === 'ethereum') : null;
    const totalETHMCap = eth ? eth.mcap_sum : 0;
    const totalETHMCap_s = eth ? eth.mcap_sum_s : '$0';
    res.render('coins', {
        data: data,
        totalETHMCap,
        totalETHMCap_s,
        coin: coin,
        active: '',
        formatter: {
            formatNumber: util.formatNumber,
            formatPrice: util.formatPrice,
            formatPercentage: util.formatPercentage,
            formatSupply: util.formatSupply
        }
    });
}); // coins

/*-----------------------------------------------
    Platforms
-----------------------------------------------*/
router.get('/platforms/:name', async (req, res) => {
    console.debug(`Request for platform page: ${req.params.name}`);
    const data = global.dataService.getData();

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

    const platformName = platformEntry ? platformEntry.name : String(req.params.name || '').replace(/[-_]+/g, ' ');

    // For now, platforms functionality is simplified since we don't have blockchain integration
    const eth = Array.isArray(data.platform_data) ? data.platform_data.find(p => (p.name || '').toLowerCase() === 'ethereum') : null;
    const totalETHMCap = eth ? eth.mcap_sum : 0;
    const totalETHMCap_s = eth ? eth.mcap_sum_s : '$0';
    res.render('platforms', {
        data: data,
        totalETHMCap,
        totalETHMCap_s,
        platform: { name: platformName, stablecoins: [] },
        active: '',
        formatter: {
            formatNumber: util.formatNumber,
            formatPrice: util.formatPrice,
            formatPercentage: util.formatPercentage,
            formatSupply: util.formatSupply
        }
    });
}); // platforms

/*-----------------------------------------------
    Donate
-----------------------------------------------*/
router.get('/donate', async (req, res) => {
    const data = global.dataService.getData();
    const eth = Array.isArray(data.platform_data) ? data.platform_data.find(p => (p.name || '').toLowerCase() === 'ethereum') : null;
    const totalETHMCap = eth ? eth.mcap_sum : 0;
    const totalETHMCap_s = eth ? eth.mcap_sum_s : '$0';
    res.render('donate', {
        data: data,
        totalETHMCap,
        totalETHMCap_s,
        active: 'donate',
        formatter: {
            formatNumber: util.formatNumber,
            formatPrice: util.formatPrice,
            formatPercentage: util.formatPercentage,
            formatSupply: util.formatSupply
        }
    });
}); // donate

/*---------------------------------------------------------
    EXPORTS
---------------------------------------------------------*/
module.exports = router;
