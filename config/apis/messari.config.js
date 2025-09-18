/**
 * Messari API Configuration
 * Extends ApiConfigBase with Messari-specific settings and defaults
 */
const ApiConfigBase = require('./base/ApiConfigBase');
const SafeUtils = require('../../utils/SafeUtils');

class MessariApiConfig extends ApiConfigBase {
    constructor(configOverrides = {}) {
        super('messari', configOverrides);
    }

    /**
     * Get Messari-specific default configuration
     * @protected
     * @returns {Object} Default configuration for Messari
     */
    _getDefaultConfiguration() {
        return {
            name: 'Messari',
            enabled: false, // Will be set by environment logic
            baseUrl: 'https://data.messari.io/api',
            apiKey: null,
            
            endpoints: {
                stablecoins: '/v2/assets',
                stablecoinMetrics: '/v2/assets',
                asset: '/v1/assets/{id}',
                metrics: '/v1/assets/{id}/metrics'
            },
            
            rateLimit: {
                requestsPerMinute: 16, // Safe rate: 16 * 60 = 960 < 1000
                requestsPerHour: 1000, // Free plan default
                requestsPerDay: null,
                burstLimit: 5
            },
            
            request: {
                timeout: 20000,
                retries: 3,
                retryDelay: 3000,
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
                useStablecoinEndpoint: true, // Use dedicated stablecoin endpoint
                includeInactive: false, // Don't include inactive assets by default
                includeTokenizedAssets: false, // Will be overridden by environment
                batchSize: 100
            },

            mockData: {
                enabled: false, // Will be overridden by environment
                filePath: 'messari_raw_output.json'
            }
        };
    }

    /**
     * Get environment-based configuration overrides specific to Messari
     * @protected
     * @returns {Object} Environment configuration overrides
     */
    _getEnvironmentConfiguration() {
        const baseEnvConfig = super._getEnvironmentConfiguration();
        
        // Messari-specific environment overrides
        const messariEnvConfig = {
            processing: {
                ...baseEnvConfig.processing,
                useStablecoinEndpoint: process.env.MESSARI_USE_STABLECOIN_ENDPOINT !== 'false',
                includeInactive: process.env.MESSARI_INCLUDE_INACTIVE === 'true'
            }
        };
        
        return this._deepMerge(baseEnvConfig, messariEnvConfig);
    }

    /**
     * Messari requires an API key
     * @protected
     * @returns {boolean} True - Messari requires API key
     */
    _requiresApiKey() {
        return true;
    }

    /**
     * Get the API key header name for Messari
     * @protected
     * @returns {string} Header name for Messari API key
     */
    _getApiKeyHeaderName() {
        return 'x-messari-api-key';
    }

    /**
     * Get Messari-specific request parameters for stablecoin assets
     * @param {Object} options - Request options
     * @returns {Object} Messari-specific request parameters
     */
    getAssetsParams(options = {}) {
        const config = this.getConfig();
        const { 
            limit = 500, 
            sort = 'market_cap_rank',
            fields = 'id,slug,symbol,name,metrics/market_data,metrics/supply,metrics/blockchain_stats_24_hours,profile'
        } = options;
        
        const params = {
            limit: Math.min(limit, 1000), // Messari max is 1000
            sort,
            order: 'asc',
            fields
        };

        // Add stablecoin filtering if using stablecoin endpoint
        if (config.processing.useStablecoinEndpoint) {
            params.with_metrics = true;
            params.with_profiles = true;
        }

        // Include inactive assets if configured
        if (config.processing.includeInactive) {
            params.include_inactive = true;
        }

        return params;
    }

    /**
     * Get Messari-specific request parameters for asset metrics
     * @param {string} assetId - Asset ID or slug
     * @param {Array<string>} metrics - Array of metric names
     * @returns {Object} Messari-specific metrics request parameters
     */
    getMetricsParams(assetId, metrics = []) {
        const defaultMetrics = [
            'market_data',
            'marketcap',
            'supply',
            'blockchain_stats_24_hours',
            'all_time_high',
            'cycle_low',
            'token_sale_stats',
            'staking_stats',
            'mining_stats',
            'developer_activity',
            'roi_data',
            'roi_by_year',
            'risk_metrics',
            'misc_data'
        ];

        return {
            metrics: metrics.length > 0 ? metrics : defaultMetrics,
            fields: 'id,slug,symbol,name,metrics'
        };
    }

    /**
     * Validate Messari-specific configuration
     * @returns {Object} Validation result
     */
    validateMessariConfig() {
        const baseValidation = this._performBasicValidation();
        const messariErrors = [];
        
        const config = this.getConfig();
        
        // Validate Messari-specific settings
        if (config.rateLimit.requestsPerHour && config.rateLimit.requestsPerMinute) {
            const hourlyFromMinutes = config.rateLimit.requestsPerMinute * 60;
            if (hourlyFromMinutes > config.rateLimit.requestsPerHour) {
                messariErrors.push('Rate limit conflict: requests per minute * 60 exceeds hourly limit');
            }
        }
        
        // Validate batch size for Messari
        if (config.processing.batchSize > 1000) {
            messariErrors.push('Batch size cannot exceed 1000 for Messari API');
        }
        
        // Validate timeout is sufficient for Messari
        if (config.request.timeout < 10000) {
            messariErrors.push('Timeout should be at least 10 seconds for Messari API');
        }
        
        return {
            isValid: baseValidation.length === 0 && messariErrors.length === 0,
            errors: [...baseValidation, ...messariErrors],
            config
        };
    }

    /**
     * Get Messari plan information based on rate limits
     * @returns {Object} Messari plan information
     */
    getPlanInfo() {
        const config = this.getConfig();
        const hourlyLimit = config.rateLimit.requestsPerHour;
        const minuteLimit = config.rateLimit.requestsPerMinute;
        
        let plan = 'Unknown';
        if (hourlyLimit <= 1000 && minuteLimit <= 20) plan = 'Free';
        else if (hourlyLimit <= 10000) plan = 'Professional';
        else if (hourlyLimit <= 50000) plan = 'Business';
        else plan = 'Enterprise';
        
        return {
            plan,
            hourlyLimit,
            requestsPerMinute: minuteLimit,
            monthlyLimit: hourlyLimit * 24 * 30
        };
    }

    /**
     * Build asset endpoint URL with ID substitution
     * @param {string} endpointName - Name of the endpoint
     * @param {string} assetId - Asset ID to substitute
     * @returns {string} Complete endpoint URL
     */
    buildAssetEndpointUrl(endpointName, assetId) {
        const config = this.getConfig();
        const endpoint = config.endpoints[endpointName];
        
        if (!endpoint) {
            throw new Error(`Unknown endpoint: ${endpointName}`);
        }
        
        if (endpoint.includes('{id}')) {
            return endpoint.replace('{id}', encodeURIComponent(assetId));
        }
        
        return endpoint;
    }

    /**
     * Get supported Messari asset fields for filtering
     * @returns {Object} Available fields for different endpoint types
     */
    getSupportedFields() {
        return {
            assets: [
                'id', 'slug', 'symbol', 'name', 'contract_addresses',
                'metrics/market_data', 'metrics/marketcap', 'metrics/supply',
                'metrics/blockchain_stats_24_hours', 'metrics/all_time_high',
                'metrics/cycle_low', 'metrics/token_sale_stats',
                'metrics/staking_stats', 'metrics/mining_stats',
                'metrics/developer_activity', 'metrics/roi_data',
                'metrics/roi_by_year', 'metrics/risk_metrics',
                'metrics/misc_data', 'profile', 'profile/general',
                'profile/contributors', 'profile/advisors',
                'profile/investments', 'profile/ecosystem',
                'profile/economics', 'profile/technology',
                'profile/governance'
            ],
            metrics: [
                'market_data', 'marketcap', 'supply', 'blockchain_stats_24_hours',
                'all_time_high', 'cycle_low', 'token_sale_stats',
                'staking_stats', 'mining_stats', 'developer_activity',
                'roi_data', 'roi_by_year', 'risk_metrics', 'misc_data'
            ]
        };
    }
}

module.exports = MessariApiConfig;