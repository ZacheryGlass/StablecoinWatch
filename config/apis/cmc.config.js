/**
 * CoinMarketCap API Configuration
 * Extends ApiConfigBase with CMC-specific settings and defaults
 */
const ApiConfigBase = require('./base/ApiConfigBase');
const SafeUtils = require('../../utils/SafeUtils');

class CmcApiConfig extends ApiConfigBase {
    constructor(configOverrides = {}) {
        super('cmc', configOverrides);
    }

    /**
     * Get CMC-specific default configuration
     * @protected
     * @returns {Object} Default configuration for CMC
     */
    _getDefaultConfiguration() {
        return {
            name: 'CoinMarketCap',
            enabled: false, // Will be set by environment logic
            baseUrl: 'https://pro-api.coinmarketcap.com',
            apiKey: null,
            
            endpoints: {
                listings: '/v1/cryptocurrency/listings/latest',
                quotes: '/v1/cryptocurrency/quotes/latest',
                metadata: '/v1/cryptocurrency/info',
                global: '/v1/global-metrics/quotes/latest'
            },
            
            rateLimit: {
                requestsPerMinute: 333, // Basic plan default
                requestsPerHour: null,
                requestsPerDay: 10000, // Basic plan default
                burstLimit: 10
            },
            
            request: {
                timeout: 15000,
                retries: 3,
                retryDelay: 2000,
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
                        min: 0.50,
                        max: 2.00
                    }
                },
                includeTokenizedAssets: false, // Will be overridden by environment
                batchSize: 5000,
                maxResults: 5000
            },

            mockData: {
                enabled: false, // Will be overridden by environment
                filePath: 'cmc_raw_output.json'
            }
        };
    }

    /**
     * Get environment-based configuration overrides specific to CMC
     * @protected
     * @returns {Object} Environment configuration overrides
     */
    _getEnvironmentConfiguration() {
        const baseEnvConfig = super._getEnvironmentConfiguration();
        
        // CMC-specific environment overrides
        const cmcEnvConfig = {
            processing: {
                ...baseEnvConfig.processing,
                stablecoinFilter: {
                    priceRange: {
                        min: SafeUtils.safeParseFloat(process.env.CMC_PRICE_MIN, 0.50),
                        max: SafeUtils.safeParseFloat(process.env.CMC_PRICE_MAX, 2.00)
                    }
                }
            }
        };
        
        return this._deepMerge(baseEnvConfig, cmcEnvConfig);
    }

    /**
     * CMC requires an API key
     * @protected
     * @returns {boolean} True - CMC requires API key
     */
    _requiresApiKey() {
        return true;
    }

    /**
     * Get the API key header name for CMC
     * @protected
     * @returns {string} Header name for CMC API key
     */
    _getApiKeyHeaderName() {
        return 'X-CMC_PRO_API_KEY';
    }

    /**
     * Get CMC-specific request parameters for stablecoin listings
     * @param {Object} options - Request options
     * @returns {Object} CMC-specific request parameters
     */
    getListingsParams(options = {}) {
        const config = this.getConfig();
        const { limit = 5000, sort = 'market_cap', tag = 'stablecoin' } = options;
        
        return {
            start: 1,
            limit: Math.min(limit, config.processing.maxResults),
            sort,
            sort_dir: 'desc',
            cryptocurrency_type: 'all',
            tag,
            aux: 'num_market_pairs,cmc_rank,date_added,tags,platform,max_supply,circulating_supply,total_supply'
        };
    }

    /**
     * Get CMC-specific request parameters for quotes
     * @param {Array<string>} symbols - Array of cryptocurrency symbols
     * @returns {Object} CMC-specific quote request parameters
     */
    getQuotesParams(symbols) {
        return {
            symbol: symbols.join(','),
            aux: 'num_market_pairs,cmc_rank,date_added,tags,platform,max_supply,circulating_supply,total_supply'
        };
    }

    /**
     * Validate CMC-specific configuration
     * @returns {Object} Validation result
     */
    validateCmcConfig() {
        const baseValidation = this._performBasicValidation();
        const cmcErrors = [];
        
        const config = this.getConfig();
        
        // Validate CMC-specific settings
        if (config.processing?.stablecoinFilter?.priceRange) {
            const { min, max } = config.processing.stablecoinFilter.priceRange;
            if (min >= max) {
                cmcErrors.push('stablecoinFilter price range: min must be less than max');
            }
            if (min < 0 || max < 0) {
                cmcErrors.push('stablecoinFilter price range: values must be positive');
            }
        }
        
        // Validate rate limits for CMC tiers
        if (config.rateLimit.requestsPerDay) {
            const dailyLimit = config.rateLimit.requestsPerDay;
            if (dailyLimit < 333) {
                cmcErrors.push('Daily rate limit seems too low for CMC (minimum 333 for Basic plan)');
            }
        }
        
        return {
            isValid: baseValidation.length === 0 && cmcErrors.length === 0,
            errors: [...baseValidation, ...cmcErrors],
            config
        };
    }

    /**
     * Get CMC plan information based on rate limits
     * @returns {Object} CMC plan information
     */
    getPlanInfo() {
        const config = this.getConfig();
        const dailyLimit = config.rateLimit.requestsPerDay;
        const monthlyLimit = dailyLimit * 30;
        
        let plan = 'Unknown';
        if (dailyLimit <= 333) plan = 'Basic';
        else if (dailyLimit <= 1000) plan = 'Hobbyist';
        else if (dailyLimit <= 3333) plan = 'Startup';
        else if (dailyLimit <= 10000) plan = 'Standard';
        else if (dailyLimit <= 33333) plan = 'Professional';
        else plan = 'Enterprise';
        
        return {
            plan,
            dailyLimit,
            monthlyLimit: monthlyLimit,
            requestsPerMinute: config.rateLimit.requestsPerMinute
        };
    }
}

module.exports = CmcApiConfig;