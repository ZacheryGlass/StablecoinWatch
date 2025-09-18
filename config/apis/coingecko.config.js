/**
 * CoinGecko API Configuration
 * Extends ApiConfigBase with CoinGecko-specific settings and defaults
 */
const ApiConfigBase = require('./base/ApiConfigBase');
const SafeUtils = require('../../utils/SafeUtils');

class CoinGeckoApiConfig extends ApiConfigBase {
    constructor(configOverrides = {}) {
        super('coingecko', configOverrides);
    }

    /**
     * Get CoinGecko-specific default configuration
     * @protected
     * @returns {Object} Default configuration for CoinGecko
     */
    _getDefaultConfiguration() {
        return {
            name: 'CoinGecko',
            enabled: true, // CoinGecko can operate without API key (free tier)
            baseUrl: 'https://api.coingecko.com/api/v3',
            apiKey: null, // Optional for free tier
            
            endpoints: {
                coins: '/coins/markets',
                coin: '/coins/{id}',
                search: '/search',
                categories: '/coins/categories'
            },
            
            rateLimit: {
                requestsPerMinute: 10, // Free tier default, will be adjusted based on API key
                requestsPerHour: null,
                requestsPerDay: null,
                burstLimit: 5 // Conservative for free tier
            },
            
            request: {
                timeout: 10000,
                retries: 2,
                retryDelay: 1000,
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
                priceChangePercentage: '24h',
                includeTokenizedAssets: false, // Will be overridden by environment
                perPage: 250, // CoinGecko pagination
                maxPages: 4 // Limit total results
            },

            mockData: {
                enabled: false, // Will be overridden by environment
                filePath: 'coingecko_raw_output.json'
            }
        };
    }

    /**
     * Get environment-based configuration overrides specific to CoinGecko
     * @protected
     * @returns {Object} Environment configuration overrides
     */
    _getEnvironmentConfiguration() {
        const baseEnvConfig = super._getEnvironmentConfiguration();
        
        // Adjust rate limits based on API key presence
        const hasApiKey = !!process.env.COINGECKO_API_KEY;
        const rateLimitOverrides = hasApiKey ? {
            rateLimit: {
                requestsPerMinute: 500, // Pro tier
                burstLimit: 20
            }
        } : {
            rateLimit: {
                requestsPerMinute: 10, // Free tier
                burstLimit: 5
            }
        };
        
        // CoinGecko-specific environment overrides
        const coinGeckoEnvConfig = {
            ...rateLimitOverrides,
            processing: {
                ...baseEnvConfig.processing,
                currency: process.env.COINGECKO_CURRENCY || 'usd',
                category: process.env.COINGECKO_CATEGORY || 'stablecoins',
                includeSparkline: process.env.COINGECKO_INCLUDE_SPARKLINE === 'true',
                priceChangePercentage: process.env.COINGECKO_PRICE_CHANGE_PERIOD || '24h',
                perPage: SafeUtils.safeParseInt(process.env.COINGECKO_PER_PAGE, 250),
                maxPages: SafeUtils.safeParseInt(process.env.COINGECKO_MAX_PAGES, 4)
            }
        };
        
        return this._deepMerge(baseEnvConfig, coinGeckoEnvConfig);
    }

    /**
     * CoinGecko does not require an API key (has free tier)
     * @protected
     * @returns {boolean} False - CoinGecko has free tier
     */
    _requiresApiKey() {
        return false;
    }

    /**
     * Get the API key header name for CoinGecko Pro
     * @protected
     * @returns {string|null} Header name for CoinGecko API key
     */
    _getApiKeyHeaderName() {
        return 'x-cg-pro-api-key';
    }

    /**
     * Override isReady to handle free tier
     * @returns {boolean} Whether the source is ready
     */
    isReady() {
        // If mock mode is enabled, consider it ready
        if (this.isMockMode()) return true;
        
        // CoinGecko is ready if enabled, even without API key (free tier)
        return this.isEnabled();
    }

    /**
     * Get CoinGecko-specific request parameters for coin markets
     * @param {Object} options - Request options
     * @returns {Object} CoinGecko-specific request parameters
     */
    getMarketsParams(options = {}) {
        const config = this.getConfig();
        const { 
            category = config.processing.category,
            currency = config.processing.currency,
            order = 'market_cap_desc',
            per_page = config.processing.perPage,
            page = 1,
            sparkline = config.processing.includeSparkline,
            price_change_percentage = config.processing.priceChangePercentage
        } = options;
        
        return {
            vs_currency: currency,
            category,
            order,
            per_page: Math.min(per_page, 250), // CoinGecko max is 250
            page,
            sparkline,
            price_change_percentage,
            locale: 'en'
        };
    }

    /**
     * Get CoinGecko-specific request parameters for individual coin data
     * @param {string} coinId - CoinGecko coin ID
     * @param {Object} options - Request options
     * @returns {Object} CoinGecko-specific coin request parameters
     */
    getCoinParams(coinId, options = {}) {
        const { 
            localization = false,
            tickers = false,
            market_data = true,
            community_data = false,
            developer_data = false,
            sparkline = false
        } = options;
        
        return {
            localization,
            tickers,
            market_data,
            community_data,
            developer_data,
            sparkline
        };
    }

    /**
     * Validate CoinGecko-specific configuration
     * @returns {Object} Validation result
     */
    validateCoinGeckoConfig() {
        const baseValidation = this._performBasicValidation();
        const coinGeckoErrors = [];
        
        const config = this.getConfig();
        
        // Validate CoinGecko-specific settings
        if (config.processing.perPage > 250) {
            coinGeckoErrors.push('Per page limit cannot exceed 250 for CoinGecko API');
        }
        
        if (config.processing.maxPages > 10) {
            coinGeckoErrors.push('Consider limiting max pages to avoid excessive API calls');
        }
        
        // Validate supported currencies
        const supportedCurrencies = ['usd', 'eur', 'gbp', 'btc', 'eth'];
        if (!supportedCurrencies.includes(config.processing.currency.toLowerCase())) {
            coinGeckoErrors.push(`Currency '${config.processing.currency}' may not be supported by CoinGecko`);
        }
        
        // Check rate limits are appropriate for tier
        const hasApiKey = !!config.apiKey;
        const minuteLimit = config.rateLimit.requestsPerMinute;
        
        if (hasApiKey && minuteLimit < 100) {
            coinGeckoErrors.push('Rate limit seems low for Pro tier (consider increasing)');
        } else if (!hasApiKey && minuteLimit > 50) {
            coinGeckoErrors.push('Rate limit too high for free tier (may cause 429 errors)');
        }
        
        return {
            isValid: baseValidation.length === 0 && coinGeckoErrors.length === 0,
            errors: [...baseValidation, ...coinGeckoErrors],
            config
        };
    }

    /**
     * Get CoinGecko plan information
     * @returns {Object} CoinGecko plan information
     */
    getPlanInfo() {
        const config = this.getConfig();
        const hasApiKey = !!config.apiKey;
        const minuteLimit = config.rateLimit.requestsPerMinute;
        
        let plan = hasApiKey ? 'Pro' : 'Free';
        
        // Refine plan detection based on rate limits
        if (hasApiKey) {
            if (minuteLimit >= 500) plan = 'Pro';
            else if (minuteLimit >= 100) plan = 'Pro (Limited)';
        }
        
        return {
            plan,
            tier: hasApiKey ? 'paid' : 'free',
            requestsPerMinute: minuteLimit,
            dailyLimit: hasApiKey ? 'Unlimited' : 'Rate limited',
            hasApiKey
        };
    }

    /**
     * Get supported CoinGecko categories
     * @returns {Array<string>} Available categories
     */
    getSupportedCategories() {
        return [
            'stablecoins',
            'defi',
            'nft',
            'exchange-based-tokens',
            'centralized-exchange-token',
            'decentralized-exchange',
            'yield-farming',
            'lending-protocol',
            'privacy-coins',
            'smart-contract-platform',
            'layer-1',
            'layer-2',
            'wrapped-tokens',
            'synthetic-assets',
            'asset-backed-tokens',
            'real-world-assets'
        ];
    }

    /**
     * Get supported price change percentage timeframes
     * @returns {Array<string>} Available timeframes
     */
    getSupportedTimeframes() {
        return ['1h', '24h', '7d', '14d', '30d', '200d', '1y'];
    }

    /**
     * Build coin endpoint URL with ID substitution
     * @param {string} endpointName - Name of the endpoint
     * @param {string} coinId - Coin ID to substitute
     * @returns {string} Complete endpoint URL
     */
    buildCoinEndpointUrl(endpointName, coinId) {
        const config = this.getConfig();
        const endpoint = config.endpoints[endpointName];
        
        if (!endpoint) {
            throw new Error(`Unknown endpoint: ${endpointName}`);
        }
        
        if (endpoint.includes('{id}')) {
            return endpoint.replace('{id}', encodeURIComponent(coinId));
        }
        
        return endpoint;
    }
}

module.exports = CoinGeckoApiConfig;