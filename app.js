global.fetch = require('node-fetch');
global.WebSocket = require('ws');
global.EXCLUDE_COINS = ['WBTC', 'DGD', 'RSR', 'DPT', 'KBC', '1GOLD'];

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
// set up express app.
const app = express();

app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/res/styles'));
app.use(express.static(__dirname + '/res/img'));

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

app.get('/coins/:symbol', async (req, res) => {
    const sc = data.stablecoins.find((c) => c.symbol == req.params.symbol);
    if (sc) res.send(sc);
    else res.send('error');
}); // coins

app.get('/platforms/:name', async (req, res) => {
    const platform = data.platform_data.find((p) => p.name.toLowerCase() == req.params.name.toLowerCase());
    if (platform) res.send(platform);
    else res.send('error');
}); // platforms

// parses json request and attach to route handler
// (order of app.use matters here)
app.use(express.json());

// process is a global variable.
// Use the eviroment variable if it's set, otherwise use port 3000.
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}`));
