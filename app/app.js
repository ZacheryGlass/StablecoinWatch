/*---------------------------------------------------------
    GLOBALS SETTINGS
---------------------------------------------------------*/

/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
// Load environment variables from .env and env-specific file
require('dotenv').config();
const fs = require('fs');
const envName = process.env.NODE_ENV || 'development';
try {
    const envPath = require('path').resolve(__dirname, '..', `.env.${envName}`);
    if (fs.existsSync(envPath)) {
        require('dotenv').config({ path: envPath, override: true });
        console.info(`Loaded environment overrides from .env.${envName}`);
    }
} catch (_) { /* ignore */ }
const express = require('express');
const path = require('path');
const cron = require('node-cron');
const createRoutes = require('../routes/routes');
const HybridStablecoinService = require('./hybrid-stablecoin-service');
const HealthMonitor = require('../services/HealthMonitor');
const AppConfig = require('../config/AppConfig');
const ApiConfig = require('../config/ApiConfig');

/*---------------------------------------------------------
    CONSTANTS
---------------------------------------------------------*/
const PORT = AppConfig.server.port;

/*---------------------------------------------------------
    SERVICE CONTAINER & DEPENDENCY INJECTION
---------------------------------------------------------*/
class ServiceContainer {
    constructor() {
        this.services = {};
        this.started = false;
        this._timers = [];
        this._jobs = [];
    }

    register(name, instance) {
        this.services[name] = instance;
        return this;
    }

    get(name) {
        return this.services[name];
    }

    attachToApp(app) {
        // Expose services to routes/handlers
        app.locals.services = this.services;
        app.use((req, _res, next) => { req.services = this.services; next(); });
    }

    async start() {
        if (this.started) return;
        this.started = true;

        const healthMonitor = this.get('healthMonitor');
        const dataService = this.get('dataService');

        // Initialize an app-level source for request monitoring
        try { healthMonitor.initializeSource('app'); } catch (_) {}

        // Initial data fetch
        dataService.fetchStablecoinData().catch(err => {
            console.error('Initial data fetch failed:', err);
        });

        // Scheduled updates
        const intervalMins = AppConfig.dataUpdate.intervalMinutes;
        const job = cron.schedule(`*/${intervalMins} * * * *`, () => {
            console.log('Running scheduled data update...');
            dataService.fetchStablecoinData().catch(error => {
                console.error('Scheduled data fetch failed:', error);
            });
        });
        this._jobs.push(job);

        // Periodic health summary logging and alert surfacing
        const healthLogTimer = setInterval(async () => {
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
        this._timers.push(healthLogTimer);
    }

    async stop() {
        if (!this.started) return;
        this.started = false;
        // Stop scheduled jobs
        for (const j of this._jobs) {
            try { j.stop(); } catch (_) {}
        }
        this._jobs = [];
        // Clear timers
        for (const t of this._timers) {
            try { clearInterval(t); } catch (_) {}
        }
        this._timers = [];
    }
}

// Instantiate container and register services
const container = new ServiceContainer();
const healthMonitor = new HealthMonitor();
const dataService = new HybridStablecoinService(healthMonitor);
container.register('healthMonitor', healthMonitor)
         .register('dataService', dataService);

// Health monitoring middleware for Express routes
// Records basic request duration and success/failure classification
function healthMiddleware(req, res, next) {
    const start = Date.now();
    res.on('finish', async () => {
        try {
            const hm = req.services?.healthMonitor || container.get('healthMonitor');
            const duration = Date.now() - start;
            const isError = res.statusCode >= 500;
            if (isError) {
                await hm.recordFailure('app', {
                    operation: 'http_request',
                    errorType: 'server',
                    message: `${req.method} ${req.originalUrl} -> ${res.statusCode}`,
                    statusCode: res.statusCode,
                    retryable: false,
                    timestamp: Date.now()
                });
            } else {
                await hm.recordSuccess('app', {
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

/*---------------------------------------------------------
    APP SETUP
---------------------------------------------------------*/
const app = express();
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, '../res/css')));
app.use(express.static(path.join(__dirname, '../res/img')));
app.use(express.static(path.join(__dirname, '../res/js')));
app.use(healthMiddleware);
// Attach services to req/app for DI
container.attachToApp(app);
// Wire routes with DI
app.use('/', createRoutes(container.services));
app.use(express.json());
app.listen(PORT, () => console.info(`Listening on port ${PORT}`));

// Start services and handle graceful shutdown
// Validate configuration before full start
try {
    const validation = ApiConfig.validate();
    if (!validation.valid) {
        console.error('API configuration errors:', validation.errors);
    }
    if (validation.warnings?.length) {
        console.warn('API configuration warnings:', validation.warnings);
    }
    if (AppConfig.warnings?.length) {
        console.warn('App configuration warnings:', AppConfig.warnings);
    }
} catch (e) {
    console.error('Configuration validation failed:', e.message);
}

container.start();
process.on('SIGINT', async () => { await container.stop(); process.exit(0); });
process.on('SIGTERM', async () => { await container.stop(); process.exit(0); });
