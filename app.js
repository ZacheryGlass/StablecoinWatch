/*---------------------------------------------------------
    GLOBALS SETTINGS
---------------------------------------------------------*/
global.DEBUG = true;
global.SHOW_WARNINGS = true;
global.EXCLUDE_COINS = ['WBTC', 'DGD', 'RSR', 'DPT', 'KBC', '1GOLD'];

/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
const express = require('express');
const cron = require('node-cron');
const util = require('./util');
const { data, updateData } = require('./core');

/*---------------------------------------------------------
    CONSTANTS
---------------------------------------------------------*/
const MINS_BETWEEN_UPDATE = 15;

/*---------------------------------------------------------
    APP SETUP
---------------------------------------------------------*/
const app = express();

app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/res/styles'));
app.use(express.static(__dirname + '/res/img'));

/*---------------------------------------------------------
    SCHEDULED TASKS
---------------------------------------------------------*/
updateData();
cron.schedule(`*/${MINS_BETWEEN_UPDATE} * * * *`, updateData);

/*---------------------------------------------------------
    ROUTES
---------------------------------------------------------*/
app.get('/', async (req, res) => {
    let eth_data = data.platform_data.find((chain) => chain.name === 'Ethereum');
    res.render('home', {
        data: data,
        totalETHMCap: eth_data.total_mcap,
        totalETHMCap_s: eth_data.total_mcap_s,
        active: 'home',
    });
}); // home

app.get('/donate', async (req, res) => {
    let eth_data = data.platform_data.find((chain) => chain.name === 'Ethereum');
    res.render('donate', {
        data: data,
        totalETHMCap: eth_data.total_mcap,
        totalETHMCap_s: eth_data.total_mcap_s,
        active: 'donate',
    });
}); // donate

// create chains page
app.get('/chains', async (req, res) => {
    let eth_data = data.platform_data.find((chain) => chain.name === 'Ethereum');
    res.render('chains', {
        data: data,
        totalETHMCap: eth_data.total_mcap,
        totalETHMCap_s: eth_data.total_mcap_s,
        active: 'chains',
    });
}); // chains

// parses json request and attach to route handler
// (order of app.use matters here)
app.use(express.json());

// process is a global variable.
// Use the eviroment variable if it's set, otherwise use port 3000.
const port = process.env.PORT || 3000;
app.listen(port, () => console.info(`Listening on port ${port}`));
