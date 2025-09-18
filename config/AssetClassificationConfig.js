/**
 * Asset Classification Configuration
 * Provides shared taxonomy and classification rules for AssetClassifier
 * Extracted from ApiConfig for better separation of concerns
 */

class AssetClassificationConfig {
    constructor() {
        this.config = this._loadConfiguration();
    }

    /**
     * Load asset classification configuration
     * @private
     * @returns {Object} Asset classification configuration
     */
    _loadConfiguration() {
        return {
            enabled: process.env.ASSET_CLASSIFICATION_ENABLED !== 'false',
            taxonomy: {
                // Stablecoin identification tags
                stablecoinTags: [
                    'stablecoin',
                    ...this._parseCustomTags(process.env.CUSTOM_STABLECOIN_TAGS)
                ],
                
                // Tokenized asset identification tags
                tokenizedAssetTags: [
                    'tokenized-assets',
                    ...this._parseCustomTags(process.env.CUSTOM_TOKENIZED_TAGS)
                ],
                
                // Specific tokenized asset subtypes
                tokenizedSubtypes: {
                    'tokenized-gold': 'Gold',
                    'tokenized-silver': 'Silver',
                    'tokenized-etfs': 'ETF',
                    'tokenized-stock': 'Stocks',
                    'tokenized-real-estate': 'Real Estate',
                    'tokenized-treasury-bills': 'Treasury Bills',
                    'tokenized-commodities': 'Commodities'
                },
                
                // Asset-backed stablecoin tags
                assetBackedTags: ['asset-backed-stablecoin'],

                // Currency aliases and special mappings.
                // Keys are normalized uppercase tokens or codes found in tags like
                // 'peggedXAU' or 'xau-stablecoin' and values are the canonical
                // peggedAsset representation returned by the classifier.
                // Add new mappings here to support new pegged currencies without
                // modifying classifier code.
                currencyAliases: {
                    // Precious metals and commodities
                    'XAU': 'Gold',
                    'XAG': 'Silver',
                    'XAUT': 'Gold',
                    'PAXG': 'Gold',
                    'GOLD': 'Gold',
                    'SILVER': 'Silver',
                    
                    // Special drawing rights and composite currencies
                    'XDR': 'Special Drawing Rights',
                    'SDR': 'Special Drawing Rights',
                    
                    // Common alternative representations
                    'DOLLAR': 'USD',
                    'EURO': 'EUR',
                    'POUND': 'GBP',
                    'YEN': 'JPY',
                    'YUAN': 'CNY',
                    'RENMINBI': 'CNY',
                    'FRANC': 'CHF',
                    'RUPEE': 'INR',
                    'WON': 'KRW',
                    'REAL': 'BRL',
                    'PESO': 'MXN',
                    'RAND': 'ZAR',
                    'RUBLE': 'RUB',
                    'ROUBLE': 'RUB',
                    'LIRA': 'TRY',
                    
                    // Common stablecoin symbol variations
                    'USDT': 'USD',
                    'USDC': 'USD',
                    'BUSD': 'USD',
                    'USDP': 'USD',
                    'TUSD': 'USD',
                    'FDUSD': 'USD',
                    'PYUSD': 'USD',
                    'EURC': 'EUR',
                    'EURS': 'EUR',
                    'EURT': 'EUR',
                    'CEUR': 'EUR',
                    'STASIS': 'EUR',
                    'GBPT': 'GBP',
                    'QCAD': 'CAD',
                    'CADC': 'CAD',
                    'AUDX': 'AUD',
                    'NZDS': 'NZD',
                    'JPYC': 'JPY',
                    'CNHT': 'CNY',
                    'IDRT': 'IDR',
                    'BIDR': 'IDR',
                    'THBX': 'THB',
                    'BRLT': 'BRL',
                    'INRT': 'INR',
                    'KRWT': 'KRW',
                    'ZZAR': 'ZAR',
                    'XSGD': 'SGD'
                    // Note: By default, unrecognized 3-letter ISO codes will be returned as-is
                    // This provides extensibility for new currencies without requiring code changes
                },
                
                // Pattern matching rules for name/symbol heuristics
                patterns: {
                    goldSymbols: 'xau|paxg|xaut',
                    goldNames: 'gold',
                    silverSymbols: 'xag',
                    silverNames: 'silver',
                    etf: 'etf',
                    treasury: 'treasury',
                    stock: 'stock',
                    realEstate: 'real estate|real-estate|estate'
                }
            },

            // Pattern matching rules for different asset types (converted to strings for regex compilation)
            patterns: {
                fiatStablecoinPatterns: [
                    'usd|dollar',
                    'eur|euro',
                    'gbp|pound|sterling',
                    'jpy|yen',
                    'cny|yuan|renminbi',
                    'cad|canadian',
                    'aud|australian',
                    'chf|franc',
                    'krw|won',
                    'inr|rupee',
                    'sgd|singapore'
                ],
                
                cryptoStablecoinPatterns: [
                    'btc|bitcoin',
                    'eth|ethereum',
                    'matic|polygon',
                    'bnb|binance'
                ],
                
                commodityStablecoinPatterns: [
                    'gold|xau',
                    'silver|xag',
                    'oil|petroleum',
                    'commodity'
                ],
                
                tokenizedFiatPatterns: [
                    'tokenized.*(usd|eur|gbp|jpy|cad|aud)',
                    'digital.*(dollar|euro|pound|yen)',
                    'synthetic.*(usd|eur|gbp)'
                ],
                
                tokenizedCommodityPatterns: [
                    'tokenized.*(gold|silver|oil)',
                    'digital.*(gold|silver)',
                    'synthetic.*(gold|silver|commodity)',
                    'paxg|xaut|dgld|cache'
                ]
            },

            // Sources configuration for asset classification
            sources: {
                enabledSources: this._parseEnabledSources(),
                sourceSpecificRules: {
                    cmc: {
                        tagPriority: ['stablecoin', 'tokenized-assets'],
                        useTagsForClassification: true
                    },
                    messari: {
                        tagPriority: ['stablecoin', 'asset-backed-stablecoin'],
                        useMetadataForClassification: true
                    },
                    coingecko: {
                        categoryMapping: {
                            'stablecoins': 'stablecoin',
                            'tokenized-assets': 'tokenized-assets'
                        }
                    },
                    defillama: {
                        pegTypeMapping: {
                            'peggedUSD': 'USD',
                            'peggedEUR': 'EUR',
                            'peggedBTC': 'BTC',
                            'peggedETH': 'ETH'
                        }
                    }
                }
            }
        };
    }

    /**
     * Parse custom tags from environment variables
     * @private
     * @param {string} envValue - Comma-separated tag string
     * @returns {Array<string>} Array of tags
     */
    _parseCustomTags(envValue) {
        if (!envValue || typeof envValue !== 'string') return [];
        return envValue.split(',').map(tag => tag.trim().toLowerCase()).filter(Boolean);
    }

    /**
     * Parse enabled sources from environment
     * @private
     * @returns {Array<string>} Array of enabled source IDs
     */
    _parseEnabledSources() {
        const defaultSources = ['cmc', 'messari'];
        const envSources = process.env.ENABLED_SOURCES;
        
        if (!envSources) return defaultSources;
        
        return envSources.split(',').map(s => s.trim()).filter(s => s);
    }

    /**
     * Get the complete asset classification configuration
     * @returns {Object} Asset classification configuration
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Get tokenized assets configuration for a specific source
     * @param {string} sourceId - Source identifier ('cmc', 'messari', etc.)
     * @returns {Object} Tokenized assets configuration
     */
    getTokenizedAssetsConfig(sourceId) {
        if (!sourceId) {
            return { 
                enabled: false, 
                source: 'unknown',
                reason: 'No source ID provided'
            };
        }

        const enabled = process.env[this._getTokenizedAssetsEnvVar(sourceId)] === 'true';
        return {
            enabled,
            source: sourceId,
            environmentVariable: this._getTokenizedAssetsEnvVar(sourceId),
            reason: enabled ? 'Explicitly enabled via configuration' : 'Disabled by default (backward compatibility)'
        };
    }

    /**
     * Get the environment variable name for tokenized assets config
     * @private
     * @param {string} sourceId - Source identifier
     * @returns {string} Environment variable name
     */
    _getTokenizedAssetsEnvVar(sourceId) {
        const sourceUpper = sourceId.toUpperCase();
        return `${sourceUpper}_INCLUDE_TOKENIZED_ASSETS`;
    }

    /**
     * Get global tokenized assets configuration summary
     * @returns {Object} Summary of tokenized assets configuration across all sources
     */
    getGlobalTokenizedAssetsConfig() {
        const sources = this.config.sources.enabledSources;
        const summary = {
            enabledSources: [],
            disabledSources: [],
            totalSources: sources.length,
            globallyEnabled: false
        };

        sources.forEach(sourceId => {
            const config = this.getTokenizedAssetsConfig(sourceId);
            if (config.enabled) {
                summary.enabledSources.push(sourceId);
            } else {
                summary.disabledSources.push(sourceId);
            }
        });

        summary.globallyEnabled = summary.enabledSources.length > 0;
        return summary;
    }

    /**
     * Validate asset classification configuration
     * @returns {Object} Validation result with isValid flag and errors array
     */
    validate() {
        const config = this.getConfig();
        const errors = [];
        
        // Validate taxonomy exists
        if (!config.taxonomy) {
            errors.push('Missing taxonomy configuration');
        } else {
            // Validate required taxonomy fields
            if (!config.taxonomy.stablecoinTags || !Array.isArray(config.taxonomy.stablecoinTags)) {
                errors.push('Invalid or missing stablecoinTags in taxonomy');
            }
            if (!config.taxonomy.tokenizedAssetTags || !Array.isArray(config.taxonomy.tokenizedAssetTags)) {
                errors.push('Invalid or missing tokenizedAssetTags in taxonomy');
            }
            if (!config.taxonomy.currencyAliases || typeof config.taxonomy.currencyAliases !== 'object') {
                errors.push('Invalid or missing currencyAliases in taxonomy');
            }
        }
        
        // Validate patterns
        if (!config.patterns) {
            errors.push('Missing patterns configuration');
        } else {
            // Validate pattern arrays
            const patternArrays = ['fiatStablecoinPatterns', 'cryptoStablecoinPatterns', 
                                   'commodityStablecoinPatterns', 'tokenizedFiatPatterns',
                                   'tokenizedCommodityPatterns'];
            patternArrays.forEach(field => {
                if (!config.patterns[field] || !Array.isArray(config.patterns[field])) {
                    errors.push(`Invalid or missing ${field} in patterns`);
                } else {
                    // Validate each pattern is a valid regex string
                    config.patterns[field].forEach((pattern, idx) => {
                        if (typeof pattern !== 'string') {
                            errors.push(`Invalid pattern at ${field}[${idx}]: must be string`);
                        } else {
                            try {
                                new RegExp(pattern, 'i');
                            } catch (e) {
                                errors.push(`Invalid regex pattern at ${field}[${idx}]: ${e.message}`);
                            }
                        }
                    });
                }
            });
        }
        
        // Validate sources configuration
        if (!config.sources || typeof config.sources !== 'object') {
            errors.push('Missing or invalid sources configuration');
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            config
        };
    }
}

// Export singleton instance
module.exports = new AssetClassificationConfig();