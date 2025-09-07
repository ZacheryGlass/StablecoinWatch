const ApiConfig = require('../config/ApiConfig');
const CmcDataFetcher = require('./fetchers/CmcDataFetcher');
const MessariDataFetcher = require('./fetchers/MessariDataFetcher');
const CoinGeckoDataFetcher = require('./fetchers/CoinGeckoDataFetcher');
const DeFiLlamaDataFetcher = require('./fetchers/DeFiLlamaDataFetcher');

class DataFetcherRegistry {
    constructor(healthMonitor = null) {
        this.healthMonitor = healthMonitor;
        this.fetchers = new Map();
    }

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

    get(sourceId) {
        return this.fetchers.get(sourceId) || null;
    }

    getAll() {
        return Array.from(this.fetchers.values());
    }

    getActive() {
        return this.getAll().filter(f => {
            try { return f.isConfigured(); } catch (_) { return false; }
        });
    }

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

