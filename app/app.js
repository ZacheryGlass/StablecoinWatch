/*---------------------------------------------------------
    GLOBALS SETTINGS
---------------------------------------------------------*/
// global.DEBUG = true;
global.fetch = require('node-fetch');
global.WebSocket = require('ws');
global.EXCLUDE_COINS = ['WBTC', 'DGD', 'RSR', 'DPT', 'KBC', '1GOLD'];

/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
const express = require('express');
path = require('path');
const routes = require('../routes/routes');
const { start } = require('./core');

/*---------------------------------------------------------
    CONSTANTS
---------------------------------------------------------*/
const MINS_BETWEEN_UPDATE = 15;
const PORT = process.env.PORT || 3000;

/*---------------------------------------------------------
    APP SETUP
---------------------------------------------------------*/
start(MINS_BETWEEN_UPDATE);
const app = express();
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, '../res/css')));
app.use(express.static(path.join(__dirname, '../res/img')));
app.use(express.static(path.join(__dirname, '../res/js')));
app.use('/', routes);
app.use(express.json());
app.listen(PORT, () => console.info(`Listening on port ${PORT}`));
