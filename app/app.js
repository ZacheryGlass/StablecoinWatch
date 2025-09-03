/*---------------------------------------------------------
    GLOBALS SETTINGS
---------------------------------------------------------*/

/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
const express = require('express');
const path = require('path');
const cron = require('node-cron');
const routes = require('../routes/routes');
const DataService = require('./data-service');

/*---------------------------------------------------------
    CONSTANTS
---------------------------------------------------------*/
const MINS_BETWEEN_UPDATE = 15;
const PORT = process.env.PORT || 3000;

/*---------------------------------------------------------
    DATA SERVICE SETUP
---------------------------------------------------------*/
const dataService = new DataService();
global.dataService = dataService;

// Initial data fetch
dataService.fetchStablecoinData().catch(error => {
    console.error('Initial data fetch failed:', error);
});

/*---------------------------------------------------------
    SCHEDULED UPDATES
---------------------------------------------------------*/
cron.schedule(`*/${MINS_BETWEEN_UPDATE} * * * *`, () => {
    console.log('Running scheduled data update...');
    dataService.fetchStablecoinData().catch(error => {
        console.error('Scheduled data fetch failed:', error);
    });
});

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
