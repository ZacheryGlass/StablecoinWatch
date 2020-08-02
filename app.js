/*---------------------------------------------------------
    GLOBALS SETTINGS
---------------------------------------------------------*/
global.DEBUG = true;
global.SHOW_WARNINGS = true;
global.fetch = require('node-fetch');
global.WebSocket = require('ws');
global.EXCLUDE_COINS = ['WBTC', 'DGD', 'RSR', 'DPT', 'KBC', '1GOLD'];

/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
const express = require('express');
const cron = require('node-cron');
const util = require('./util');
const { updateData } = require('./core');
const routes = require('./routes');

/*---------------------------------------------------------
    CONSTANTS
---------------------------------------------------------*/
const MINS_BETWEEN_UPDATE = 15;
const PORT = process.env.PORT || 3000;

/*---------------------------------------------------------
    SCHEDULED TASKS
---------------------------------------------------------*/
updateData();
cron.schedule(`*/${MINS_BETWEEN_UPDATE} * * * *`, updateData);

/*---------------------------------------------------------
    APP SETUP
---------------------------------------------------------*/
const app = express();
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/res/styles'));
app.use(express.static(__dirname + '/res/img'));
app.use('/', routes);
app.use(express.json());
app.listen(PORT, () => console.info(`Listening on port ${PORT}`));