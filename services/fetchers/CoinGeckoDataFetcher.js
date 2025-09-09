const IDataFetcher = require('../../interfaces/IDataFetcher');
const ApiConfig = require('../../config/ApiConfig');

/**
 * CoinGecko data fetcher implementation (stub).
 * Placeholder implementation for CoinGecko API integration.
 * Currently provides stub methods for future expansion to include CoinGecko
 * as an additional data source for market data and metadata.
 * 
 * @class CoinGeckoDataFetcher
 * @extends {IDataFetcher}
 */
class CoinGeckoDataFetcher extends IDataFetcher {
    /**
     * Creates an instance of CoinGeckoDataFetcher.
     * Initializes the fetcher with health monitoring and API configuration.
     * 
     * @param {Object} [healthMonitor=null] - Health monitoring instance for tracking API health
     * @memberof CoinGeckoDataFetcher
     */
    constructor(healthMonitor = null) {
        super();
        this.healthMonitor = healthMonitor;
        this.config = ApiConfig.getApiConfig('coingecko') || {};
        this.sourceId = 'coingecko';
    }

    /**
     * Gets the unique identifier for this data source.
     * 
     * @returns {string} Source identifier 'coingecko'
     * @memberof CoinGeckoDataFetcher
     */
    getSourceId() { return this.sourceId; }
    /**
     * Gets the human-readable name for this data source.
     * 
     * @returns {string} Source name from configuration or default 'CoinGecko'
     * @memberof CoinGeckoDataFetcher
     */
    getSourceName() { return this.config?.name || 'CoinGecko'; }

    /**
     * Checks if the fetcher is properly configured for API access.
     * CoinGecko can operate without API key but with lower rate limits.
     * Only requires the enabled flag to be set in configuration.
     * 
     * @returns {boolean} True if enabled in configuration, false otherwise
     * @memberof CoinGeckoDataFetcher
     */
    isConfigured() {
        // CoinGecko can operate without API key (lower rate limits)
        return !!this.config?.enabled;
    }

    /**
     * Gets the data capabilities and priority information for this source.
     * Returns configuration-based capabilities or empty object for stub implementation.
     * 
     * @returns {Object} Capabilities object from configuration or empty object
     * @memberof CoinGeckoDataFetcher
     */
    getCapabilities() {
        return this.config?.capabilities || {};
    }

    /**
     * Gets rate limiting configuration for this API source.
     * 
     * @returns {Object} Rate limit configuration object or empty object
     * @memberof CoinGeckoDataFetcher
     */
    getRateLimitInfo() { return this.config?.rateLimit || {}; }

    /**
     * Gets the current health status of this data source.
     * Queries the health monitor for source-specific health metrics and status.
     * 
     * @returns {Promise<Object>} Health status object with healthy flag
     * @memberof CoinGeckoDataFetcher
     */
    async getHealthStatus() {
        if (!this.healthMonitor) return { healthy: true };
        try { return await this.healthMonitor.getSourceHealth(this.sourceId); } catch (_) { return { healthy: true }; }
    }

    /**
     * Fetches stablecoin data from CoinGecko API.
     * Stub implementation - returns empty array until full implementation is added.
     * 
     * @returns {Promise<Array>} Empty array (stub implementation)
     * @memberof CoinGeckoDataFetcher
     */
    async fetchStablecoins() {
        // Stub: implementation to be added later
        return [];
    }

    /**
     * Filters raw CoinGecko data to include only valid stablecoins
     * Prepares filtering structure for future implementation. Expected to filter by
     * stablecoin category and price range validation when full implementation is added.
     * 
     * @param {Array} rawData - Raw cryptocurrency data from CoinGecko API
     * @returns {Array} Filtered array containing only valid stablecoins (empty for stub)
     * @private
     * @memberof CoinGeckoDataFetcher
     */
    _filterStablecoins(rawData) {
        if (!Array.isArray(rawData)) {
            return [];
        }

        // Stub implementation - return empty array until full filtering is implemented
        // Future implementation should filter by:
        // 1. Stablecoin category membership
        // 2. Price range validation (0.5 - 2.0 USD for USD-pegged stablecoins)
        // 3. Market cap minimums
        // 4. Active trading status
        
        return [];
    }

    /**
     * Transforms raw CoinGecko data to standardized internal format.
     * Stub implementation - returns empty array until full implementation is added.
     * 
     * @param {Array} rawData - Raw data array from CoinGecko API (unused in stub)
     * @returns {Array} Empty array (stub implementation)
     * @memberof CoinGeckoDataFetcher
     */
    transformToStandardFormat(rawData) {
        // Stub transformer for future use
        return [];
    }
}

module.exports = CoinGeckoDataFetcher;

