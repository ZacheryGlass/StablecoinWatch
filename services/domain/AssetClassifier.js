const performance = require('perf_hooks').performance;
const SafeUtils = require('../../utils/SafeUtils');

/**
 * AssetClassifier - Centralized asset classification service
 * 
 * Provides config-driven classification of digital assets into categories
 * (stablecoins, tokenized assets, etc.) and specific pegged asset types.
 * 
 * Replaces hardcoded classification logic scattered across fetchers.
 */
class AssetClassifier {
    /**
     * Creates an instance of AssetClassifier
     * @param {Object} config - Classification configuration from ApiConfig
     * @param {Object} logger - A logger instance (e.g., Winston)
     */
    constructor(config = {}, logger = null) {
        this.config = config;
        // Fallback to a silent mock logger to avoid breaking tests that don't inject one
        this.logger = logger || {
            info: () => {},
            warn: () => {},
            error: () => {},
            debug: () => {},
        };
        
        // Performance and success rate tracking with atomic counters
        this._metrics = {
            classifications: {
                total: SafeUtils.createAtomicCounter(0),
                successful: SafeUtils.createAtomicCounter(0),
                failed: SafeUtils.createAtomicCounter(0),
                averageDurationMs: 0,
                totalDurationMs: 0,
                bySource: new Map(),
                byCategory: new Map(),
                unknownPatterns: new Set(),
                lastReset: Date.now()
            },
            errors: {
                validationErrors: SafeUtils.createAtomicCounter(0),
                patternErrors: SafeUtils.createAtomicCounter(0),
                configErrors: SafeUtils.createAtomicCounter(0),
                unknownErrors: SafeUtils.createAtomicCounter(0)
            }
        };

        // Conflict detection and resolution tracking with bounded memory
        this._conflictTracking = {
            classifications: SafeUtils.createBoundedMap(1000, 50), // Max 1000 entries, 50MB limit
            conflicts: SafeUtils.createBoundedMap(500, 25), // Max 500 conflicts, 25MB limit
            resolutions: SafeUtils.createBoundedMap(500, 25), // Max 500 resolutions, 25MB limit
            strategies: {
                PRIORITY_BASED: 'priority', // Use source priority
                CONSENSUS_BASED: 'consensus', // Use majority vote
                MOST_SPECIFIC: 'specific', // Use most specific classification
                NEWEST_FIRST: 'newest' // Use most recent classification
            },
            globalMemoryLimit: 100 * 1024 * 1024 // 100MB global limit
        };

        // Schema management and validation with bounded memory
        this._schemaManager = {
            expectedSchemas: new Map(), // source -> expected schema
            violations: SafeUtils.createBoundedMap(100, 10), // Max 100 sources, 10MB limit
            unknownAttributes: SafeUtils.createBoundedMap(100, 10), // Max 100 sources, 10MB limit
            dataFormats: new Map(), // source -> detected data format versions
            evolutionTracking: SafeUtils.createBoundedMap(50, 5), // Max 50 sources, 5MB limit
            evolutionLock: new Map() // Track locks for atomic operations
        };

        // Initialize expected schemas for common sources
        this._initializeExpectedSchemas();
        
        // Classification constants
        this.ASSET_CATEGORIES = {
            STABLECOIN: 'Stablecoin',
            TOKENIZED_ASSET: 'Tokenized Asset', 
            OTHER: 'Other'
        };

        // Initialize currency alias map (from config) first - normalize keys to uppercase
        this._currencyAliasMap = {};
        try {
            const raw = (this.config.taxonomy && this.config.taxonomy.currencyAliases) || {};
            for (const [k, v] of Object.entries(raw)) {
                this._currencyAliasMap[String(k).toUpperCase()] = v;
            }
        } catch (e) {
            this.logger.error('Failed to initialize currency aliases from config', { error: e });
            throw new Error('Invalid currency alias configuration provided.');
        }
        
        // Pre-compile performance-critical lookups (order matters - currency maps depend on alias map)
        this._initializeTagSets();
        this._initializePatterns();
        this._initializeCurrencyMaps();
    }

    /**
     * Initialize tag sets for O(1) lookup performance
     * @private
     */
    _initializeTagSets() {
        const taxonomy = this.config.taxonomy || {};
        
        // Stablecoin tags
        this._stablecoinTags = new Set([
            ...(taxonomy.stablecoinTags || ['stablecoin']),
            ...(this._parseCustomTags(process.env.CUSTOM_STABLECOIN_TAGS))
        ]);
        
        // Tokenized asset tags
        this._tokenizedAssetTags = new Set([
            ...(taxonomy.tokenizedAssetTags || ['tokenized-assets']),
            ...(this._parseCustomTags(process.env.CUSTOM_TOKENIZED_TAGS))
        ]);
        
        // Tokenized subtypes mapping
        this._tokenizedSubtypes = new Map(Object.entries(taxonomy.tokenizedSubtypes || {
            'tokenized-gold': 'Gold',
            'tokenized-silver': 'Silver', 
            'tokenized-etfs': 'ETF',
            'tokenized-stock': 'Stocks',
            'tokenized-real-estate': 'Real Estate',
            'tokenized-treasury-bills': 'Treasury Bills',
            'tokenized-commodities': 'Commodities'
        }));
        
        // Asset-backed stablecoin tags
        this._assetBackedTags = new Set(taxonomy.assetBackedTags || ['asset-backed-stablecoin']);
    }

    /**
     * Initialize regex patterns for symbol/name matching
     * @private
     */
    _initializePatterns() {
        const patterns = this.config.taxonomy?.patterns || {};
        
        try {
            // Gold detection patterns
            this._goldPatterns = {
                symbols: this._createSafeRegex(patterns.goldSymbols || 'xau|paxg|xaut', 'i', 'goldSymbols'),
                names: this._createSafeRegex(patterns.goldNames || 'gold', 'i', 'goldNames')
            };
            
            // Silver detection patterns  
            this._silverPatterns = {
                symbols: this._createSafeRegex(patterns.silverSymbols || 'xag', 'i', 'silverSymbols'),
                names: this._createSafeRegex(patterns.silverNames || 'silver', 'i', 'silverNames')
            };
            
            // Other asset patterns
            this._assetPatterns = {
                etf: this._createSafeRegex(patterns.etf || 'etf', 'i', 'etf'),
                treasury: this._createSafeRegex(patterns.treasury || 'treasury', 'i', 'treasury'),
                stock: this._createSafeRegex(patterns.stock || 'stock', 'i', 'stock'),
                realEstate: this._createSafeRegex(patterns.realEstate || 'real estate|real-estate|estate', 'i', 'realEstate')
            };
            
            this.logger.info('Asset classification patterns initialized successfully', {
                patternsCount: Object.keys(patterns).length,
                compiledPatterns: [
                    'goldSymbols', 'goldNames', 'silverSymbols', 'silverNames', 
                    'etf', 'treasury', 'stock', 'realEstate'
                ]
            });
            
        } catch (error) {
            this.logger.error('Critical failure initializing classification patterns', { 
                error: error.message,
                stack: error.stack,
                patterns: Object.keys(patterns)
            });
            throw new Error(`AssetClassifier pattern initialization failed: ${error.message}`);
        }
    }

    /**
     * Initialize comprehensive currency detection maps and patterns
     * @private
     */
    _initializeCurrencyMaps() {
        // ISO 4217 major currency codes with common name variations
        this._isoCurrencyCodes = new Set([
            'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD', 'SEK', 'NOK',
            'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'HRK', 'RUB', 'TRY', 'CNY',
            'HKD', 'SGD', 'KRW', 'THB', 'MYR', 'IDR', 'PHP', 'VND', 'INR', 'PKR',
            'LKR', 'BDT', 'NPR', 'MMK', 'LAK', 'KHR', 'AED', 'SAR', 'QAR', 'KWD',
            'BHD', 'OMR', 'JOD', 'ILS', 'EGP', 'LBP', 'SYP', 'IQD', 'IRR', 'AFN',
            'BRL', 'ARS', 'CLP', 'COP', 'PEN', 'UYU', 'PYG', 'BOB', 'VES', 'GYD',
            'ZAR', 'NGN', 'GHS', 'KES', 'UGX', 'TZS', 'RWF', 'ETB', 'XOF', 'XAF',
            'MAD', 'TND', 'DZD', 'EGP', 'LYD', 'SDG', 'SSP', 'DJF', 'SOS', 'ERN',
            'MXN', 'GTQ', 'HNL', 'NIO', 'CRC', 'PAB', 'JMD', 'HTG', 'DOP', 'CUP',
            'XCD', 'BBD', 'BZD', 'TTD', 'GYD', 'SRD', 'FKP', 'AWG', 'ANG', 'BMD',
            'KYD', 'BSD', 'ZWD', 'ZWL', 'BWP', 'SZL', 'LSL', 'MZN', 'MWK', 'ZMW',
            'AOA', 'STN', 'CVE', 'GMD', 'GNF', 'LRD', 'SLE', 'MRU', 'CDF', 'XDR'
        ]);

        // Common currency name variations for fallback detection
        this._currencyNamePatterns = new Map([
            ['USD', /\b(?:dollar|usd)\b/i],
            ['EUR', /\b(?:euro|eur)\b/i],
            ['GBP', /\b(?:pound|sterling|gbp)\b/i],
            ['JPY', /\b(?:yen|jpy)\b/i],
            ['CNY', /\b(?:yuan|renminbi|cny)\b/i],
            ['CHF', /\b(?:franc|chf)\b/i],
            ['CAD', /\b(?:canadian\s+dollar|cad)\b/i],
            ['AUD', /\b(?:australian\s+dollar|aud)\b/i],
            ['INR', /\b(?:rupee|inr)\b/i],
            ['BRL', /\b(?:real|brl)\b/i],
            ['RUB', /\b(?:ruble|rouble|rub)\b/i],
            ['KRW', /\b(?:won|krw)\b/i],
            ['ZAR', /\b(?:rand|zar)\b/i],
            ['TRY', /\b(?:lira|try)\b/i],
            ['MXN', /\b(?:peso|mxn)\b/i]
        ]);

        // Common symbol variations for currency detection
        this._currencySymbolPatterns = new Map();
        try {
            for (const code of this._isoCurrencyCodes) {
                // Simplified pattern to avoid nested quantifier issues
                // Pattern matches: USD, USDt, USDC, USD-TOKEN, etc.
                const escapedCode = this._escapeRegexSpecialChars(code.toLowerCase());
                const patternStr = `^${escapedCode}[tc]?$|^${escapedCode}[-_](?:token|coin|t)$`;
                const pattern = this._createSafeRegex(patternStr, 'i', `currencySymbol-${code}`);
                this._currencySymbolPatterns.set(code, pattern);
            }

            this.logger.info('Currency symbol patterns compiled successfully', {
                currencyCount: this._isoCurrencyCodes.size,
                patternCount: this._currencySymbolPatterns.size
            });

        } catch (error) {
            this.logger.error('Failed to compile currency symbol patterns', { 
                error: error.message,
                currencyCodesCount: this._isoCurrencyCodes.size
            });
            throw new Error(`Currency pattern compilation failed: ${error.message}`);
        }

        // Load additional currencies from environment
        this._loadEnvironmentCurrencies();
    }

    /**
     * Initialize expected schemas for known data sources
     * @private
     */
    _initializeExpectedSchemas() {
        // CMC asset schema
        this._schemaManager.expectedSchemas.set('cmc', {
            required: ['symbol', 'name', 'id'],
            optional: ['tags', 'slug', 'marketData', 'metadata'],
            types: {
                symbol: 'string',
                name: 'string', 
                id: 'number',
                tags: 'array',
                slug: 'string'
            }
        });

        // Messari asset schema
        this._schemaManager.expectedSchemas.set('messari', {
            required: ['symbol', 'name'],
            optional: ['tags', 'slug', 'supplyData', 'metadata'],
            types: {
                symbol: 'string',
                name: 'string',
                tags: 'array'
            }
        });

        // CoinGecko asset schema
        this._schemaManager.expectedSchemas.set('coingecko', {
            required: ['symbol', 'name', 'id'],
            optional: ['tags', 'categories', 'platforms'],
            types: {
                symbol: 'string',
                name: 'string',
                id: 'string',
                categories: 'array'
            }
        });

        // DeFiLlama asset schema
        this._schemaManager.expectedSchemas.set('defillama', {
            required: ['symbol', 'name'],
            optional: ['tags', 'pegged', 'pegType', 'chainCirculating'],
            types: {
                symbol: 'string',
                name: 'string',
                pegged: 'string',
                chainCirculating: 'object'
            }
        });
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
     * Classify an asset into category and pegged asset type
     * 
     * @param {Object} options - The classification options.
     * @param {Object} options.asset - Asset data to classify.
     * @param {Array<string>} options.asset.tags - Classification tags from source.
     * @param {string} options.asset.name - Asset name.
     * @param {string} options.asset.symbol - Asset symbol.
     * @param {string} options.asset.slug - Asset slug.
     * @param {string} [options.source='Unknown'] - The data source providing the asset.
     * @returns {Object|null} Classification result or null if input is invalid.
     * @returns {string} returns.assetCategory - Primary asset category.
     * @returns {string|null} returns.peggedAsset - Specific pegged asset type or null.
     */
    classify({ asset, source = 'Unknown' }) {
        const startTime = performance.now();
        this._metrics.classifications.total.increment();

        try {
            // 1. Enhanced Input validation with schema checking
            const validationResult = this._validateInput(asset, source);
            if (!validationResult.isValid) {
                this._recordError('validation', validationResult.error, source);
                return null;
            }

            // 2. Schema validation and evolution tracking
            const schemaResult = this._validateAndTrackSchema(asset, source);
            if (schemaResult.hasViolations) {
                this.logger.warn('Schema violations detected', {
                    source,
                    asset: { symbol: asset.symbol, name: asset.name },
                    violations: schemaResult.violations,
                    unknownAttributes: schemaResult.unknownAttributes
                });
            }

            const { tags = [], name = '', symbol = '', slug = '' } = asset;

            // Normalize inputs for consistent matching with additional safety checks
            let tagsLower, nameLower, symbolLower, slugLower;
            try {
                tagsLower = this._normalizeTags(tags);
                nameLower = this._normalizeString(name);
                symbolLower = this._normalizeString(symbol);
                slugLower = this._normalizeString(slug);
            } catch (normalizationError) {
                this._recordError('pattern', 'Input normalization failed', source, { 
                    error: normalizationError.message,
                    asset: { symbol, name }
                });
                return null;
            }

            // Determine primary asset category first (stablecoin takes priority)
            const assetCategory = this._classifyCategory(tagsLower);

            // Determine specific pegged asset type
            const peggedAsset = this._classifyPeggedAsset(tagsLower, nameLower, symbolLower, slugLower, assetCategory);

            const result = {
                assetCategory,
                peggedAsset
            };

            const durationMs = performance.now() - startTime;

            // Create asset key for conflict tracking
            const assetKey = this._createAssetKey({ symbol, name, slug });

            // Record classification for conflict detection
            this._recordClassificationForConflictDetection(assetKey, source, result, { symbol, name });

            // Check for conflicts with other sources
            const conflictInfo = this._detectConflicts(assetKey, source, result);

            // Update success metrics
            this._recordSuccessfulClassification(source, result, durationMs);

            // Track unknown patterns for future improvements
            if (assetCategory === this.ASSET_CATEGORIES.OTHER && tags.length > 0) {
                this._trackUnknownPattern(tags, { symbol, name });
            }

            // 3. Structured Decision & Performance Logging
            this.logger.info('Asset classification complete', {
                source,
                input: { symbol, name, tags: tags.slice(0, 10) }, // Limit tags to avoid huge logs
                output: result,
                durationMs: parseFloat(durationMs.toFixed(2)),
                metadata: {
                    totalClassifications: this._metrics.classifications.total.get(),
                    successRate: this._getSuccessRate(),
                    assetKey,
                    hasConflict: conflictInfo.hasConflict,
                    conflictType: conflictInfo.hasConflict ? conflictInfo.type : null
                }
            });

            // Log conflicts separately at higher visibility
            if (conflictInfo.hasConflict) {
                this.logger.warn('Asset classification conflict detected', {
                    assetKey,
                    source,
                    currentClassification: result,
                    conflictDetails: conflictInfo,
                    asset: { symbol, name }
                });
            }

            return result;

        } catch (error) {
            const durationMs = performance.now() - startTime;
            this._recordError('unknown', error.message, source, { 
                stack: error.stack,
                asset: { symbol: asset?.symbol, name: asset?.name },
                durationMs
            });
            
            this.logger.error('Unexpected error in asset classification', {
                source,
                error: error.message,
                stack: error.stack,
                durationMs,
                asset: asset ? { symbol: asset.symbol, name: asset.name } : null
            });
            
            return null;
        }
    }

    /**
     * Normalize tags array to lowercase strings
     * @private
     * @param {Array} tags - Input tags
     * @returns {Array<string>} Normalized tags
     */
    _normalizeTags(tags) {
        if (!Array.isArray(tags)) return [];
        return tags.map(tag => String(tag).toLowerCase());
    }

    /**
     * Classify primary asset category based on tags
     * @private
     * @param {Array<string>} tagsLower - Normalized tags
     * @returns {string} Asset category
     */
    _classifyCategory(tagsLower) {
        // Check for stablecoin tags first
        if (tagsLower.some(tag => this._stablecoinTags.has(tag))) {
            return this.ASSET_CATEGORIES.STABLECOIN;
        }
        
        // Check for currency-specific stablecoin tags (e.g., 'usd-stablecoin', 'eur-stablecoin')
        if (tagsLower.some(tag => /^([a-z]{3})-stablecoin$/.test(tag))) {
            return this.ASSET_CATEGORIES.STABLECOIN;
        }
        
        // Check for pegged currency tags (e.g., 'peggedUSD', 'peggedEUR')
        if (tagsLower.some(tag => /^pegged[a-z0-9]+$/i.test(tag))) {
            return this.ASSET_CATEGORIES.STABLECOIN;
        }
        
        // Check for tokenized asset tags (generic)
        if (tagsLower.some(tag => this._tokenizedAssetTags.has(tag))) {
            return this.ASSET_CATEGORIES.TOKENIZED_ASSET;
        }
        
        // Check for specific tokenized asset subtypes
        if (tagsLower.some(tag => this._tokenizedSubtypes.has(tag))) {
            return this.ASSET_CATEGORIES.TOKENIZED_ASSET;
        }
        
        return this.ASSET_CATEGORIES.OTHER;
    }

    /**
     * Classify specific pegged asset type
     * @private
     * @param {Array<string>} tagsLower - Normalized tags
     * @param {string} nameLower - Lowercase name
     * @param {string} symbolLower - Lowercase symbol  
     * @param {string} slugLower - Lowercase slug
     * @returns {string|null} Specific pegged asset type or null
     */
    _classifyPeggedAsset(tagsLower, nameLower, symbolLower, slugLower, assetCategory) {
        // If the primary category is Stablecoin, prefer fiat/asset-backed
        // pegging inference and do NOT treat tokenized-asset tags as peggedAsset.
        if (assetCategory === this.ASSET_CATEGORIES.STABLECOIN) {
            // Detect currency-specific stablecoin tags like 'usd-stablecoin', 'eur-stablecoin', etc.
            // Prefer explicit currency tags over generic 'fiat-stablecoin'.
            for (const t of tagsLower) {
                const m = /^([a-z]{3})-stablecoin$/.exec(t);
                if (m) {
                    // Return uppercase 3-letter code (USD, EUR, GBP, ...)
                    const code = m[1].toUpperCase();
                    return this._currencyAliasMap[code] || code;
                }
            }

            // Some sources use 'peggedUSD' or 'peggedEUR' style tags; check those too
            for (const t of tagsLower) {
                const m2 = /^pegged([a-z0-9]+)$/.exec(t);
                if (m2) {
                    const raw = m2[1].toUpperCase();
                    return this._currencyAliasMap[raw] || raw;
                }
            }

            // Fallback: try to infer currency from symbol, name, or slug using comprehensive patterns
            const detectedCurrency = this._detectCurrencyFromContent(symbolLower, nameLower, slugLower);
            if (detectedCurrency) {
                return detectedCurrency;
            }

            // Asset-backed stablecoins: infer backing type where possible
            if (tagsLower.some(tag => this._assetBackedTags.has(tag))) {
                return this._inferAssetBackedType(nameLower, symbolLower, slugLower);
            }

            // Default for generic stablecoins: no specific pegged asset
            return null;
        }

        // For non-stablecoin categories, continue original tokenized-asset logic
        // Check specific tokenized subtypes first (most precise)
        for (const [tag, label] of this._tokenizedSubtypes) {
            if (tagsLower.includes(tag)) {
                // Special handling for commodities category
                if (label === 'Commodities') {
                    return this._classifyCommodity(tagsLower, nameLower, symbolLower, slugLower);
                }
                return label;
            }
        }
        
        // Generic tokenized assets: infer from symbol/name patterns
        if (tagsLower.some(tag => this._tokenizedAssetTags.has(tag))) {
            return this._inferTokenizedAssetType(nameLower, symbolLower, slugLower);
        }
        
        // Asset-backed stablecoins (when not previously handled because category != Stablecoin)
        if (tagsLower.some(tag => this._assetBackedTags.has(tag))) {
            return this._inferAssetBackedType(nameLower, symbolLower, slugLower);
        }
        
        return null;
    }

    /**
     * Classify specific commodity type
     * @private
     * @param {Array<string>} tagsLower - Normalized tags
     * @param {string} nameLower - Lowercase name
     * @param {string} symbolLower - Lowercase symbol
     * @param {string} slugLower - Lowercase slug
     * @returns {string} Specific commodity type
     */
    _classifyCommodity(tagsLower, nameLower, symbolLower, slugLower) {
        // Gold detection
        if (tagsLower.includes('tokenized-gold') || 
            this._goldPatterns.symbols.test(symbolLower) ||
            this._goldPatterns.names.test(nameLower) ||
            this._goldPatterns.names.test(slugLower)) {
            return 'Gold';
        }
        
        // Silver detection
        if (tagsLower.includes('tokenized-silver') ||
            this._silverPatterns.symbols.test(symbolLower) ||
            this._silverPatterns.names.test(nameLower) ||
            this._silverPatterns.names.test(slugLower)) {
            return 'Silver';
        }
        
        return 'Commodities';
    }

    /**
     * Infer tokenized asset type from name/symbol patterns
     * @private
     * @param {string} nameLower - Lowercase name
     * @param {string} symbolLower - Lowercase symbol
     * @param {string} slugLower - Lowercase slug
     * @returns {string} Inferred asset type
     */
    _inferTokenizedAssetType(nameLower, symbolLower, slugLower) {
        // Gold
        if (this._goldPatterns.symbols.test(symbolLower) ||
            this._goldPatterns.names.test(nameLower) ||
            this._goldPatterns.names.test(slugLower)) {
            return 'Gold';
        }
        
        // Silver
        if (this._silverPatterns.symbols.test(symbolLower) ||
            this._silverPatterns.names.test(nameLower) ||
            this._silverPatterns.names.test(slugLower)) {
            return 'Silver';
        }
        
        // ETF
        if (this._assetPatterns.etf.test(nameLower) || 
            this._assetPatterns.etf.test(slugLower)) {
            return 'ETF';
        }
        
        // Treasury Bills
        if (this._assetPatterns.treasury.test(nameLower) ||
            this._assetPatterns.treasury.test(slugLower)) {
            return 'Treasury Bills';
        }
        
        // Stocks
        if (this._assetPatterns.stock.test(nameLower) ||
            this._assetPatterns.stock.test(slugLower)) {
            return 'Stocks';
        }
        
        // Real Estate
        if (this._assetPatterns.realEstate.test(nameLower) ||
            this._assetPatterns.realEstate.test(slugLower)) {
            return 'Real Estate';
        }
        
        return 'Tokenized Asset';
    }

    /**
     * Infer asset-backed stablecoin type
     * @private
     * @param {string} nameLower - Lowercase name
     * @param {string} symbolLower - Lowercase symbol
     * @param {string} slugLower - Lowercase slug
     * @returns {string} Asset backing type
     */
    _inferAssetBackedType(nameLower, symbolLower, slugLower) {
        // First, try to detect currency from symbol/name patterns
        const detectedCurrency = this._detectCurrencyFromContent(symbolLower, nameLower, slugLower);
        if (detectedCurrency) {
            return detectedCurrency;
        }

        // Then try specific asset patterns (but avoid generic "Tokenized Asset" fallback)
        const assetType = this._inferTokenizedAssetType(nameLower, symbolLower, slugLower);
        
        // Only return specific asset types, not the generic fallback
        if (assetType && assetType !== 'Tokenized Asset') {
            return assetType;
        }

        // For asset-backed stablecoins without clear patterns, return null
        // This allows DeFiLlama's explicit pegType to take priority
        return null;
    }

    /**
     * Get available asset categories
     * @returns {Object} Available asset categories
     */
    getAssetCategories() {
        return { ...this.ASSET_CATEGORIES };
    }

    /**
     * Check if classification is enabled
     * @returns {boolean} True if classification is enabled
     */
    isEnabled() {
        return process.env.ASSET_CLASSIFICATION_ENABLED !== 'false';
    }

    /**
     * Detect currency from symbol, name, or slug content using comprehensive patterns
     * @private
     * @param {string} symbolLower - Lowercase symbol
     * @param {string} nameLower - Lowercase name
     * @param {string} slugLower - Lowercase slug
     * @returns {string|null} Detected currency code or null
     */
    _detectCurrencyFromContent(symbolLower, nameLower, slugLower) {
        // First, check if the symbol is directly in our currency alias map (for stablecoin symbols)
        const symbolUpper = symbolLower.toUpperCase();
        if (this._currencyAliasMap[symbolUpper]) {
            return this._currencyAliasMap[symbolUpper];
        }

        // Try symbol-based detection using pre-compiled patterns
        for (const [code, pattern] of this._currencySymbolPatterns) {
            if (pattern.test(symbolLower)) {
                return this._currencyAliasMap[code] || code;
            }
        }

        // Then try name-based detection for common currency names
        for (const [code, pattern] of this._currencyNamePatterns) {
            if (pattern.test(nameLower) || pattern.test(slugLower)) {
                return this._currencyAliasMap[code] || code;
            }
        }

        // Try to extract any valid ISO currency code from symbol/name
        // Look for 3-letter codes at the start/end of symbols or embedded in names
        const symbolMatch = symbolLower.match(/^([a-z]{3})[tc]?$|^([a-z]{3})[-_]/); 
        if (symbolMatch) {
            const code = (symbolMatch[1] || symbolMatch[2]).toUpperCase();
            if (this._isoCurrencyCodes.has(code)) {
                return this._currencyAliasMap[code] || code;
            }
        }

        // Special handling for X-prefixed currency stablecoins (XSGD, XEUR, etc.)
        const xPrefixMatch = symbolLower.match(/^x([a-z]{3})$/);
        if (xPrefixMatch) {
            const code = xPrefixMatch[1].toUpperCase();
            if (this._isoCurrencyCodes.has(code)) {
                return this._currencyAliasMap[code] || code;
            }
        }

        // Check for currency codes in names/slugs
        const nameMatch = (nameLower + ' ' + slugLower).match(/\b([a-z]{3})\b/);
        if (nameMatch) {
            const code = nameMatch[1].toUpperCase();
            if (this._isoCurrencyCodes.has(code)) {
                return this._currencyAliasMap[code] || code;
            }
        }

        return null;
    }

    /**
     * Load additional currency mappings from environment variables
     * Format: "CODE1:Name1,CODE2:Name2" e.g., "ZWD:Zimbabwean Dollar,VES:Venezuelan Bolívar"
     * @private
     */
    _loadEnvironmentCurrencies() {
        const customCurrencies = process.env.CUSTOM_CURRENCIES;
        if (!customCurrencies) return;

        try {
            const mappings = customCurrencies.split(',');
            for (const mapping of mappings) {
                const [code, name] = mapping.split(':').map(s => s.trim());
                if (code && name) {
                    const upperCode = code.toUpperCase();
                    this._isoCurrencyCodes.add(upperCode);
                    this._currencyAliasMap[upperCode] = name;
                    
                    // Create basic pattern for the currency
                    const symbolPatternStr = `^${upperCode.toLowerCase()}[tc]?\b|\b${upperCode.toLowerCase()}[-_]?(?:token|coin|t)?\b`;
                    const symbolPattern = this._createSafeRegex(symbolPatternStr, 'i', `customCurrencySymbol-${upperCode}`);
                    this._currencySymbolPatterns.set(upperCode, symbolPattern);
                    
                    // If name is provided, create name pattern
                    if (name.length > 2) {
                        const namePatternStr = `\b${this._escapeRegexSpecialChars(name.toLowerCase())}\b`;
                        const namePattern = this._createSafeRegex(namePatternStr, 'i', `customCurrencyName-${upperCode}`);
                        this._currencyNamePatterns.set(upperCode, namePattern);
                    }
                }
            }
        } catch (error) {
            this.logger.warn('Failed to parse CUSTOM_CURRENCIES environment variable', { 
                error,
                value: customCurrencies
            });
        }
    }

    /**
     * Add custom currency detection patterns at runtime
     * @param {string} currencyCode - ISO 4217 currency code
     * @param {Object} patterns - Pattern definitions
     * @param {RegExp} patterns.symbol - Symbol pattern
     * @param {RegExp} patterns.name - Name pattern
     */
    addCurrencyPatterns(currencyCode, patterns = {}) {
        const code = currencyCode.toUpperCase();
        this._isoCurrencyCodes.add(code);
        
        if (patterns.symbol) {
            this._currencySymbolPatterns.set(code, patterns.symbol);
        }
        
        if (patterns.name) {
            this._currencyNamePatterns.set(code, patterns.name);
        }
    }

    /**
     * Get list of supported currency codes
     * @returns {Array<string>} Array of supported ISO currency codes
     */
    getSupportedCurrencies() {
        return Array.from(this._isoCurrencyCodes).sort();
    }

    /**
     * Get current configuration summary
     * @returns {Object} Configuration summary for debugging
     */
    getConfigSummary() {
        return {
            enabled: this.isEnabled(),
            stablecoinTagCount: this._stablecoinTags.size,
            tokenizedAssetTagCount: this._tokenizedAssetTags.size,
            tokenizedSubtypeCount: this._tokenizedSubtypes.size,
            assetBackedTagCount: this._assetBackedTags.size,
            supportedCurrencyCount: this._isoCurrencyCodes.size,
            currencyNamePatternCount: this._currencyNamePatterns.size,
            currencySymbolPatternCount: this._currencySymbolPatterns.size,
            metrics: this.getMetrics()
        };
    }

    /**
     * Get comprehensive performance and error metrics with alerting thresholds
     * @returns {Object} Performance and error metrics with monitoring data
     */
    getMetrics() {
        const conflictSummary = this.getConflictSummary();
        const schemaSummary = this.getSchemaMonitoringSummary();
        
        // Calculate alerting status
        const alerts = this._generateAlerts();
        
        return {
            classifications: {
                total: this._metrics.classifications.total,
                successful: this._metrics.classifications.successful,
                failed: this._metrics.classifications.failed,
                successRate: this._getSuccessRate(),
                averageDurationMs: this._metrics.classifications.averageDurationMs,
                bySource: Object.fromEntries(this._metrics.classifications.bySource),
                byCategory: Object.fromEntries(this._metrics.classifications.byCategory),
                unknownPatternCount: this._metrics.classifications.unknownPatterns.size,
                lastReset: this._metrics.classifications.lastReset
            },
            errors: { ...this._metrics.errors },
            conflicts: conflictSummary,
            schema: schemaSummary,
            alerts: alerts,
            health: {
                overall: this._calculateOverallHealth(),
                performance: this._getPerformanceHealth(),
                dataQuality: this._getDataQualityHealth(),
                operationalStatus: this._getOperationalStatus()
            },
            monitoring: {
                alertCount: alerts.length,
                criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
                warningAlerts: alerts.filter(a => a.severity === 'warning').length,
                lastAlertTime: alerts.length > 0 ? Math.max(...alerts.map(a => a.timestamp)) : null
            }
        };
    }

    /**
     * Reset performance metrics
     */
    resetMetrics() {
        this._metrics.classifications = {
            total: 0,
            successful: 0,
            failed: 0,
            averageDurationMs: 0,
            totalDurationMs: 0,
            bySource: new Map(),
            byCategory: new Map(),
            unknownPatterns: new Set(),
            lastReset: Date.now()
        };
        this._metrics.errors = {
            validationErrors: 0,
            patternErrors: 0,
            configErrors: 0,
            unknownErrors: 0
        };
        
        this.logger.info('AssetClassifier metrics reset', { timestamp: Date.now() });
    }

    /**
     * Create a consistent asset key for conflict tracking
     * @private
     * @param {Object} asset - Asset data
     * @returns {string} Asset key
     */
    _createAssetKey({ symbol, name, slug }) {
        // Use symbol as primary key, fallback to name or slug
        const primary = symbol || name || slug || 'unknown';
        const secondary = symbol ? name : (name ? slug : '');
        
        // Create normalized key
        const key = secondary ? 
            `${primary.toLowerCase()}|${secondary.toLowerCase()}` : 
            primary.toLowerCase();
        
        return key;
    }

    /**
     * Record classification for conflict detection
     * @private
     * @param {string} assetKey - Asset key
     * @param {string} source - Data source
     * @param {Object} result - Classification result
     * @param {Object} assetInfo - Asset info for context
     */
    _recordClassificationForConflictDetection(assetKey, source, result, assetInfo) {
        // Get or create asset classification record
        if (!this._conflictTracking.classifications.has(assetKey)) {
            this._conflictTracking.classifications.set(assetKey, new Map());
        }

        const assetClassifications = this._conflictTracking.classifications.get(assetKey);
        
        // Record this classification
        assetClassifications.set(source, {
            classification: { ...result },
            timestamp: Date.now(),
            assetInfo: { ...assetInfo }
        });

        // Clean up old classifications (keep last 5 per asset to save memory)
        if (assetClassifications.size > 5) {
            const entries = Array.from(assetClassifications.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp);
            
            // Remove oldest entries
            const toRemove = entries.slice(0, entries.length - 5);
            toRemove.forEach(([sourceKey]) => {
                assetClassifications.delete(sourceKey);
            });
        }
        
        // Global memory check - clean up if approaching limit
        this._performMemoryCleanupIfNeeded();
    }

    /**
     * Detect conflicts between different sources for the same asset
     * @private
     * @param {string} assetKey - Asset key
     * @param {string} currentSource - Current data source
     * @param {Object} currentResult - Current classification result
     * @returns {Object} Conflict information
     */
    _detectConflicts(assetKey, currentSource, currentResult) {
        const assetClassifications = this._conflictTracking.classifications.get(assetKey);
        
        if (!assetClassifications || assetClassifications.size < 2) {
            return { hasConflict: false };
        }

        const conflicts = {
            category: [],
            peggedAsset: [],
            sources: []
        };

        let hasConflict = false;

        // Compare with other sources
        for (const [source, data] of assetClassifications) {
            if (source === currentSource) continue;

            const { classification } = data;
            conflicts.sources.push(source);

            // Check category conflicts
            if (classification.assetCategory !== currentResult.assetCategory) {
                conflicts.category.push({
                    source,
                    category: classification.assetCategory,
                    timestamp: data.timestamp
                });
                hasConflict = true;
            }

            // Check pegged asset conflicts
            if (classification.peggedAsset !== currentResult.peggedAsset) {
                conflicts.peggedAsset.push({
                    source,
                    peggedAsset: classification.peggedAsset,
                    timestamp: data.timestamp
                });
                hasConflict = true;
            }
        }

        if (hasConflict) {
            // Record conflict
            this._conflictTracking.conflicts.set(assetKey, {
                detected: Date.now(),
                currentSource,
                currentResult: { ...currentResult },
                conflicts,
                resolved: false
            });

            // Determine conflict type
            let type = 'mixed';
            if (conflicts.category.length > 0 && conflicts.peggedAsset.length === 0) {
                type = 'category';
            } else if (conflicts.category.length === 0 && conflicts.peggedAsset.length > 0) {
                type = 'peggedAsset';
            }

            return {
                hasConflict: true,
                type,
                conflicts,
                totalSources: assetClassifications.size
            };
        }

        return { hasConflict: false };
    }

    /**
     * Resolve conflicts using specified strategy
     * @param {string} assetKey - Asset key
     * @param {string} strategy - Resolution strategy
     * @param {Object} sourcePriorities - Source priority mapping
     * @returns {Object|null} Resolved classification or null
     */
    resolveConflict(assetKey, strategy = 'priority', sourcePriorities = {}) {
        const conflict = this._conflictTracking.conflicts.get(assetKey);
        const classifications = this._conflictTracking.classifications.get(assetKey);

        if (!conflict || !classifications) {
            return null;
        }

        let resolvedClassification = null;
        let resolutionMethod = strategy;

        try {
            switch (strategy) {
                case this._conflictTracking.strategies.PRIORITY_BASED:
                    resolvedClassification = this._resolvePriorityBased(classifications, sourcePriorities);
                    break;

                case this._conflictTracking.strategies.CONSENSUS_BASED:
                    resolvedClassification = this._resolveConsensusBased(classifications);
                    break;

                case this._conflictTracking.strategies.MOST_SPECIFIC:
                    resolvedClassification = this._resolveMostSpecific(classifications);
                    break;

                case this._conflictTracking.strategies.NEWEST_FIRST:
                    resolvedClassification = this._resolveNewestFirst(classifications);
                    break;

                default:
                    // Default to priority-based
                    resolvedClassification = this._resolvePriorityBased(classifications, sourcePriorities);
                    resolutionMethod = this._conflictTracking.strategies.PRIORITY_BASED;
            }

            if (resolvedClassification) {
                // Mark conflict as resolved
                conflict.resolved = true;
                conflict.resolutionTimestamp = Date.now();
                conflict.resolutionMethod = resolutionMethod;
                conflict.resolvedClassification = { ...resolvedClassification };

                // Record resolution strategy used
                this._conflictTracking.resolutions.set(assetKey, {
                    strategy: resolutionMethod,
                    timestamp: Date.now(),
                    result: { ...resolvedClassification }
                });

                this.logger.info('Asset classification conflict resolved', {
                    assetKey,
                    strategy: resolutionMethod,
                    resolvedClassification,
                    involvedSources: Array.from(classifications.keys()),
                    conflictDurationMs: Date.now() - conflict.detected
                });
            }

        } catch (error) {
            this.logger.error('Failed to resolve classification conflict', {
                assetKey,
                strategy,
                error: error.message,
                involvedSources: Array.from(classifications.keys())
            });
        }

        return resolvedClassification;
    }

    /**
     * Get conflict summary and statistics
     * @returns {Object} Conflict summary
     */
    getConflictSummary() {
        const summary = {
            totalAssets: this._conflictTracking.classifications.size,
            assetsWithConflicts: this._conflictTracking.conflicts.size,
            resolvedConflicts: Array.from(this._conflictTracking.conflicts.values())
                .filter(c => c.resolved).length,
            conflictRate: 0,
            topConflictingSources: new Map(),
            conflictTypes: { category: 0, peggedAsset: 0, mixed: 0 },
            resolutionStrategies: new Map()
        };

        if (summary.totalAssets > 0) {
            summary.conflictRate = summary.assetsWithConflicts / summary.totalAssets;
        }

        // Analyze conflicts
        for (const conflict of this._conflictTracking.conflicts.values()) {
            // Count conflict types
            const { conflicts } = conflict;
            if (conflicts.category.length > 0 && conflicts.peggedAsset.length > 0) {
                summary.conflictTypes.mixed++;
            } else if (conflicts.category.length > 0) {
                summary.conflictTypes.category++;
            } else if (conflicts.peggedAsset.length > 0) {
                summary.conflictTypes.peggedAsset++;
            }

            // Track conflicting sources
            for (const source of conflicts.sources) {
                const count = summary.topConflictingSources.get(source) || 0;
                summary.topConflictingSources.set(source, count + 1);
            }
        }

        // Analyze resolution strategies
        for (const resolution of this._conflictTracking.resolutions.values()) {
            const count = summary.resolutionStrategies.get(resolution.strategy) || 0;
            summary.resolutionStrategies.set(resolution.strategy, count + 1);
        }

        return summary;
    }

    /**
     * Validate asset against expected schema and track evolution
     * @private
     * @param {Object} asset - Asset to validate
     * @param {string} source - Data source name
     * @returns {Object} Schema validation result
     */
    _validateAndTrackSchema(asset, source) {
        const expectedSchema = this._schemaManager.expectedSchemas.get(source);
        
        if (!expectedSchema) {
            // Unknown source - track for future schema learning
            this._trackUnknownDataFormat(source, asset);
            return { hasViolations: false };
        }

        const violations = [];
        const unknownAttributes = [];
        const assetKeys = Object.keys(asset);

        // Check required fields
        for (const requiredField of expectedSchema.required || []) {
            if (!(requiredField in asset)) {
                violations.push({
                    type: 'missing_required',
                    field: requiredField,
                    expected: 'required field'
                });
            }
        }

        // Check field types
        for (const [field, expectedType] of Object.entries(expectedSchema.types || {})) {
            if (field in asset) {
                const actualType = this._getFieldType(asset[field]);
                if (actualType !== expectedType) {
                    violations.push({
                        type: 'type_mismatch',
                        field,
                        expected: expectedType,
                        actual: actualType
                    });
                }
            }
        }

        // Check for unknown attributes
        const knownFields = new Set([
            ...(expectedSchema.required || []),
            ...(expectedSchema.optional || [])
        ]);

        for (const field of assetKeys) {
            if (!knownFields.has(field)) {
                unknownAttributes.push(field);
            }
        }

        // Record violations and unknown attributes
        if (violations.length > 0) {
            this._recordSchemaViolations(source, violations);
        }

        if (unknownAttributes.length > 0) {
            this._recordUnknownAttributes(source, unknownAttributes);
        }

        // Track data format evolution
        this._trackSchemaEvolution(source, asset, violations, unknownAttributes);

        return {
            hasViolations: violations.length > 0 || unknownAttributes.length > 0,
            violations,
            unknownAttributes
        };
    }

    /**
     * Get the type of a field value
     * @private
     * @param {*} value - Value to check
     * @returns {string} Type name
     */
    _getFieldType(value) {
        if (value === null) return 'null';
        if (Array.isArray(value)) return 'array';
        return typeof value;
    }

    /**
     * Record schema violations for monitoring
     * @private
     * @param {string} source - Data source
     * @param {Array} violations - List of violations
     */
    _recordSchemaViolations(source, violations) {
        if (!this._schemaManager.violations.has(source)) {
            this._schemaManager.violations.set(source, []);
        }

        const sourceViolations = this._schemaManager.violations.get(source);
        sourceViolations.push({
            timestamp: Date.now(),
            violations: [...violations]
        });

        // Keep only last 100 violation records per source
        if (sourceViolations.length > 100) {
            sourceViolations.splice(0, sourceViolations.length - 100);
        }
    }

    /**
     * Record unknown attributes for monitoring
     * @private
     * @param {string} source - Data source
     * @param {Array} attributes - Unknown attributes
     */
    _recordUnknownAttributes(source, attributes) {
        if (!this._schemaManager.unknownAttributes.has(source)) {
            this._schemaManager.unknownAttributes.set(source, new Set());
        }

        const sourceUnknown = this._schemaManager.unknownAttributes.get(source);
        attributes.forEach(attr => sourceUnknown.add(attr));
    }

    /**
     * Track schema evolution over time
     * @private
     * @param {string} source - Data source
     * @param {Object} asset - Current asset data
     * @param {Array} violations - Current violations
     * @param {Array} unknownAttributes - Unknown attributes
     */
    _trackSchemaEvolution(source, asset, violations, unknownAttributes) {
        if (!this._schemaManager.evolutionTracking.has(source)) {
            this._schemaManager.evolutionTracking.set(source, []);
        }

        const evolution = this._schemaManager.evolutionTracking.get(source);
        const now = Date.now();
        
        // Use lock for atomic operations
        const lockKey = `evolution_${source}`;
        if (this._schemaManager.evolutionLock.get(lockKey)) {
            return; // Skip if already being modified
        }
        
        this._schemaManager.evolutionLock.set(lockKey, true);
        
        try {
            // Only record significant changes
            if (violations.length > 0 || unknownAttributes.length > 0) {
                evolution.push({
                    timestamp: now,
                    violationCount: violations.length,
                    unknownAttributeCount: unknownAttributes.length,
                    newAttributes: unknownAttributes.slice(0, 10), // Limit stored attributes
                    sampleAsset: {
                        symbol: asset.symbol,
                        name: asset.name,
                        attributeCount: Object.keys(asset).length
                    }
                });

                // Keep only last 25 evolution records per source (reduced for memory)
                if (evolution.length > 25) {
                    evolution.splice(0, evolution.length - 25);
                }
            }
        } finally {
            this._schemaManager.evolutionLock.delete(lockKey);
        }
    }

    /**
     * Track unknown data formats for learning
     * @private
     * @param {string} source - Data source
     * @param {Object} asset - Asset data
     */
    _trackUnknownDataFormat(source, asset) {
        if (!this._schemaManager.dataFormats.has(source)) {
            this._schemaManager.dataFormats.set(source, {
                discovered: Date.now(),
                sampleCount: 0,
                commonFields: new Map(),
                fieldTypes: new Map()
            });
        }

        const format = this._schemaManager.dataFormats.get(source);
        format.sampleCount++;

        // Track field frequency and types
        for (const [field, value] of Object.entries(asset)) {
            const count = format.commonFields.get(field) || 0;
            format.commonFields.set(field, count + 1);
            
            const type = this._getFieldType(value);
            const typeKey = `${field}:${type}`;
            const typeCount = format.fieldTypes.get(typeKey) || 0;
            format.fieldTypes.set(typeKey, typeCount + 1);
        }

        this.logger.info('Learning schema for unknown source', {
            source,
            sampleCount: format.sampleCount,
            discoveredFields: format.commonFields.size,
            asset: { symbol: asset.symbol, name: asset.name }
        });
    }

    /**
     * Get schema monitoring summary
     * @returns {Object} Schema monitoring summary
     */
    getSchemaMonitoringSummary() {
        const summary = {
            sources: {},
            overallHealth: 'healthy',
            totalViolations: 0,
            totalUnknownAttributes: 0
        };

        for (const [source, violations] of this._schemaManager.violations) {
            const recentViolations = violations.filter(v => 
                Date.now() - v.timestamp < 86400000 // Last 24 hours
            );
            
            summary.sources[source] = {
                violations: recentViolations.length,
                unknownAttributes: this._schemaManager.unknownAttributes.get(source)?.size || 0,
                evolutionEvents: this._schemaManager.evolutionTracking.get(source)?.length || 0
            };

            summary.totalViolations += recentViolations.length;
            summary.totalUnknownAttributes += summary.sources[source].unknownAttributes;
        }

        // Determine overall health
        if (summary.totalViolations > 50 || summary.totalUnknownAttributes > 20) {
            summary.overallHealth = 'critical';
        } else if (summary.totalViolations > 10 || summary.totalUnknownAttributes > 5) {
            summary.overallHealth = 'degraded';
        }

        return summary;
    }

    /**
     * Validate input data for classification
     * @private
     * @param {*} asset - Asset to validate
     * @param {string} source - Data source name
     * @returns {Object} Validation result
     */
    _validateInput(asset, source) {
        if (!asset || typeof asset !== 'object') {
            return {
                isValid: false,
                error: `Invalid asset input: asset must be an object (got ${typeof asset})`
            };
        }

        if (Array.isArray(asset)) {
            return {
                isValid: false,
                error: 'Invalid asset input: asset cannot be an array'
            };
        }

        const { tags, name, symbol, slug } = asset;

        if (tags !== undefined && !Array.isArray(tags)) {
            return {
                isValid: false,
                error: `Invalid asset input: tags must be an array (got ${typeof tags})`
            };
        }

        // Check for excessively long inputs that could cause performance issues
        const inputs = { name, symbol, slug };
        for (const [field, value] of Object.entries(inputs)) {
            if (value && typeof value === 'string' && value.length > 500) {
                return {
                    isValid: false,
                    error: `Asset ${field} is too long: ${value.length} characters (max 500)`
                };
            }
        }

        return { isValid: true };
    }

    /**
     * Safely normalize string input
     * @private
     * @param {*} input - Input to normalize
     * @returns {string} Normalized lowercase string
     */
    _normalizeString(input) {
        if (input === null || input === undefined) {
            return '';
        }
        
        if (typeof input !== 'string') {
            input = String(input);
        }
        
        return input.toLowerCase().trim();
    }

    /**
     * Record successful classification with metrics tracking
     * @private
     * @param {string} source - Data source
     * @param {Object} result - Classification result
     * @param {number} durationMs - Processing time
     */
    _recordSuccessfulClassification(source, result, durationMs) {
        this._metrics.classifications.successful.increment();
        this._metrics.classifications.totalDurationMs += durationMs;
        const totalCount = this._metrics.classifications.total.get();
        this._metrics.classifications.averageDurationMs = 
            totalCount > 0 ? this._metrics.classifications.totalDurationMs / totalCount : 0;

        // Track by source
        const sourceStats = this._metrics.classifications.bySource.get(source) || { count: 0, totalMs: 0 };
        sourceStats.count++;
        sourceStats.totalMs += durationMs;
        this._metrics.classifications.bySource.set(source, sourceStats);

        // Track by category
        const categoryStats = this._metrics.classifications.byCategory.get(result.assetCategory) || { count: 0 };
        categoryStats.count++;
        this._metrics.classifications.byCategory.set(result.assetCategory, categoryStats);
    }

    /**
     * Record error with metrics tracking
     * @private
     * @param {string} errorType - Type of error
     * @param {string} message - Error message
     * @param {string} source - Data source
     * @param {Object} context - Additional context
     */
    _recordError(errorType, message, source, context = {}) {
        this._metrics.classifications.failed.increment();
        
        switch (errorType) {
            case 'validation':
                this._metrics.errors.validationErrors.increment();
                break;
            case 'pattern':
                this._metrics.errors.patternErrors.increment();
                break;
            case 'config':
                this._metrics.errors.configErrors.increment();
                break;
            default:
                this._metrics.errors.unknownErrors.increment();
        }

        this.logger.error(`AssetClassifier ${errorType} error`, {
            errorType,
            message,
            source,
            context,
            metrics: {
                totalFailed: this._metrics.classifications.failed,
                successRate: this._getSuccessRate()
            }
        });
    }

    /**
     * Track unknown patterns for future improvement
     * @private
     * @param {Array<string>} tags - Asset tags
     * @param {Object} asset - Asset info for context
     */
    _trackUnknownPattern(tags, asset) {
        const pattern = tags.slice(0, 5).sort().join('|'); // Limit and sort for consistency
        this._metrics.classifications.unknownPatterns.add(pattern);

        this.logger.debug('Unknown asset pattern detected', {
            pattern,
            tags: tags.slice(0, 10),
            asset: { symbol: asset.symbol, name: asset.name },
            totalUnknownPatterns: this._metrics.classifications.unknownPatterns.size
        });
    }

    /**
     * Calculate current success rate
     * @private
     * @returns {number} Success rate as decimal (0-1)
     */
    _getSuccessRate() {
        // Use atomic getters to avoid race conditions
        const totalValue = this._metrics.classifications.total.get();
        const successfulValue = this._metrics.classifications.successful.get();
        return totalValue > 0 ? successfulValue / totalValue : 1.0;
    }

    /**
     * Create a safe RegExp with comprehensive error handling and logging
     * @private
     * @param {string} pattern - Regex pattern string
     * @param {string} flags - Regex flags
     * @param {string} patternName - Pattern name for logging
     * @returns {RegExp} Compiled regex pattern
     * @throws {Error} If pattern compilation fails
     */
    _createSafeRegex(pattern, flags = '', patternName = 'unknown') {
        if (typeof pattern !== 'string') {
            throw new Error(`Invalid regex pattern type for ${patternName}: expected string, got ${typeof pattern}`);
        }

        if (pattern.length === 0) {
            throw new Error(`Empty regex pattern provided for ${patternName}`);
        }

        // Basic safety checks for potentially dangerous patterns
        if (pattern.length > 1000) {
            throw new Error(`Regex pattern too long for ${patternName}: ${pattern.length} characters (max 1000)`);
        }

        // Check for catastrophic backtracking patterns (basic detection)
        if (this._hasNestedQuantifiers(pattern)) {
            this.logger.warn(`Potentially inefficient regex pattern detected for ${patternName}`, {
                pattern: pattern.substring(0, 100),
                patternName
            });
        }

        try {
            // Use SafeUtils for regex with timeout protection
            const testResult = SafeUtils.executeRegexWithTimeout(
                new RegExp(pattern, flags),
                'test_string_for_validation',
                100 // 100ms timeout for validation
            );
            
            if (testResult.error) {
                throw new Error(testResult.error);
            }
            
            const regex = new RegExp(pattern, flags);
            
            this.logger.debug(`Regex compiled successfully for ${patternName}`, {
                patternName,
                patternLength: pattern.length,
                flags
            });

            return regex;
            
        } catch (error) {
            this.logger.error(`Regex compilation failed for ${patternName}`, {
                patternName,
                pattern: pattern.substring(0, 100),
                flags,
                error: error.message
            });
            throw new Error(`Failed to compile regex pattern for ${patternName}: ${error.message}`);
        }
    }

    /**
     * Escape special regex characters in user input
     * @private
     * @param {string} text - Text to escape
     * @returns {string} Escaped text safe for use in regex
     */
    _escapeRegexSpecialChars(text) {
        if (typeof text !== 'string') return '';
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Detect potentially catastrophic backtracking patterns
     * @private
     * @param {string} pattern - Regex pattern to analyze
     * @returns {boolean} True if pattern might cause performance issues
     */
    _hasNestedQuantifiers(pattern) {
        // Use SafeUtils enhanced detection
        return SafeUtils.hasNestedQuantifiers(pattern);
    }

    /**
     * Resolve conflict using priority-based strategy
     * @private
     * @param {Map} classifications - Asset classifications by source
     * @param {Object} sourcePriorities - Source priority mapping
     * @returns {Object} Highest priority classification
     */
    _resolvePriorityBased(classifications, sourcePriorities = {}) {
        const defaultPriorities = {
            'cmc': 10,
            'messari': 9, 
            'coingecko': 6,
            'defillama': 8
        };

        const priorities = { ...defaultPriorities, ...sourcePriorities };
        
        let highestPriority = -1;
        let resolvedClassification = null;

        for (const [source, data] of classifications) {
            const priority = priorities[source] || 0;
            if (priority > highestPriority) {
                highestPriority = priority;
                resolvedClassification = data.classification;
            }
        }

        return resolvedClassification;
    }

    /**
     * Resolve conflict using consensus-based strategy (majority vote)
     * @private
     * @param {Map} classifications - Asset classifications by source
     * @returns {Object} Consensus classification
     */
    _resolveConsensusBased(classifications) {
        const categoryVotes = new Map();
        const peggedAssetVotes = new Map();

        // Count votes for each classification
        for (const [source, data] of classifications) {
            const { assetCategory, peggedAsset } = data.classification;

            // Vote for category
            const categoryCount = categoryVotes.get(assetCategory) || 0;
            categoryVotes.set(assetCategory, categoryCount + 1);

            // Vote for pegged asset
            const peggedAssetKey = peggedAsset || 'none';
            const peggedAssetCount = peggedAssetVotes.get(peggedAssetKey) || 0;
            peggedAssetVotes.set(peggedAssetKey, peggedAssetCount + 1);
        }

        // Find majority winners
        const winningCategory = Array.from(categoryVotes.entries())
            .reduce((a, b) => a[1] > b[1] ? a : b)[0];
            
        const winningPeggedAsset = Array.from(peggedAssetVotes.entries())
            .reduce((a, b) => a[1] > b[1] ? a : b)[0];

        return {
            assetCategory: winningCategory,
            peggedAsset: winningPeggedAsset === 'none' ? null : winningPeggedAsset
        };
    }

    /**
     * Resolve conflict using most specific classification
     * @private
     * @param {Map} classifications - Asset classifications by source
     * @returns {Object} Most specific classification
     */
    _resolveMostSpecific(classifications) {
        const specificityOrder = {
            'Stablecoin': 2,
            'Tokenized Asset': 2,
            'Other': 1
        };

        let mostSpecific = null;
        let highestSpecificity = 0;

        for (const [source, data] of classifications) {
            const { assetCategory, peggedAsset } = data.classification;
            
            let specificity = specificityOrder[assetCategory] || 0;
            
            // Bonus for having specific pegged asset
            if (peggedAsset && peggedAsset !== 'none') {
                specificity += 1;
            }

            if (specificity > highestSpecificity) {
                highestSpecificity = specificity;
                mostSpecific = data.classification;
            }
        }

        return mostSpecific;
    }

    /**
     * Resolve conflict using newest-first strategy
     * @private
     * @param {Map} classifications - Asset classifications by source
     * @returns {Object} Most recent classification
     */
    _resolveNewestFirst(classifications) {
        let newestClassification = null;
        let newestTimestamp = 0;

        for (const [source, data] of classifications) {
            if (data.timestamp > newestTimestamp) {
                newestTimestamp = data.timestamp;
                newestClassification = data.classification;
            }
        }

        return newestClassification;
    }

    /**
     * Generate alerts based on current metrics and thresholds
     * @private
     * @returns {Array} Array of active alerts
     */
    _generateAlerts() {
        const alerts = [];
        const now = Date.now();

        // Success rate alert
        const successRate = this._getSuccessRate();
        if (successRate < 0.8) {
            alerts.push({
                id: 'classification_success_rate',
                severity: successRate < 0.5 ? 'critical' : 'warning',
                title: 'Low Classification Success Rate',
                message: `Classification success rate is ${(successRate * 100).toFixed(1)}%`,
                timestamp: now,
                threshold: '80%',
                actual: `${(successRate * 100).toFixed(1)}%`
            });
        }

        // Performance alert
        if (this._metrics.classifications.averageDurationMs > 100) {
            alerts.push({
                id: 'classification_performance',
                severity: this._metrics.classifications.averageDurationMs > 500 ? 'critical' : 'warning',
                title: 'Slow Classification Performance',
                message: `Average classification time is ${this._metrics.classifications.averageDurationMs.toFixed(1)}ms`,
                timestamp: now,
                threshold: '100ms',
                actual: `${this._metrics.classifications.averageDurationMs.toFixed(1)}ms`
            });
        }

        // Unknown patterns alert
        if (this._metrics.classifications.unknownPatterns.size > 20) {
            alerts.push({
                id: 'unknown_patterns',
                severity: 'warning',
                title: 'High Number of Unknown Patterns',
                message: `${this._metrics.classifications.unknownPatterns.size} unknown asset patterns detected`,
                timestamp: now,
                threshold: '20 patterns',
                actual: `${this._metrics.classifications.unknownPatterns.size} patterns`
            });
        }

        // Conflict rate alert
        const conflictSummary = this.getConflictSummary();
        if (conflictSummary.conflictRate > 0.1) {
            alerts.push({
                id: 'high_conflict_rate',
                severity: conflictSummary.conflictRate > 0.3 ? 'critical' : 'warning',
                title: 'High Classification Conflict Rate',
                message: `${(conflictSummary.conflictRate * 100).toFixed(1)}% of assets have conflicts`,
                timestamp: now,
                threshold: '10%',
                actual: `${(conflictSummary.conflictRate * 100).toFixed(1)}%`
            });
        }

        return alerts;
    }

    /**
     * Calculate overall health score
     * @private
     * @returns {Object} Overall health assessment
     */
    _calculateOverallHealth() {
        const successRate = this._getSuccessRate();
        const conflictRate = this.getConflictSummary().conflictRate;
        const schemaHealth = this.getSchemaMonitoringSummary().overallHealth;
        
        let score = 100;
        
        // Deduct for low success rate
        score -= (1 - successRate) * 40;
        
        // Deduct for high conflict rate
        score -= conflictRate * 30;
        
        // Deduct for schema issues
        if (schemaHealth === 'degraded') score -= 10;
        if (schemaHealth === 'critical') score -= 25;
        
        // Deduct for performance issues
        if (this._metrics.classifications.averageDurationMs > 100) {
            score -= Math.min(this._metrics.classifications.averageDurationMs / 10, 20);
        }

        score = Math.max(0, Math.round(score));
        
        let status = 'healthy';
        if (score < 50) status = 'critical';
        else if (score < 75) status = 'degraded';
        
        return { status, score };
    }

    /**
     * Get performance health assessment
     * @private
     * @returns {Object} Performance health
     */
    _getPerformanceHealth() {
        const avgDuration = this._metrics.classifications.averageDurationMs;
        const successRate = this._getSuccessRate();
        
        let status = 'healthy';
        if (avgDuration > 500 || successRate < 0.5) status = 'critical';
        else if (avgDuration > 100 || successRate < 0.8) status = 'degraded';
        
        return {
            status,
            averageResponseTime: avgDuration,
            successRate: successRate,
            throughput: this._metrics.classifications.total
        };
    }

    /**
     * Get data quality health assessment
     * @private
     * @returns {Object} Data quality health
     */
    _getDataQualityHealth() {
        const conflictRate = this.getConflictSummary().conflictRate;
        const schemaHealth = this.getSchemaMonitoringSummary().overallHealth;
        const unknownPatterns = this._metrics.classifications.unknownPatterns.size;
        
        let status = 'healthy';
        if (conflictRate > 0.3 || schemaHealth === 'critical' || unknownPatterns > 50) {
            status = 'critical';
        } else if (conflictRate > 0.1 || schemaHealth === 'degraded' || unknownPatterns > 20) {
            status = 'degraded';
        }
        
        return {
            status,
            conflictRate,
            schemaCompliance: schemaHealth,
            unknownPatterns
        };
    }

    /**
     * Get operational status
     * @private
     * @returns {Object} Operational status
     */
    _getOperationalStatus() {
        const alerts = this._generateAlerts();
        const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
        const warningAlerts = alerts.filter(a => a.severity === 'warning').length;
        
        let status = 'operational';
        if (criticalAlerts > 0) status = 'critical';
        else if (warningAlerts > 2) status = 'degraded';
        
        return {
            status,
            criticalAlerts,
            warningAlerts,
            totalAlerts: alerts.length,
            uptime: Date.now() - this._metrics.classifications.lastReset
        };
    }
    
    /**
     * Perform memory cleanup if approaching limits
     * @private
     */
    _performMemoryCleanupIfNeeded() {
        const memUsage = process.memoryUsage();
        if (memUsage.heapUsed > this._conflictTracking.globalMemoryLimit) {
            // Clear oldest entries from all maps
            const mapsToClean = [
                this._conflictTracking.classifications,
                this._conflictTracking.conflicts,
                this._conflictTracking.resolutions,
                this._schemaManager.violations,
                this._schemaManager.unknownAttributes
            ];
            
            mapsToClean.forEach(map => {
                if (map.size > 10) {
                    // Keep only recent 10 entries
                    const entries = Array.from(map.entries());
                    const toKeep = entries.slice(-10);
                    map.clear();
                    toKeep.forEach(([k, v]) => map.set(k, v));
                }
            });
            
            // Clear unknown patterns if too large
            if (this._metrics.classifications.unknownPatterns.size > 100) {
                const patterns = Array.from(this._metrics.classifications.unknownPatterns);
                this._metrics.classifications.unknownPatterns.clear();
                patterns.slice(-50).forEach(p => this._metrics.classifications.unknownPatterns.add(p));
            }
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }
            
            this.logger.info('Memory cleanup performed', {
                beforeMB: Math.round(memUsage.heapUsed / 1024 / 1024),
                limitMB: Math.round(this._conflictTracking.globalMemoryLimit / 1024 / 1024)
            });
        }
    }
    
    /**
     * Check if a pegged asset represents a fiat currency (not commodity/tokenized)
     * @param {string|null|undefined} peggedAsset - The pegged asset identifier
     * @returns {boolean} True if the asset is backed by a fiat currency
     */
    isFiatBacked(peggedAsset) {
        // Null/undefined typically means generic USD stablecoin
        if (!peggedAsset) {
            return true;
        }
        
        // Normalize to uppercase for comparison
        const normalized = String(peggedAsset).toUpperCase().trim();
        
        // Check if it's directly an ISO currency code
        if (this._isoCurrencyCodes.has(normalized)) {
            return true;
        }
        
        // Check if it maps to an ISO currency through aliases
        const aliased = this._currencyAliasMap[normalized];
        if (aliased && this._isoCurrencyCodes.has(aliased.toUpperCase())) {
            return true;
        }
        
        // Common non-fiat assets to explicitly exclude
        const nonFiatAssets = [
            'GOLD', 'SILVER', 'PLATINUM', 'PALLADIUM',
            'OIL', 'CRUDE', 'PETROLEUM', 'NATURAL GAS',
            'STOCKS', 'STOCK', 'EQUITY', 'EQUITIES',
            'ETF', 'ETFS', 'EXCHANGE-TRADED FUND',
            'REAL ESTATE', 'PROPERTY', 'REIT',
            'TREASURY BILLS', 'T-BILLS', 'BONDS',
            'COMMODITIES', 'COMMODITY',
            'SPECIAL DRAWING RIGHTS', 'XDR', 'SDR',
            'BITCOIN', 'BTC', 'ETHEREUM', 'ETH', 'CRYPTO'
        ];
        
        // Check if it matches any non-fiat asset
        if (nonFiatAssets.includes(normalized)) {
            return false;
        }
        
        // Check if it contains non-fiat keywords
        const nonFiatKeywords = ['GOLD', 'SILVER', 'STOCK', 'ETF', 'COMMODITY', 'ESTATE', 'TREASURY', 'BITCOIN', 'ETHEREUM'];
        for (const keyword of nonFiatKeywords) {
            if (normalized.includes(keyword)) {
                return false;
            }
        }
        
        // Default to false for unrecognized assets (conservative approach)
        return false;
    }
}

module.exports = AssetClassifier;
