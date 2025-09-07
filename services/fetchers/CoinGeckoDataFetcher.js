const IDataFetcher = require('../../interfaces/IDataFetcher');
const ApiConfig = require('../../config/ApiConfig');

class CoinGeckoDataFetcher extends IDataFetcher {
    constructor(healthMonitor = null) {
        super();
        this.healthMonitor = healthMonitor;
        this.config = ApiConfig.getApiConfig('coingecko') || {};
        this.sourceId = 'coingecko';
    }

    getSourceId() { return this.sourceId; }
    getSourceName() { return this.config?.name || 'CoinGecko'; }

    isConfigured() {
        // CoinGecko can operate without API key (lower rate limits)
        return !!this.config?.enabled;
    }

    getCapabilities() {
        return this.config?.capabilities || {};
    }

    getRateLimitInfo() { return this.config?.rateLimit || {}; }

    async getHealthStatus() {
        if (!this.healthMonitor) return { healthy: true };
        try { return await this.healthMonitor.getSourceHealth(this.sourceId); } catch (_) { return { healthy: true }; }
    }

    async fetchStablecoins() {
        // Stub: implementation to be added later
        return [];
    }

    transformToStandardFormat(rawData) {
        // Stub transformer for future use
        return [];
    }
}

module.exports = CoinGeckoDataFetcher;

