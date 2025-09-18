/**
 * DeFiLlama API Configuration
 * Extends ApiConfigBase with DeFiLlama-specific settings and defaults
 */
const ApiConfigBase = require('./base/ApiConfigBase');
const SafeUtils = require('../../utils/SafeUtils');

class DeFiLlamaApiConfig extends ApiConfigBase {
    constructor(configOverrides = {}) {
        super('defillama', configOverrides);
    }

    /**
     * Get DeFiLlama-specific default configuration
     * @protected
     * @returns {Object} Default configuration for DeFiLlama
     */
    _getDefaultConfiguration() {
        return {
            name: 'DeFiLlama',
            enabled: true, // No API key required, controlled by ENABLED_SOURCES
            baseUrl: 'https://api.llama.fi',
            apiKey: null, // DeFiLlama doesn't require API key
            
            endpoints: {
                stablecoins: '/stablecoins',
                stablecoin: '/stablecoin/{id}',
                chains: '/chains',
                protocols: '/protocols'
            },
            
            rateLimit: {
                requestsPerMinute: 30,
                requestsPerHour: null,
                requestsPerDay: null,
                burstLimit: 10
            },
            
            request: {
                timeout: 15000,
                retries: 3,
                retryDelay: 2000,
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
                includeBridges: false,
                minMarketCap: 1000000, // Minimum market cap filter
                includeTokenizedAssets: false, // Will be overridden by environment
                stablecoinFilter: {
                    priceRange: {
                        min: 0.50,
                        max: 2.00
                    },
                    // Allow all peg types by default; optionally exclude specific ones
                    // e.g. to exclude BTC-pegged assets: DEFILLAMA_EXCLUDED_PEG_TYPES=peggedBTC
                    excludedPegTypes: ['peggedBTC'],
                    minCirculatingSupply: 1000000,
                    excludePatterns: [
                        // Common non-stablecoin patterns
                        /wrapped/i, /liquid/i, /staked/i, /yield/i, /reward/i,
                        /^w[A-Z]+$/, // Wrapped tokens like wETH, wBTC
                        /pool/i, /vault/i, /interest/i, /synthetic/i
                    ],
                    excludeSymbols: [],
                    requireStablecoinKeywords: true, // Require 'usd', 'dollar', or common stable patterns
                    maxExpectedCount: 200 // Circuit breaker
                }
            },

            mockData: {
                enabled: false, // Will be overridden by environment
                filePath: 'defillama_raw_output.json'
            }
        };
    }

    /**
     * Get environment-based configuration overrides specific to DeFiLlama
     * @protected
     * @returns {Object} Environment configuration overrides
     */
    _getEnvironmentConfiguration() {
        const baseEnvConfig = super._getEnvironmentConfiguration();
        
        // Parse excluded peg types from environment
        const excludedPegTypes = (process.env.DEFILLAMA_EXCLUDED_PEG_TYPES || 'peggedBTC')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
            
        // Parse excluded symbols from environment
        const excludeSymbols = (process.env.DEFILLAMA_EXCLUDE_SYMBOLS || '')
            .split(',')
            .filter(s => s.trim());
        
        // DeFiLlama-specific environment overrides
        const defiLlamaEnvConfig = {
            processing: {
                ...baseEnvConfig.processing,
                includeBridges: process.env.DEFILLAMA_INCLUDE_BRIDGES === 'true',
                minMarketCap: SafeUtils.safeParseInt(process.env.DEFILLAMA_MIN_MCAP, 1000000),
                stablecoinFilter: {
                    priceRange: {
                        min: SafeUtils.safeParseFloat(process.env.DEFILLAMA_PRICE_MIN, 0.50),
                        max: SafeUtils.safeParseFloat(process.env.DEFILLAMA_PRICE_MAX, 2.00)
                    },
                    excludedPegTypes,
                    minCirculatingSupply: SafeUtils.safeParseInt(process.env.DEFILLAMA_MIN_SUPPLY, 1000000),
                    excludeSymbols,
                    requireStablecoinKeywords: process.env.DEFILLAMA_REQUIRE_STABLE_KEYWORDS !== 'false',
                    maxExpectedCount: SafeUtils.safeParseInt(process.env.DEFILLAMA_MAX_COINS, 200)
                }
            }
        };
        
        return this._deepMerge(baseEnvConfig, defiLlamaEnvConfig);
    }

    /**
     * DeFiLlama does not require an API key
     * @protected
     * @returns {boolean} False - DeFiLlama is free
     */
    _requiresApiKey() {
        return false;
    }

    /**
     * DeFiLlama doesn't use API key headers
     * @protected
     * @returns {null} No API key header needed
     */
    _getApiKeyHeaderName() {
        return null;
    }

    /**
     * Override isReady since DeFiLlama doesn't require API key
     * @returns {boolean} Whether the source is ready
     */
    isReady() {
        // If mock mode is enabled, consider it ready
        if (this.isMockMode()) return true;
        
        // DeFiLlama is ready if enabled (no API key required)
        return this.isEnabled();
    }

    /**
     * Get DeFiLlama-specific request parameters for stablecoins
     * @param {Object} options - Request options
     * @returns {Object} DeFiLlama-specific request parameters
     */
    getStablecoinsParams(options = {}) {
        const config = this.getConfig();
        const { 
            includeBridges = config.processing.includeBridges
        } = options;
        
        const params = {};
        
        if (!includeBridges) {
            params.includeBridges = false;
        }
        
        return params;
    }

    /**
     * Get DeFiLlama-specific request parameters for individual stablecoin
     * @param {string} stablecoinId - DeFiLlama stablecoin ID
     * @returns {Object} DeFiLlama-specific stablecoin request parameters
     */
    getStablecoinParams(stablecoinId) {
        return {
            // DeFiLlama stablecoin endpoint doesn't require additional parameters
        };
    }

    /**
     * Filter stablecoins based on DeFiLlama-specific criteria
     * @param {Array} stablecoins - Array of stablecoin data
     * @returns {Array} Filtered stablecoins
     */
    filterStablecoins(stablecoins) {
        const config = this.getConfig();
        const filter = config.processing.stablecoinFilter;
        
        if (!Array.isArray(stablecoins)) return [];
        
        return stablecoins.filter(coin => {
            // Skip if no basic data
            if (!coin || !coin.symbol || !coin.name) return false;
            
            // Price range filter
            if (coin.price !== undefined && coin.price !== null) {
                if (coin.price < filter.priceRange.min || coin.price > filter.priceRange.max) {
                    return false;
                }
            }
            
            // Market cap filter
            if (coin.mcap !== undefined && coin.mcap < config.processing.minMarketCap) {
                return false;
            }
            
            // Circulating supply filter
            if (coin.circulating !== undefined && coin.circulating < filter.minCirculatingSupply) {
                return false;
            }
            
            // Excluded peg types
            if (coin.pegType && filter.excludedPegTypes.includes(coin.pegType)) {
                return false;
            }
            
            // Excluded symbols
            if (filter.excludeSymbols.includes(coin.symbol?.toUpperCase())) {
                return false;
            }
            
            // Pattern exclusions
            const nameAndSymbol = `${coin.name} ${coin.symbol}`.toLowerCase();
            if (filter.excludePatterns.some(pattern => pattern.test(nameAndSymbol))) {
                return false;
            }
            
            // Require stablecoin keywords if configured
            if (filter.requireStablecoinKeywords) {
                const stableKeywords = /usd|dollar|stable|eur|euro|gbp|pound|jpy|yen|cny|yuan/i;
                if (!stableKeywords.test(nameAndSymbol)) {
                    return false;
                }
            }
            
            return true;
        }).slice(0, filter.maxExpectedCount); // Circuit breaker
    }

    /**
     * Validate DeFiLlama-specific configuration
     * @returns {Object} Validation result
     */
    validateDeFiLlamaConfig() {
        const baseValidation = this._performBasicValidation();
        const defiLlamaErrors = [];
        
        const config = this.getConfig();
        
        // Validate DeFiLlama-specific settings
        const filter = config.processing.stablecoinFilter;
        
        if (filter.priceRange.min >= filter.priceRange.max) {
            defiLlamaErrors.push('Price range: min must be less than max');
        }
        
        if (filter.minCirculatingSupply < 0) {
            defiLlamaErrors.push('Minimum circulating supply must be non-negative');
        }
        
        if (filter.maxExpectedCount > 1000) {
            defiLlamaErrors.push('Max expected count too high (may cause performance issues)');
        }
        
        // Validate exclude patterns are valid regexes
        if (filter.excludePatterns) {
            filter.excludePatterns.forEach((pattern, idx) => {
                if (!(pattern instanceof RegExp)) {
                    defiLlamaErrors.push(`Exclude pattern ${idx} is not a valid RegExp`);
                }
            });
        }
        
        return {
            isValid: baseValidation.length === 0 && defiLlamaErrors.length === 0,
            errors: [...baseValidation, ...defiLlamaErrors],
            config
        };
    }

    /**
     * Get DeFiLlama plan information
     * @returns {Object} DeFiLlama plan information
     */
    getPlanInfo() {
        return {
            plan: 'Free',
            tier: 'free',
            requestsPerMinute: this.getConfig().rateLimit.requestsPerMinute,
            dailyLimit: 'Unlimited',
            hasApiKey: false,
            features: ['Cross-chain data', 'Real-time updates', 'No authentication required']
        };
    }

    /**
     * Get supported DeFiLlama peg types
     * @returns {Array<string>} Available peg types
     */
    getSupportedPegTypes() {
        return [
            'peggedUSD',
            'peggedEUR', 
            'peggedGBP',
            'peggedJPY',
            'peggedCNY',
            'peggedCAD',
            'peggedAUD',
            'peggedSGD',
            'peggedKRW',
            'peggedCHF',
            'peggedBRL',
            'peggedBTC',
            'peggedETH',
            'peggedXAU', // Gold
            'peggedXAG', // Silver
            'peggedVAR'  // Variable/Algorithmic
        ];
    }

    /**
     * Get supported blockchain networks from DeFiLlama
     * @returns {Array<string>} Available blockchain networks
     */
    getSupportedChains() {
        return [
            'Ethereum', 'BSC', 'Polygon', 'Avalanche', 'Solana', 'Fantom',
            'Arbitrum', 'Optimism', 'Moonbeam', 'Cronos', 'Aurora', 'Harmony',
            'Celo', 'Moonriver', 'Fuse', 'OKTChain', 'Heco', 'Kava', 'Evmos',
            'Milkomeda', 'DFK', 'Klaytn', 'REI', 'Astar', 'Kardia', 'TomoChain',
            'Velas', 'Syscoin', 'Emerald', 'Theta', 'Rsk', 'IoTeX', 'Thundercore',
            'Wanchain', 'Metis', 'Boba', 'Kcc', 'Smartbch', 'Elastos', 'Hoo',
            'Cube', 'Callisto', 'CSC', 'EthereumPoW', 'Cardano', 'Stacks',
            'NEAR', 'Algorand', 'Tezos', 'Aptos', 'Sui', 'Flow', 'ICP',
            'Terra', 'Terra2', 'Osmosis', 'Juno', 'Secret', 'Kujira',
            'Cosmos', 'Crescent', 'Stride', 'Comdex', 'Umee', 'Agoric',
            'Persistence', 'Stargaze', 'Carbon', 'Injective', 'Oraichain',
            'Bitgert', 'Nova Network', 'Oasis', 'XDAI', 'Godwoken',
            'Loopring', 'zkSync Era', 'Polygon zkEVM'
        ];
    }

    /**
     * Build stablecoin endpoint URL with ID substitution
     * @param {string} endpointName - Name of the endpoint
     * @param {string} stablecoinId - Stablecoin ID to substitute
     * @returns {string} Complete endpoint URL
     */
    buildStablecoinEndpointUrl(endpointName, stablecoinId) {
        const config = this.getConfig();
        const endpoint = config.endpoints[endpointName];
        
        if (!endpoint) {
            throw new Error(`Unknown endpoint: ${endpointName}`);
        }
        
        if (endpoint.includes('{id}')) {
            return endpoint.replace('{id}', encodeURIComponent(stablecoinId));
        }
        
        return endpoint;
    }
}

module.exports = DeFiLlamaApiConfig;