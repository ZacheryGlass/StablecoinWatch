const IDataFetcher = require('../../interfaces/IDataFetcher');
const ApiConfig = require('../../config/ApiConfig');

class DeFiLlamaDataFetcher extends IDataFetcher {
    constructor(healthMonitor = null) {
        super();
        this.healthMonitor = healthMonitor;
        this.config = ApiConfig.getApiConfig('defillama') || {};
        this.sourceId = 'defillama';
    }

    getSourceId() { return this.sourceId; }
    getSourceName() { return this.config?.name || 'DeFiLlama'; }

    isConfigured() {
        // DeFiLlama doesn't require an API key; use enabled flag
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

module.exports = DeFiLlamaDataFetcher;

