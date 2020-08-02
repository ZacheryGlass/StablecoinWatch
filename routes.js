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
    Home
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

/*-----------------------------------------------
    Chains
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

/*---------------------------------------------------------
    EXPORTS
---------------------------------------------------------*/
module.exports = router;
