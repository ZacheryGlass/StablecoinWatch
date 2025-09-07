/*---------------------------------------------------------
    GLOBALS SETTINGS
---------------------------------------------------------*/

/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
// Load environment variables from .env
require('dotenv').config();
const express = require('express');
const path = require('path');
const cron = require('node-cron');
const routes = require('../routes/routes');
const HybridStablecoinService = require('./hybrid-stablecoin-service');
const HealthMonitor = require('../services/HealthMonitor');

/*---------------------------------------------------------
    CONSTANTS
---------------------------------------------------------*/
const MINS_BETWEEN_UPDATE = 15;
const PORT = process.env.PORT || 3000;

/*---------------------------------------------------------
    DATA SERVICE SETUP
---------------------------------------------------------*/
// Initialize health monitoring and data service
const healthMonitor = new HealthMonitor();
global.healthMonitor = healthMonitor;

const dataService = new HybridStablecoinService(healthMonitor);
global.dataService = dataService;

// Initialize an app-level source for request monitoring
try { healthMonitor.initializeSource('app'); } catch (e) { /* ignore */ }

// Health monitoring middleware for Express routes
// Records basic request duration and success/failure classification
function healthMiddleware(req, res, next) {
    const start = Date.now();
    res.on('finish', async () => {
        try {
            const duration = Date.now() - start;
            const isError = res.statusCode >= 500;
            if (isError) {
                await healthMonitor.recordFailure('app', {
                    operation: 'http_request',
                    errorType: 'server',
                    message: `${req.method} ${req.originalUrl} -> ${res.statusCode}`,
                    statusCode: res.statusCode,
                    retryable: false,
                    timestamp: Date.now()
                });
            } else {
                await healthMonitor.recordSuccess('app', {
                    operation: 'http_request',
                    duration,
                    recordCount: 0,
                    timestamp: Date.now()
                });
            }
        } catch (err) {
            // Non-fatal: avoid impacting request lifecycle
        }
    });
    next();
}

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
app.use(healthMiddleware);
app.use('/', routes);
app.use(express.json());
app.listen(PORT, () => console.info(`Listening on port ${PORT}`));

// Periodic health summary logging and alert surfacing
setInterval(async () => {
    try {
        const h = await healthMonitor.getSystemHealth();
        console.log(`Health: status=${h.status} score=${h.overallScore} healthy=${h.metrics.healthySourceCount}/${h.metrics.sourceCount}`);
        if (h.activeAlerts && h.activeAlerts.length) {
            const alerts = h.activeAlerts.filter(a => a.active).map(a => `${a.level.toUpperCase()}: ${a.title}`).join('; ');
            if (alerts) console.warn('Health alerts:', alerts);
        }
    } catch (e) {
        console.warn('Failed to get system health for logging:', e.message);
    }
}, 5 * 60 * 1000);
