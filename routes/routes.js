/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
const express = require('express');
const { data } = require('../app/core');

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
router.get('/platforms', async (req, res) => {
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
    console.debug(req.params.symbol);
    const symbol = req.params.symbol;
    const coin = data.stablecoins.find((p) => p.symbol.toLowerCase() == symbol.toLowerCase());
    let eth_data = data.platform_data.find((chain) => chain.name === 'Ethereum');
    res.render('coins', {
        data: data,
        totalETHMCap: eth_data.total_mcap,
        totalETHMCap_s: eth_data.total_mcap_s,
        coin: coin,
        active: '',
    });
}); // coins

/*-----------------------------------------------
    Platforms
-----------------------------------------------*/
router.get('/platforms/:name', async (req, res) => {
    console.debug(req.params.name);
    const name = req.params.name.replace('_', ' ');
    const platform = data.platform_data.find((p) => p.name.toLowerCase() == name.toLowerCase());
    let eth_data = data.platform_data.find((chain) => chain.name === 'Ethereum');
    res.render('platforms', {
        data: data,
        totalETHMCap: eth_data.total_mcap,
        totalETHMCap_s: eth_data.total_mcap_s,
        platform: platform,
        active: '',
    });
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
