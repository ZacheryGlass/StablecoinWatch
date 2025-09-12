const axios = require('axios');
const fs = require('fs');
const path = require('path');
const IDataFetcher = require('../../interfaces/IDataFetcher');
const ApiConfig = require('../../config/ApiConfig');
const AppConfig = require('../../config/AppConfig');
const DEBUG = AppConfig.development.debugMode || AppConfig.development.verbose;

/**
 * CoinMarketCap data fetcher implementation.
 * Fetches stablecoin data from the CoinMarketCap API, handles authentication,
 * rate limiting, and provides comprehensive error handling with health monitoring.
 * Supports both live API calls and mock data mode for development/testing.
 * 
 * @class CmcDataFetcher
 * @extends {IDataFetcher}
 */
class CmcDataFetcher extends IDataFetcher {
    /**
     * Creates an instance of CmcDataFetcher.
     * Initializes the fetcher with health monitoring, API configuration from ApiConfig,
     * and sets up the source identifier.
     * 
     * @param {Object} [healthMonitor=null] - Health monitoring instance for tracking API health
     * @memberof CmcDataFetcher
     */
    constructor(healthMonitor = null) {
        super();
        this.healthMonitor = healthMonitor;
        this.config = ApiConfig.getApiConfig('cmc') || {};
        this.sourceId = 'cmc';
        
        // Pre-compile stablecoin tags Set for O(1) lookup performance
        const tagName = this.config?.processing?.stablecoinFilter?.tagName || 'stablecoin';
        this._stablecoinTags = new Set([tagName]);
    }

    /**
     * Gets the unique identifier for this data source.
     * 
     * @returns {string} Source identifier 'cmc'
     * @memberof CmcDataFetcher
     */
    getSourceId() { return this.sourceId; }
    /**
     * Gets the human-readable name for this data source.
     * 
     * @returns {string} Source name from configuration or default 'CoinMarketCap'
     * @memberof CmcDataFetcher
     */
    getSourceName() { return this.config?.name || 'CoinMarketCap'; }

    /**
     * Checks if the fetcher is properly configured for API access.
     * Validates that the source is enabled and API key is provided.
     * 
     * @returns {boolean} True if properly configured, false otherwise
     * @memberof CmcDataFetcher
     */
    isConfigured() {
        // Allow operation when mock data mode is enabled even without API key
        if (this.config?.mockData?.enabled) return true;
        return !!(this.config?.enabled && this.config?.apiKey);
    }

    /**
     * Gets the data capabilities and priority information for this source.
     * Returns configuration defining what types of data this source provides
     * and its priority in data merging operations.
     * 
     * @returns {Object} Capabilities object with data types, priority, and feature flags
     * @memberof CmcDataFetcher
     */
    getCapabilities() {
        return this.config?.capabilities || {
            hasMarketData: true,
            hasSupplyData: true,
            hasPlatformData: true,
            hasNetworkBreakdown: false,
            hasMetadata: true,
            priority: 10,
            dataTypes: ['price', 'market_cap', 'volume', 'rank', 'tags']
        };
    }

    /**
     * Gets rate limiting configuration for this API source.
     * 
     * @returns {Object} Rate limit configuration object
     * @memberof CmcDataFetcher
     */
    getRateLimitInfo() {
        return this.config?.rateLimit || {};
    }

    /**
     * Gets the current health status of this data source.
     * Queries the health monitor for source-specific health metrics and status.
     * 
     * @returns {Promise<Object>} Health status object with healthy flag and metrics
     * @memberof CmcDataFetcher
     */
    async getHealthStatus() {
        if (!this.healthMonitor) return { healthy: true };
        try {
            return await this.healthMonitor.getSourceHealth(this.sourceId);
        } catch (_) {
            return { healthy: true };
        }
    }

    /**
     * Fetches stablecoin data from CoinMarketCap API or mock data.
     * Handles authentication, request parameters, filtering, and health monitoring.
     * Filters results to include only stablecoins with appropriate price ranges.
     * 
     * @returns {Promise<Array>} Array of raw stablecoin data from CoinMarketCap
     * @throws {Error} When API request fails, authentication issues, or data validation errors
     * @memberof CmcDataFetcher
     */
    async fetchStablecoins() {
        if (DEBUG) console.log(`[CMC Debug] fetchStablecoins called`);
        const startTime = Date.now();
        const sourceId = this.sourceId;

        if (!this.isConfigured()) {
            if (DEBUG) console.log(`[CMC Debug] CMC not configured, returning empty array`);
            return [];
        }
        if (DEBUG) console.log(`[CMC Debug] CMC is configured, proceeding with API call`);

        if (this.healthMonitor) {
            try {
                const h = await this.healthMonitor.getSourceHealth(sourceId);
                const cb = h && h.circuitBreaker;
                if (cb && cb.state === 'open' && cb.nextRetryTime && Date.now() < cb.nextRetryTime) {
                    return [];
                }
            } catch (_) { }
        }

        try {
            let data;

            // Check if mock data mode is enabled
            if (this.config?.mockData?.enabled) {
                data = await this._loadMockData();
            } else {
                const baseUrl = this.config?.baseUrl || 'https://pro-api.coinmarketcap.com';
                const url = `${baseUrl}${this.config?.endpoints?.listings || '/v1/cryptocurrency/listings/latest'}`;
                const headers = {
                    ...(this.config?.request?.headers || {}),
                    'X-CMC_PRO_API_KEY': this.config?.apiKey,
                };

                const parameters = {
                    start: '1',
                    limit: String(this.config?.processing?.maxResults || 5000),
                    aux: 'tags'
                };

                const timeout = this.config?.request?.timeout || AppConfig.api.defaultTimeout;
                const response = await axios.get(url, { headers, params: parameters, timeout });
                data = response.data;
            }

            if (DEBUG) console.log(`[CMC Debug] API response received, data.data length: ${data?.data?.length || 'null'}`);
            
            if (!data?.data) {
                if (DEBUG) console.log(`[CMC Debug] No data.data in API response - throwing error`);
                throw new Error('No data received from CoinMarketCap API');
            }

            if (DEBUG) console.log(`[CMC Debug] Proceeding to filter ${data.data.length} coins from API`);
            // Filter the raw data to include only valid stablecoins
            const stablecoins = await this._filterStablecoins(data.data);
            if (DEBUG) console.log(`[CMC Debug] After filtering: ${stablecoins.length} stablecoins found`);

            // No tracing logs in production

            if (this.healthMonitor) {
                await this.healthMonitor.recordSuccess(sourceId, {
                    operation: 'fetchStablecoins',
                    duration: Date.now() - startTime,
                    recordCount: stablecoins.length,
                    timestamp: Date.now()
                });
            }

            return stablecoins;
        } catch (error) {
            if (DEBUG) console.log(`[CMC Debug] Error in fetchStablecoins: ${error.message}`);
            if (this.healthMonitor) {
                await this.healthMonitor.recordFailure(sourceId, {
                    operation: 'fetchStablecoins',
                    errorType: this._categorizeError(error),
                    message: error?.message || 'CMC fetch error',
                    statusCode: error?.response?.status,
                    retryable: this._isRetryable(error),
                    timestamp: Date.now()
                });
            }
            throw error;
        }
    }

    /**
     * Filters raw CoinMarketCap data to include only valid stablecoins
     * Applies tag-based filtering and price range validation based on configuration
     * 
     * @param {Array} rawData - Raw cryptocurrency data from CoinMarketCap API
     * @returns {Array} Filtered array containing only valid stablecoins
     * @private
     * @memberof CmcDataFetcher
     */
    async _filterStablecoins(rawData) {
        if (!Array.isArray(rawData)) {
            return [];
        }

        // For large datasets, use async batching to prevent main thread blocking
        if (rawData.length > 1000) {
            return await this._filterStablecoinsAsync(rawData);
        }

        return this._filterStablecoinsSync(rawData);
    }

    _filterStablecoinsSync(rawData) {
        const priceRange = this.config?.processing?.stablecoinFilter?.priceRange || { min: 0.5, max: 2.0 };

        return rawData.filter((crypto) => {
            // Check for stablecoin tag presence using O(1) Set lookup
            const hasStablecoinTag = crypto.tags && 
                crypto.tags.some(tag => this._stablecoinTags.has(tag));
            if (!hasStablecoinTag) {
                return false;
            }

            // Validate price range for USD-pegged stablecoins
            const price = crypto.quote?.USD?.price;
            const isReasonablePrice = !price || (price >= priceRange.min && price <= priceRange.max);
            
            return isReasonablePrice;
        });
    }

    async _filterStablecoinsAsync(rawData) {
        const batchSize = 1000;
        const results = [];
        
        for (let i = 0; i < rawData.length; i += batchSize) {
            const batch = rawData.slice(i, i + batchSize);
            const filtered = this._filterStablecoinsSync(batch);
            results.push(...filtered);
            
            // Yield control back to event loop to prevent blocking
            if (i + batchSize < rawData.length) {
                await new Promise(resolve => setImmediate(resolve));
            }
        }
        
        return results;
    }

    /**
     * Transforms raw CoinMarketCap data to standardized internal format.
     * Maps CoinMarketCap API response fields to the standard data structure used
     * throughout the application for consistent data handling.
     * 
     * @param {Array} rawData - Raw data array from CoinMarketCap API
     * @returns {Array} Array of standardized stablecoin data objects
     * @memberof CmcDataFetcher
     */
    transformToStandardFormat(rawData) {
        const ts = Date.now();
        
        // Debug logging for first few coins to understand data structure
        if (DEBUG && rawData && rawData.length > 0) {
            console.log(`[CMC Debug] Processing ${rawData.length} coins from API`);
            for (let i = 0; i < Math.min(3, rawData.length); i++) {
                const coin = rawData[i];
                console.log(`[CMC Debug] Coin ${i + 1}: id=${coin.id}, name=${coin.name}, symbol=${coin.symbol}, slug=${coin.slug}`);
                console.log(`[CMC Debug] Volume: ${coin.quote?.USD?.volume_24h}, Price: ${coin.quote?.USD?.price}, MCap: ${coin.quote?.USD?.market_cap}`);
                console.log(`[CMC Debug] Generated image URL: https://s2.coinmarketcap.com/static/img/coins/64x64/${coin.id}.png`);
            }
        }
        
        const out = (rawData || []).map((coin) => ({
            sourceId: this.sourceId,
            id: coin.id,
            name: coin.name,
            symbol: coin.symbol ? String(coin.symbol).toUpperCase() : coin.symbol,
            slug: (coin.slug || coin.symbol || '').toLowerCase(),
            marketData: {
                price: coin.quote?.USD?.price ?? null,
                marketCap: coin.quote?.USD?.market_cap ?? null,
                volume24h: coin.quote?.USD?.volume_24h ?? null,
                percentChange24h: coin.quote?.USD?.percent_change_24h ?? null,
                rank: coin.cmc_rank ?? null,
            },
            supplyData: {
                circulating: (coin.quote?.USD?.market_cap && coin.quote?.USD?.price)
                    ? coin.quote.USD.market_cap / coin.quote.USD.price
                    : coin.circulating_supply ?? null,
                total: coin.total_supply ?? null,
                max: coin.max_supply ?? null,
                networkBreakdown: coin.platform ? [{
                    name: coin.platform.name || 'Unknown',
                    network: (coin.platform.slug || coin.platform.symbol || null) ? String(coin.platform.slug || coin.platform.symbol).toLowerCase() : null,
                    contractAddress: coin.platform.token_address || null,
                    supply: null,
                    percentage: null,
                }] : [],
            },
            platforms: coin.platform ? [{
                name: coin.platform.name || 'Unknown',
                network: (coin.platform.slug || coin.platform.symbol || null) ? String(coin.platform.slug || coin.platform.symbol).toLowerCase() : null,
                contractAddress: coin.platform.token_address || null,
                supply: null,
                percentage: null,
            }] : [],
            metadata: {
                tags: coin.tags || [],
                description: null,
                website: null,
                logoUrl: `https://s2.coinmarketcap.com/static/img/coins/64x64/${coin.id}.png`,
                dateAdded: coin.date_added || null,
            },
            confidence: 0.9,
            timestamp: ts,
        }));
        return out;
    }

    /**
     * Categorizes errors for better error handling and monitoring.
     * Maps different error types (HTTP status codes, network issues) to
     * standardized error categories for consistent handling.
     * 
     * @param {Error} error - The error object to categorize
     * @returns {string} Error category ('auth', 'rate_limit', 'network', 'server', etc.)
     * @private
     * @memberof CmcDataFetcher
     */
    _categorizeError(error) {
        if (!error) return 'unknown';
        const status = error?.response?.status;
        if (status === 401 || status === 403) return 'auth';
        if (status === 404) return 'not_found';
        if (status === 429) return 'rate_limit';
        if (status >= 500) return 'server';
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) return 'timeout';
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') return 'network';
        return 'unknown';
    }

    /**
     * Determines if an error is retryable for circuit breaker logic.
     * Identifies which error types should trigger retry attempts vs. permanent failures.
     * 
     * @param {Error} error - The error object to evaluate
     * @returns {boolean} True if the error type is retryable, false otherwise
     * @private
     * @memberof CmcDataFetcher
     */
    _isRetryable(error) {
        const type = this._categorizeError(error);
        return ['timeout', 'network', 'server', 'rate_limit'].includes(type);
    }

    /**
     * Loads mock data from file for development/testing purposes.
     * Reads JSON data from configured mock file path and simulates fresh API response
     * by updating timestamps. Used when mock data mode is enabled in configuration.
     * 
     * @returns {Promise<Object>} Mock API response data with updated timestamp
     * @throws {Error} When mock file is not found or cannot be parsed
     * @private
     * @memberof CmcDataFetcher
     */
    async _loadMockData() {
        const mockFilePath = this.config?.mockData?.filePath || 'cmc_raw_output.json';
        const fullPath = path.resolve(mockFilePath);
        
        try {
            if (!fs.existsSync(fullPath)) {
                throw new Error(`Mock data file not found: ${fullPath}`);
            }
            
            const rawData = fs.readFileSync(fullPath, 'utf8');
            const mockData = JSON.parse(rawData);
            
            // Add timestamp to simulate fresh data
            if (mockData.status) {
                mockData.status.timestamp = new Date().toISOString();
            }
            
            return mockData;
        } catch (error) {
            throw new Error(`Failed to load CMC mock data from ${fullPath}: ${error.message}`);
        }
    }
}

module.exports = CmcDataFetcher;
