const performance = require('perf_hooks').performance;

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
        
        // Gold detection patterns
        this._goldPatterns = {
            symbols: new RegExp(patterns.goldSymbols || 'xau|paxg|xaut', 'i'),
            names: new RegExp(patterns.goldNames || 'gold', 'i')
        };
        
        // Silver detection patterns  
        this._silverPatterns = {
            symbols: new RegExp(patterns.silverSymbols || 'xag', 'i'),
            names: new RegExp(patterns.silverNames || 'silver', 'i')
        };
        
        // Other asset patterns
        this._assetPatterns = {
            etf: new RegExp(patterns.etf || 'etf', 'i'),
            treasury: new RegExp(patterns.treasury || 'treasury', 'i'),
            stock: new RegExp(patterns.stock || 'stock', 'i'),
            realEstate: new RegExp(patterns.realEstate || 'real estate|real-estate|estate', 'i')
        };
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
        for (const code of this._isoCurrencyCodes) {
            // Pattern matches: USD, USDt, USDC, USD-TOKEN, etc.
            const pattern = new RegExp(`^${code.toLowerCase()}[tc]?\b|\b${code.toLowerCase()}[-_]?(?:token|coin|t)?\b`, 'i');
            this._currencySymbolPatterns.set(code, pattern);
        }

        // Load additional currencies from environment
        this._loadEnvironmentCurrencies();
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

        // 1. Input validation
        if (!asset || typeof asset !== 'object') {
            this.logger.error('Invalid asset input: asset must be an object.', { source, asset });
            return null;
        }

        const { tags = [], name = '', symbol = '', slug = '' } = asset;

        if (!Array.isArray(tags)) {
            this.logger.error('Invalid asset input: tags must be an array.', { source, asset });
            return null;
        }

        // Normalize inputs for consistent matching
        const tagsLower = this._normalizeTags(tags);
        const nameLower = String(name).toLowerCase();
        const symbolLower = String(symbol).toLowerCase();
        const slugLower = String(slug).toLowerCase();

        // Determine primary asset category first (stablecoin takes priority)
        const assetCategory = this._classifyCategory(tagsLower);

        // Determine specific pegged asset type
        const peggedAsset = this._classifyPeggedAsset(tagsLower, nameLower, symbolLower, slugLower, assetCategory);

        const result = {
            assetCategory,
            peggedAsset
        };

        const durationMs = performance.now() - startTime;

        // 3. Structured Decision & Performance Logging
        this.logger.info('Asset classification complete', {
            source,
            input: { symbol, name, tags: tags.slice(0, 10) }, // Limit tags to avoid huge logs
            output: result,
            durationMs: parseFloat(durationMs.toFixed(2)),
        });

        return result;
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
        // Use same patterns as tokenized assets for now
        return this._inferTokenizedAssetType(nameLower, symbolLower, slugLower) || 'Asset-Backed';
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
                    const symbolPattern = new RegExp(`^${upperCode.toLowerCase()}[tc]?\b|\b${upperCode.toLowerCase()}[-_]?(?:token|coin|t)?\b`, 'i');
                    this._currencySymbolPatterns.set(upperCode, symbolPattern);
                    
                    // If name is provided, create name pattern
                    if (name.length > 2) {
                        const namePattern = new RegExp(`\b${name.toLowerCase()}\b`, 'i');
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
            currencySymbolPatternCount: this._currencySymbolPatterns.size
        };
    }
}

module.exports = AssetClassifier;
