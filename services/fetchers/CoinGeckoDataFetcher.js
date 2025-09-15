const IDataFetcher = require('../../interfaces/IDataFetcher');
const ApiConfig = require('../../config/ApiConfig');
const AssetClassifier = require('../domain/AssetClassifier');
const axios = require('axios');

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
        
        // Initialize AssetClassifier for centralized classification
        const classificationConfig = this.config?.classification || {};
        this.classifier = new AssetClassifier(classificationConfig);
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
        // If mock data mode is enabled, allow without live API access
        if (this.config?.mockData?.enabled) return true;
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
     * Uses the markets endpoint with the stablecoins category to retrieve
     * price, market cap, volume, supply, and image URL data.
     * 
     * @returns {Promise<Array>} Raw CoinGecko response array
     */
    async fetchStablecoins() {
        if (!this.isConfigured()) return [];
        const startTime = Date.now();
        const sourceId = this.sourceId;

        try {
            let data;
            if (this.config?.mockData?.enabled) {
                // Load from mock file if enabled
                try {
                    const fs = require('fs');
                    const path = require('path');
                    const mockFilePath = this.config?.mockData?.filePath || 'coingecko_raw_output.json';
                    const fullPath = path.resolve(mockFilePath);
                    const raw = fs.readFileSync(fullPath, 'utf8');
                    data = JSON.parse(raw);
                } catch (e) {
                    data = [];
                }
            } else {
                // Basic free endpoint; API key optional. Respect config for base URL.
                const baseUrl = this.config?.baseUrl || 'https://api.coingecko.com/api/v3';
                const url = `${baseUrl}/coins/markets`;
                const params = {
                    vs_currency: (this.config?.processing?.currency || 'usd'),
                    category: (this.config?.processing?.category || 'stablecoins'),
                    per_page: 250,
                    page: 1,
                    sparkline: this.config?.processing?.includeSparkline ? true : false,
                    price_change_percentage: (this.config?.processing?.priceChangePercentage || '24h')
                };
                const headers = { ...(this.config?.request?.headers || {}) };
                if (this.config?.apiKey) headers['x-cg-pro-api-key'] = this.config.apiKey;

                const resp = await axios.get(url, { params, headers, timeout: this.config?.request?.timeout || 10000 });
                data = Array.isArray(resp?.data) ? resp.data : [];
            }

            // Optional: record health success
            if (this.healthMonitor) {
                await this.healthMonitor.recordSuccess(sourceId, {
                    operation: 'fetchStablecoins',
                    duration: Date.now() - startTime,
                    recordCount: Array.isArray(data) ? data.length : 0,
                    timestamp: Date.now()
                });
            }

            // Filter and transform
            const filtered = this._filterStablecoins(Array.isArray(data) ? data : []);
            return filtered;
        } catch (error) {
            if (this.healthMonitor) {
                try {
                    await this.healthMonitor.recordFailure(sourceId, {
                        operation: 'fetchStablecoins',
                        errorType: error?.response?.status === 429 ? 'rate_limit' : 'network',
                        message: error?.message || 'CoinGecko fetch error',
                        statusCode: error?.response?.status,
                        retryable: [429, 500, 502, 503, 504].includes(error?.response?.status),
                        timestamp: Date.now()
                    });
                } catch (_) {}
            }
            return [];
        }
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
        if (!Array.isArray(rawData)) return [];
        const minPrice = 0.5;
        const maxPrice = 2.0;
        const minMcap = 1_000_000; // 1M
        return rawData
            // API already filtered by stablecoins category; apply sanity filters
            .filter(c => typeof c.current_price === 'number' && c.current_price >= minPrice && c.current_price <= maxPrice)
            .filter(c => (c.market_cap || 0) >= minMcap)
            .map(c => ({
                // Keep only fields we need for transform
                id: c.id,
                symbol: c.symbol,
                name: c.name,
                image: c.image,
                current_price: c.current_price,
                market_cap: c.market_cap,
                total_volume: c.total_volume,
                price_change_percentage_24h: c.price_change_percentage_24h,
                market_cap_rank: c.market_cap_rank,
                circulating_supply: c.circulating_supply,
                total_supply: c.total_supply
            }));
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
        const ts = Date.now();
        const out = (rawData || []).map((coin) => {
            // Use AssetClassifier for consistent classification
            const classification = this.classifier.classify({
                tags: ['coingecko'], // CoinGecko doesn't provide detailed tags in markets endpoint
                name: coin.name,
                symbol: coin.symbol,
                slug: coin.id
            });
            
            return {
                sourceId: this.sourceId,
                id: coin.id,
                name: coin.name,
                symbol: coin.symbol ? String(coin.symbol).toUpperCase() : coin.symbol,
                slug: (coin.id || coin.symbol || '').toLowerCase(),
                marketData: {
                    price: coin.current_price ?? null,
                    marketCap: coin.market_cap ?? null,
                    volume24h: coin.total_volume ?? null,
                    percentChange24h: coin.price_change_percentage_24h ?? null,
                    rank: coin.market_cap_rank ?? null,
                },
                supplyData: {
                    circulating: coin.circulating_supply ?? null,
                    total: coin.total_supply ?? null,
                    max: null,
                    networkBreakdown: []
                },
                platforms: [],
                metadata: {
                    tags: ['coingecko'],
                    description: null,
                    website: null,
                    logoUrl: coin.image || null,
                    dateAdded: null,
                    peggedAsset: classification.peggedAsset,
                },
                assetCategory: classification.assetCategory,
                confidence: 0.6,
                timestamp: ts,
            };
        });
        return out;
    }
}

module.exports = CoinGeckoDataFetcher;
