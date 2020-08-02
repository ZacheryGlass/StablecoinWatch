/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
const express = require('express');
const { data } = require('./core');

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
    let eth_data = data.platform_data.find((chain) => chain.name === 'Ethereum');
    res.render('home', {
        data: data,
        totalETHMCap: eth_data.total_mcap,
        totalETHMCap_s: eth_data.total_mcap_s,
        active: 'home',
    });
}); // home

/*-----------------------------------------------
    Platforms List
-----------------------------------------------*/
router.get('/chains', async (req, res) => {
    let eth_data = data.platform_data.find((chain) => chain.name === 'Ethereum');
    res.render('chains', {
        data: data,
        totalETHMCap: eth_data.total_mcap,
        totalETHMCap_s: eth_data.total_mcap_s,
        active: 'chains',
    });
}); // chains

/*-----------------------------------------------
    Coins
-----------------------------------------------*/
router.get('/coins/:symbol', async (req, res) => {
    const sc = data.stablecoins.find((c) => c.symbol == req.params.symbol);
    if (sc) res.send(sc);
    else res.send('error');
}); // coins

/*-----------------------------------------------
    Platforms
-----------------------------------------------*/
router.get('/platforms/:name', async (req, res) => {
    const platform = data.platform_data.find((p) => p.name.toLowerCase() == req.params.name.toLowerCase());
    if (platform) res.send(platform);
    else res.send('error');
}); // platforms

/*-----------------------------------------------
    Donate
-----------------------------------------------*/
router.get('/donate', async (req, res) => {
    let eth_data = data.platform_data.find((chain) => chain.name === 'Ethereum');
    res.render('donate', {
        data: data,
        totalETHMCap: eth_data.total_mcap,
        totalETHMCap_s: eth_data.total_mcap_s,
        active: 'donate',
    });
}); // donate

/*---------------------------------------------------------
    EXPORTS
---------------------------------------------------------*/
module.exports = router;
