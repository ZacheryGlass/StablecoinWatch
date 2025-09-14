/**
 * API-specific configuration for different data sources
 * Designed for easy addition of new APIs (CoinGecko, DeFiLlama, etc.)
 */
const AppConfig = require('./AppConfig');

class ApiConfig {
    constructor() {
        this._apiConfigs = this._loadApiConfigs();
        // In debug or mockApis mode, force mock data usage for all sources
        try {
            const debugMode = !!(AppConfig?.development?.debugMode);
            const mockApis = !!(AppConfig?.development?.mockApis);
            if (debugMode || mockApis) {
                for (const [key, cfg] of Object.entries(this._apiConfigs)) {
                    if (!cfg.mockData) cfg.mockData = {};
                    cfg.mockData.enabled = true;
                }
            }
        } catch (_) { /* best-effort */ }
    }

    /**
     * Load API-specific configurations
     * @private
     * @returns {Object} API configurations by source ID
     */
    _loadApiConfigs() {
        return {
            // CoinMarketCap Configuration
            cmc: {
                name: 'CoinMarketCap',
                enabled: !!process.env.CMC_API_KEY,
                baseUrl: process.env.CMC_BASE_URL || 'https://pro-api.coinmarketcap.com',
                apiKey: process.env.CMC_API_KEY,
                
                endpoints: {
                    listings: '/v1/cryptocurrency/listings/latest',
                    quotes: '/v1/cryptocurrency/quotes/latest',
                    metadata: '/v1/cryptocurrency/info',
                    global: '/v1/global-metrics/quotes/latest'
                },
                
                rateLimit: {
                    requestsPerMinute: this._parseRateLimit(process.env.CMC_RATE_LIMIT, 333), // Basic plan
                    requestsPerHour: null,
                    requestsPerDay: this._parseRateLimit(process.env.CMC_DAILY_LIMIT, 10000),
                    burstLimit: 10
                },
                
                request: {
                    timeout: parseInt(process.env.CMC_TIMEOUT_MS) || 15000,
                    retries: parseInt(process.env.CMC_RETRIES) || 3,
                    retryDelay: parseInt(process.env.CMC_RETRY_DELAY_MS) || 2000,
                    headers: {
                        'Accepts': 'application/json',
                        'Accept-Encoding': 'deflate, gzip'
                    }
                },
                
                capabilities: {
                    hasMarketData: true,
                    hasSupplyData: true,
                    hasPlatformData: true,  // Limited to token platform
                    hasNetworkBreakdown: false,
                    hasMetadata: true,
                    priority: 10, // High priority for market data
                    dataTypes: ['price', 'market_cap', 'volume', 'rank', 'tags']
                },
                
                processing: {
                    stablecoinFilter: {
                        byTag: true,
                        tagName: 'stablecoin',
                        priceRange: {
                            min: parseFloat(process.env.CMC_PRICE_MIN) || 0.50,
                            max: parseFloat(process.env.CMC_PRICE_MAX) || 2.00
                        }
                    },
                    batchSize: parseInt(process.env.CMC_BATCH_SIZE) || 5000,
                    maxResults: parseInt(process.env.CMC_MAX_RESULTS) || 5000
                },

                mockData: {
                    enabled: process.env.CMC_MOCK_DATA === 'true',
                    filePath: process.env.CMC_MOCK_FILE || 'cmc_raw_output.json'
                }
            },

            // Messari Configuration
            messari: {
                name: 'Messari',
                enabled: !!process.env.MESSARI_API_KEY,
                baseUrl: process.env.MESSARI_BASE_URL || 'https://data.messari.io/api',
                apiKey: process.env.MESSARI_API_KEY,
                
                endpoints: {
                    stablecoins: '/v2/assets',
                    stablecoinMetrics: '/v2/assets',
                    asset: '/v1/assets/{id}',
                    metrics: '/v1/assets/{id}/metrics'
                },
                
                rateLimit: {
                    requestsPerMinute: this._parseRateLimit(process.env.MESSARI_RATE_LIMIT, 20), // Free plan
                    requestsPerHour: this._parseRateLimit(process.env.MESSARI_HOURLY_LIMIT, 1000),
                    requestsPerDay: null,
                    burstLimit: 5
                },
                
                request: {
                    timeout: parseInt(process.env.MESSARI_TIMEOUT_MS) || 20000,
                    retries: parseInt(process.env.MESSARI_RETRIES) || 3,
                    retryDelay: parseInt(process.env.MESSARI_RETRY_DELAY_MS) || 3000,
                    headers: {
                        'Accept': 'application/json'
                    }
                },
                
                capabilities: {
                    hasMarketData: false, // Limited market data
                    hasSupplyData: true,
                    hasPlatformData: true,
                    hasNetworkBreakdown: true, // Excellent network breakdown
                    hasMetadata: true,
                    priority: 8, // High priority for supply and platform data
                    dataTypes: ['supply', 'network_breakdown', 'platforms', 'metadata']
                },
                
                processing: {
                    useStablecoinEndpoint: process.env.MESSARI_USE_STABLECOIN_ENDPOINT !== 'false',
                    includeInactive: process.env.MESSARI_INCLUDE_INACTIVE === 'true',
                    batchSize: parseInt(process.env.MESSARI_BATCH_SIZE) || 100
                },

                mockData: {
                    enabled: process.env.MESSARI_MOCK_DATA === 'true',
                    filePath: process.env.MESSARI_MOCK_FILE || 'messari_raw_output.json'
                }
            },

            // CoinGecko Configuration (for future use)
            coingecko: {
                name: 'CoinGecko',
                // CoinGecko can operate without an API key (free tier)
                // Enable by default to provide resilient fallback for price/volume/images
                enabled: true,
                baseUrl: process.env.COINGECKO_BASE_URL || 'https://api.coingecko.com/api/v3',
                apiKey: process.env.COINGECKO_API_KEY, // Optional for free tier
                
                endpoints: {
                    coins: '/coins/markets',
                    coin: '/coins/{id}',
                    search: '/search',
                    categories: '/coins/categories'
                },
                
                rateLimit: {
                    requestsPerMinute: this._parseRateLimit(process.env.COINGECKO_RATE_LIMIT, 
                        process.env.COINGECKO_API_KEY ? 500 : 10), // Pro vs free
                    requestsPerHour: null,
                    requestsPerDay: null,
                    burstLimit: process.env.COINGECKO_API_KEY ? 20 : 5
                },
                
                request: {
                    timeout: parseInt(process.env.COINGECKO_TIMEOUT_MS) || 10000,
                    retries: parseInt(process.env.COINGECKO_RETRIES) || 2,
                    retryDelay: parseInt(process.env.COINGECKO_RETRY_DELAY_MS) || 1000,
                    headers: {
                        'Accept': 'application/json'
                    }
                },
                
                capabilities: {
                    hasMarketData: true,
                    hasSupplyData: true,
                    hasPlatformData: true,
                    hasNetworkBreakdown: false,
                    hasMetadata: true,
                    priority: 6, // Medium priority
                    dataTypes: ['price', 'market_cap', 'volume', 'supply', 'metadata']
                },
                
                processing: {
                    category: 'stablecoins',
                    currency: 'usd',
                    includeSparkline: false,
                    priceChangePercentage: '24h'
                },

                mockData: {
                    enabled: process.env.COINGECKO_MOCK_DATA === 'true',
                    filePath: process.env.COINGECKO_MOCK_FILE || 'coingecko_raw_output.json'
                }
            },

            // DeFiLlama Configuration (for future use)
            defillama: {
                name: 'DeFiLlama',
                enabled: true, // No API key required, controlled by ENABLED_SOURCES
                baseUrl: process.env.DEFILLAMA_BASE_URL || 'https://api.llama.fi',
                apiKey: null, // DeFiLlama doesn't require API key
                
                endpoints: {
                    stablecoins: '/stablecoins',
                    stablecoin: '/stablecoin/{id}',
                    chains: '/chains',
                    protocols: '/protocols'
                },
                
                rateLimit: {
                    requestsPerMinute: this._parseRateLimit(process.env.DEFILLAMA_RATE_LIMIT, 30),
                    requestsPerHour: null,
                    requestsPerDay: null,
                    burstLimit: 10
                },
                
                request: {
                    timeout: parseInt(process.env.DEFILLAMA_TIMEOUT_MS) || 15000,
                    retries: parseInt(process.env.DEFILLAMA_RETRIES) || 3,
                    retryDelay: parseInt(process.env.DEFILLAMA_RETRY_DELAY_MS) || 2000,
                    headers: {
                        'Accept': 'application/json'
                    }
                },
                
                capabilities: {
                    hasMarketData: false,
                    hasSupplyData: true,
                    hasPlatformData: true,
                    hasNetworkBreakdown: true,
                    hasMetadata: false,
                    priority: 4, // Lower priority, specialized data
                    dataTypes: ['supply', 'network_breakdown', 'chains']
                },
                
                processing: {
                    includeBridges: process.env.DEFILLAMA_INCLUDE_BRIDGES === 'true',
                    minMarketCap: parseInt(process.env.DEFILLAMA_MIN_MCAP) || 1000000,
                    stablecoinFilter: {
                        priceRange: {
                            min: parseFloat(process.env.DEFILLAMA_PRICE_MIN) || 0.50,
                            max: parseFloat(process.env.DEFILLAMA_PRICE_MAX) || 2.00
                        },
                        // Allow all peg types by default; optionally exclude specific ones
                        // e.g. to exclude BTC-pegged assets: DEFILLAMA_EXCLUDED_PEG_TYPES=peggedBTC
                        excludedPegTypes: (process.env.DEFILLAMA_EXCLUDED_PEG_TYPES || 'peggedBTC')
                            .split(',')
                            .map(s => s.trim())
                            .filter(Boolean),
                        minCirculatingSupply: parseInt(process.env.DEFILLAMA_MIN_SUPPLY) || 1000000,
                        excludePatterns: [
                            // Common non-stablecoin patterns
                            /wrapped/i, /liquid/i, /staked/i, /yield/i, /reward/i,
                            /^w[A-Z]+$/, // Wrapped tokens like wETH, wBTC
                            /pool/i, /vault/i, /interest/i, /synthetic/i
                        ],
                        excludeSymbols: (process.env.DEFILLAMA_EXCLUDE_SYMBOLS || '').split(',').filter(s => s.trim()),
                        requireStablecoinKeywords: true, // Require 'usd', 'dollar', or common stable patterns
                        maxExpectedCount: parseInt(process.env.DEFILLAMA_MAX_COINS) || 200 // Circuit breaker
                    }
                },

                mockData: {
                    enabled: process.env.DEFILLAMA_MOCK_DATA === 'true',
                    filePath: process.env.DEFILLAMA_MOCK_FILE || 'defillama_raw_output.json'
                }
            }
        };
    }

    /**
     * Parse rate limit from environment variable
     * @private
     * @param {string} envValue - Environment variable value
     * @param {number} defaultValue - Default value if not set
     * @returns {number} Parsed rate limit
     */
    _parseRateLimit(envValue, defaultValue) {
        if (!envValue) return defaultValue;
        const parsed = parseInt(envValue);
        return isNaN(parsed) ? defaultValue : parsed;
    }

    /**
     * Get configuration for a specific API
     * @param {string} sourceId - API source identifier
     * @returns {Object|null} API configuration or null if not found
     */
    getApiConfig(sourceId) {
        const config = this._apiConfigs[sourceId];
        return config ? JSON.parse(JSON.stringify(config)) : null;
    }

    /**
     * Get all API configurations
     * @returns {Object} All API configurations
     */
    getAllApiConfigs() {
        return JSON.parse(JSON.stringify(this._apiConfigs));
    }

    /**
     * Get list of enabled API sources
     * @returns {Array<string>} Array of enabled source IDs
     */
    getEnabledSources() {
        return Object.keys(this._apiConfigs).filter(sourceId => {
            const cfg = this._apiConfigs[sourceId];
            // Consider a source enabled if explicitly enabled or if mock mode is enabled
            return !!(cfg.enabled || (cfg.mockData && cfg.mockData.enabled));
        });
    }

    /**
     * Get list of configured but disabled sources
     * @returns {Array<string>} Array of disabled source IDs
     */
    getDisabledSources() {
        return Object.keys(this._apiConfigs).filter(sourceId => 
            !this._apiConfigs[sourceId].enabled
        );
    }

    /**
     * Check if a source is enabled and properly configured
     * @param {string} sourceId - API source identifier
     * @returns {boolean} Whether source is ready to use
     */
    isSourceReady(sourceId) {
        const config = this._apiConfigs[sourceId];
        if (!config) return false;

        // If mock mode is enabled for this source, consider it ready even without API keys
        if (config.mockData && config.mockData.enabled) return true;

        if (!config.enabled) return false;

        // Check if API key is required and present
        if (sourceId === 'cmc' || sourceId === 'messari') {
            return !!config.apiKey;
        }

        return true;
    }

    /**
     * Get sources sorted by priority (highest first)
     * @returns {Array<Object>} Sources with their priorities
     */
    getSourcesByPriority() {
        return Object.entries(this._apiConfigs)
            .filter(([_, config]) => config.enabled)
            .map(([sourceId, config]) => ({
                sourceId,
                name: config.name,
                priority: config.capabilities.priority,
                capabilities: config.capabilities
            }))
            .sort((a, b) => b.priority - a.priority);
    }

    /**
     * Get sources that provide specific capability
     * @param {string} capability - Capability to search for
     * @returns {Array<string>} Source IDs that provide this capability
     */
    getSourcesWithCapability(capability) {
        return Object.entries(this._apiConfigs)
            .filter(([_, config]) => config.enabled && config.capabilities[capability])
            .map(([sourceId, _]) => sourceId);
    }

    /**
     * Get best source for specific data type
     * @param {string} dataType - Type of data needed
     * @returns {string|null} Best source ID for this data type
     */
    getBestSourceForDataType(dataType) {
        const sources = Object.entries(this._apiConfigs)
            .filter(([_, config]) => 
                config.enabled && 
                config.capabilities.dataTypes.includes(dataType)
            )
            .sort((a, b) => b[1].capabilities.priority - a[1].capabilities.priority);
            
        return sources.length > 0 ? sources[0][0] : null;
    }

    /**
     * Validate API configuration
     * @returns {Object} Validation results
     */
    validate() {
        const results = {
            valid: true,
            enabledSources: 0,
            warnings: [],
            errors: []
        };

        for (const [sourceId, config] of Object.entries(this._apiConfigs)) {
            const usingMock = !!(config.mockData && config.mockData.enabled);
            if (config.enabled || usingMock) {
                results.enabledSources++;
                
                // Validate required API keys
                if (!usingMock && (sourceId === 'cmc' || sourceId === 'messari') && !config.apiKey) {
                    results.errors.push(`${config.name} is enabled but missing API key`);
                    results.valid = false;
                }
                
                // Validate URLs
                if (!usingMock) {
                    try {
                        new URL(config.baseUrl);
                    } catch (error) {
                        results.errors.push(`${config.name} has invalid base URL: ${config.baseUrl}`);
                        results.valid = false;
                    }
                }
                
                // Check rate limits
                if (config.rateLimit.requestsPerMinute < 1) {
                    results.warnings.push(`${config.name} has very low rate limit`);
                }
            }
        }

        if (results.enabledSources === 0) {
            results.errors.push('No data sources are enabled');
            results.valid = false;
        }

        return results;
    }

    /**
     * Add or update API configuration (for dynamic configuration)
     * @param {string} sourceId - Source identifier
     * @param {Object} config - API configuration
     */
    addApiConfig(sourceId, config) {
        // Validate required fields
        const required = ['name', 'baseUrl', 'endpoints', 'capabilities'];
        for (const field of required) {
            if (!config[field]) {
                throw new Error(`Missing required field '${field}' for source '${sourceId}'`);
            }
        }

        this._apiConfigs[sourceId] = {
            enabled: false,
            rateLimit: { requestsPerMinute: 10, burstLimit: 5 },
            request: { timeout: 15000, retries: 3 },
            ...config
        };
    }

    /**
     * Remove API configuration
     * @param {string} sourceId - Source identifier to remove
     */
    removeApiConfig(sourceId) {
        if (this._apiConfigs[sourceId]) {
            delete this._apiConfigs[sourceId];
        }
    }
}

// Export singleton instance
module.exports = new ApiConfig();
