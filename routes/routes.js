/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
const express = require('express');

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
    res.render('home', {
        data: data,
        totalETHMCap: 0,
        totalETHMCap_s: '$0',
        active: 'home',
    });
}); // home

/*-----------------------------------------------
    Platforms List
-----------------------------------------------*/
router.get('/platforms', async (req, res) => {
    const data = global.dataService.getData();
    res.render('chains', {
        data: data,
        totalETHMCap: 0,
        totalETHMCap_s: '$0',
        active: 'chains',
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
    res.render('coins', {
        data: data,
        totalETHMCap: 0,
        totalETHMCap_s: '$0',
        coin: coin,
        active: '',
    });
}); // coins

/*-----------------------------------------------
    Platforms
-----------------------------------------------*/
router.get('/platforms/:name', async (req, res) => {
    console.debug(`Request for platform page: ${req.params.name}`);
    const data = global.dataService.getData();
    const name = req.params.name.replace('_', ' ');
    // For now, platforms functionality is simplified since we don't have blockchain integration
    res.render('platforms', {
        data: data,
        totalETHMCap: 0,
        totalETHMCap_s: '$0',
        platform: { name: name, stablecoins: [] },
        active: '',
    });
}); // platforms

/*-----------------------------------------------
    Donate
-----------------------------------------------*/
router.get('/donate', async (req, res) => {
    const data = global.dataService.getData();
    res.render('donate', {
        data: data,
        totalETHMCap: 0,
        totalETHMCap_s: '$0',
        active: 'donate',
    });
}); // donate

/*---------------------------------------------------------
    EXPORTS
---------------------------------------------------------*/
module.exports = router;
