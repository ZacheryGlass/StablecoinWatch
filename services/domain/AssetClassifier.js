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
     */
    constructor(config = {}) {
        this.config = config;
        
        // Pre-compile performance-critical lookups
        this._initializeTagSets();
        this._initializePatterns();
        
        // Classification constants
        this.ASSET_CATEGORIES = {
            STABLECOIN: 'Stablecoin',
            TOKENIZED_ASSET: 'Tokenized Asset', 
            OTHER: 'Other'
        };
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
     * @param {Object} asset - Asset data to classify
     * @param {Array<string>} asset.tags - Classification tags from source
     * @param {string} asset.name - Asset name
     * @param {string} asset.symbol - Asset symbol
     * @param {string} asset.slug - Asset slug
     * @returns {Object} Classification result
     * @returns {string} returns.assetCategory - Primary asset category
     * @returns {string|null} returns.peggedAsset - Specific pegged asset type or null
     */
    classify({ tags = [], name = '', symbol = '', slug = '' }) {
        // Normalize inputs for consistent matching
        const tagsLower = this._normalizeTags(tags);
        const nameLower = String(name).toLowerCase();
        const symbolLower = String(symbol).toLowerCase();
        const slugLower = String(slug).toLowerCase();
        
        // Determine primary asset category
        const assetCategory = this._classifyCategory(tagsLower);
        
        // Determine specific pegged asset type
        const peggedAsset = this._classifyPeggedAsset(tagsLower, nameLower, symbolLower, slugLower);
        
        return {
            assetCategory,
            peggedAsset
        };
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
        
        // Check for tokenized asset tags
        if (tagsLower.some(tag => this._tokenizedAssetTags.has(tag))) {
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
    _classifyPeggedAsset(tagsLower, nameLower, symbolLower, slugLower) {
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
        
        // Asset-backed stablecoins
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
     * Get current configuration summary
     * @returns {Object} Configuration summary for debugging
     */
    getConfigSummary() {
        return {
            enabled: this.isEnabled(),
            stablecoinTagCount: this._stablecoinTags.size,
            tokenizedAssetTagCount: this._tokenizedAssetTags.size,
            tokenizedSubtypeCount: this._tokenizedSubtypes.size,
            assetBackedTagCount: this._assetBackedTags.size
        };
    }
}

module.exports = AssetClassifier;