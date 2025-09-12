const ApiConfig = require('../config/ApiConfig');
const CmcDataFetcher = require('./fetchers/CmcDataFetcher');
const MessariDataFetcher = require('./fetchers/MessariDataFetcher');
const CoinGeckoDataFetcher = require('./fetchers/CoinGeckoDataFetcher');
const DeFiLlamaDataFetcher = require('./fetchers/DeFiLlamaDataFetcher');

/**
 * Registry for managing multiple data fetcher instances
 * Handles registration, retrieval, and health monitoring setup for API data sources
 */
class DataFetcherRegistry {
    /**
     * Create a new data fetcher registry
     * @param {HealthMonitor} [healthMonitor=null] - Optional health monitor for tracking fetcher health
     */
    constructor(healthMonitor = null) {
        this.healthMonitor = healthMonitor;
        this.fetchers = new Map();
    }

    /**
     * Register a data fetcher with the registry
     * @param {Object} fetcher - Data fetcher instance with getSourceId method
     * @returns {DataFetcherRegistry} The registry instance for chaining
     */
    register(fetcher) {
        if (!fetcher || !fetcher.getSourceId) return this;
        const id = fetcher.getSourceId();
        this.fetchers.set(id, fetcher);
        // Initialize health monitor source if available
        if (this.healthMonitor) {
            try { this.healthMonitor.initializeSource(id); } catch (_) {}
        }
        return this;
    }

    /**
     * Get a specific data fetcher by source ID
     * @param {string} sourceId - The source identifier
     * @returns {Object|null} The data fetcher instance or null if not found
     */
    get(sourceId) {
        return this.fetchers.get(sourceId) || null;
    }

    /**
     * Get all registered data fetchers
     * @returns {Array<Object>} Array of all data fetcher instances
     */
    getAll() {
        return Array.from(this.fetchers.values());
    }

    /**
     * Get only active (properly configured) data fetchers
     * @returns {Array<Object>} Array of active data fetcher instances
     */
    getActive() {
        return this.getAll().filter(f => {
            try { return f.isConfigured(); } catch (_) { return false; }
        });
    }

    /**
     * Create a registry with default data fetchers based on enabled sources
     * @param {HealthMonitor} [healthMonitor=null] - Optional health monitor instance
     * @returns {DataFetcherRegistry} Registry with enabled data fetchers
     */
    static createDefault(healthMonitor = null) {
        const registry = new DataFetcherRegistry(healthMonitor);
        const enabled = ApiConfig.getEnabledSources();

        // Instantiate only if source is present in config scope
        if (enabled.includes('cmc')) registry.register(new CmcDataFetcher(healthMonitor));
        if (enabled.includes('messari')) registry.register(new MessariDataFetcher(healthMonitor));
        if (enabled.includes('coingecko')) registry.register(new CoinGeckoDataFetcher(healthMonitor));
        if (enabled.includes('defillama')) registry.register(new DeFiLlamaDataFetcher(healthMonitor));

        return registry;
    }
}

module.exports = DataFetcherRegistry;

