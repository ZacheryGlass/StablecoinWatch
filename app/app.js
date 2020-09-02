/*---------------------------------------------------------
    GLOBALS SETTINGS
---------------------------------------------------------*/
global.DEBUG = true;
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
const routes = require('../routes/routes');
path = require('path');

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
app.use(express.static(path.join(__dirname, '../res/css')));
app.use(express.static(path.join(__dirname, '../res/img')));
app.use(express.static(path.join(__dirname, '../res/js')));
app.use('/', routes);
app.use(express.json());
app.listen(PORT, () => console.info(`Listening on port ${PORT}`));
