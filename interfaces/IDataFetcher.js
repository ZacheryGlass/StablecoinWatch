/**
 * Interface for pluggable data source fetchers
 * Designed to support multiple APIs: CMC, Messari, CoinGecko, DeFiLlama, etc.
 * 
 * ASSET CLASSIFICATION FIELDS:
 * 
 * This interface has been extended to support asset classification as part of the
 * centralized classification system (AssetClassifier domain service).
 * 
 * New fields:
 * - StandardizedStablecoin.assetCategory: Primary category ('Stablecoin', 'Tokenized Asset', 'Other')
 * - MetadataInfo.peggedAsset: Specific pegged asset type ('Gold', 'Silver', 'ETF', etc.)
 * - MetadataInfo.assetClassification: Classification metadata (confidence, method, etc.)
 * 
 * Usage in data fetchers:
 * 1. Use AssetClassifier.classify() in transformToStandardFormat()
 * 2. Set assetCategory from classification result
 * 3. Set metadata.peggedAsset from classification result
 * 4. Optionally populate assetClassification metadata
 * 
 * Backward compatibility:
 * - All new fields are optional (| null)
 * - Existing consumers continue working unchanged
 * - New consumers can opt-in to classification features
 */
class IDataFetcher {
    constructor() {
        if (this.constructor === IDataFetcher) {
            throw new Error('Cannot instantiate interface IDataFetcher directly');
        }
    }

    /**
     * Get the unique identifier for this data source
     * @returns {string} Source identifier (e.g., 'cmc', 'messari', 'coingecko')
     */
    getSourceId() {
        throw new Error('Method getSourceId() must be implemented');
    }

    /**
     * Get display name for this data source
     * @returns {string} Human readable name
     */
    getSourceName() {
        throw new Error('Method getSourceName() must be implemented');
    }

    /**
     * Check if this fetcher is properly configured and ready to use
     * @returns {boolean} True if configured with required API keys/settings
     */
    isConfigured() {
        throw new Error('Method isConfigured() must be implemented');
    }

    /**
     * Fetch raw stablecoin data from this source
     * @returns {Promise<Array>} Array of raw stablecoin objects from this API
     */
    async fetchStablecoins() {
        throw new Error('Method fetchStablecoins() must be implemented');
    }

    /**
     * Get the capabilities of this data source
     * @returns {DataSourceCapabilities} Object describing what data this source provides
     */
    getCapabilities() {
        throw new Error('Method getCapabilities() must be implemented');
    }

    /**
     * Get health status of this data source
     * @returns {Promise<DataSourceHealth>} Health information
     */
    async getHealthStatus() {
        throw new Error('Method getHealthStatus() must be implemented');
    }

    /**
     * Transform raw data from this source into standardized format
     * @param {Array} rawData - Raw data from fetchStablecoins()
     * @returns {Array<StandardizedStablecoin>} Standardized stablecoin objects
     */
    transformToStandardFormat(rawData) {
        throw new Error('Method transformToStandardFormat() must be implemented');
    }

    /**
     * Get rate limit information for this source
     * @returns {RateLimitInfo} Rate limiting details
     */
    getRateLimitInfo() {
        throw new Error('Method getRateLimitInfo() must be implemented');
    }
}

/**
 * Data source capabilities - what data this source can provide
 * @typedef {Object} DataSourceCapabilities
 * @property {boolean} hasMarketData - Provides price, market cap, volume
 * @property {boolean} hasSupplyData - Provides circulating/total supply
 * @property {boolean} hasPlatformData - Provides blockchain platform info
 * @property {boolean} hasNetworkBreakdown - Provides cross-chain supply breakdown
 * @property {boolean} hasMetadata - Provides descriptions, tags, etc.
 * @property {number} priority - Priority for data merging (higher = preferred)
 * @property {Array<string>} dataTypes - Specific data types this source excels at
 */

/**
 * Data source health status
 * @typedef {Object} DataSourceHealth
 * @property {boolean} healthy - Overall health status
 * @property {number} responseTime - Last response time in ms
 * @property {number} successRate - Success rate (0-1) over recent requests
 * @property {number} lastSuccessfulFetch - Timestamp of last successful fetch
 * @property {string} errorMessage - Last error message if any
 * @property {number} rateLimitRemaining - Remaining API calls
 * @property {number} rateLimitReset - When rate limit resets (timestamp)
 */

/**
 * Rate limit information
 * @typedef {Object} RateLimitInfo
 * @property {number} requestsPerMinute - Requests allowed per minute
 * @property {number} requestsPerHour - Requests allowed per hour
 * @property {number} requestsPerDay - Requests allowed per day
 * @property {number} burstLimit - Max burst requests
 * @property {number} currentUsage - Current usage count
 */

/**
 * Standardized stablecoin object - common format for all sources
 * @typedef {Object} StandardizedStablecoin
 * @property {string} sourceId - Which API provided this data
 * @property {string} id - Unique identifier from source
 * @property {string} name - Stablecoin name
 * @property {string} symbol - Stablecoin symbol
 * @property {string} slug - URL-safe identifier
 * @property {string|null} assetCategory - Primary asset category ('Stablecoin', 'Tokenized Asset', 'Other', or null)
 * @property {MarketData} marketData - Price, market cap, volume data
 * @property {SupplyData} supplyData - Supply information
 * @property {Array<PlatformInfo>} platforms - Blockchain platforms
 * @property {MetadataInfo} metadata - Additional info (tags, description, classification, etc.)
 * @property {number} confidence - Confidence score for this data (0-1)
 * @property {number} timestamp - When this data was fetched
 */

/**
 * Market data structure
 * @typedef {Object} MarketData
 * @property {number} price - Current price in USD
 * @property {number} marketCap - Market capitalization
 * @property {number} volume24h - 24h trading volume
 * @property {number} percentChange24h - 24h price change percentage
 * @property {number} rank - Market cap ranking
 */

/**
 * Supply data structure
 * @typedef {Object} SupplyData
 * @property {number} circulating - Circulating supply
 * @property {number} total - Total supply
 * @property {number} max - Maximum supply
 * @property {Array<NetworkBreakdownEntry>} networkBreakdown - Cross-chain breakdown (optional)
 */

/**
 * Cross-chain supply breakdown entry
 * @typedef {Object} NetworkBreakdownEntry
 * @property {string} name - Platform name (e.g., 'Ethereum')
 * @property {string} network - Network identifier/slug (e.g., 'eth', 'ethereum')
 * @property {string} contractAddress - Token contract address on the network (if available)
 * @property {number} supply - Supply on this network (if available)
 * @property {number} percentage - Percentage share of total (if available)
 */

/**
 * Platform information
 * @typedef {Object} PlatformInfo
 * @property {string} name - Platform name (normalized)
 * @property {string} network - Network identifier
 * @property {string} contractAddress - Token contract address
 * @property {number} supply - Supply on this platform (if available)
 * @property {number} percentage - Percentage of total supply (if available)
 */

/**
 * Metadata information
 * @typedef {Object} MetadataInfo
 * @property {Array<string>} tags - Classification tags
 * @property {string} description - Description text
 * @property {string} website - Official website
 * @property {string} logoUrl - Logo image URL
 * @property {string} dateAdded - When added to tracking
 * @property {string|null} peggedAsset - Specific pegged asset type ('Gold', 'Silver', 'ETF', 'Stocks', 'Real Estate', 'Treasury Bills', 'Commodities', or null)
 * @property {AssetClassificationInfo|null} assetClassification - Asset classification metadata (confidence, method, etc.)
 */

/**
 * Asset classification metadata
 * @typedef {Object} AssetClassificationInfo
 * @property {number} confidence - Classification confidence score (0-1)
 * @property {string} source - Source of classification ('AssetClassifier', 'manual', etc.)
 * @property {string} method - Classification method used ('tag', 'pattern', 'heuristic', 'fallback')
 * @property {number} timestamp - When classification was performed
 */

/**
 * ASSET CLASSIFICATION VALUES:
 * 
 * assetCategory values:
 * - 'Stablecoin': Fiat-pegged stablecoins (USDT, USDC, BUSD, etc.)
 * - 'Tokenized Asset': Real-world asset tokens (PAXG, tokenized stocks, etc.)
 * - 'Other': Assets that don't fit the above categories
 * - null: Classification unavailable or disabled
 * 
 * peggedAsset values:
 * - 'Gold': Gold-backed tokens (PAXG, XAUT, etc.)
 * - 'Silver': Silver-backed tokens
 * - 'ETF': Exchange-traded fund tokens
 * - 'Stocks': Equity-backed tokens
 * - 'Real Estate': Property-backed tokens
 * - 'Treasury Bills': Government bond tokens
 * - 'Commodities': General commodity-backed tokens
 * - 'Tokenized Asset': Generic tokenized asset (fallback)
 * - null: Not a tokenized/pegged asset or classification unavailable
 * 
 * Classification method values:
 * - 'tag': Detected via API tags (highest confidence)
 * - 'pattern': Detected via symbol/name pattern matching
 * - 'heuristic': Detected via name/description heuristics
 * - 'fallback': Default classification applied
 * 
 * Example StandardizedStablecoin with classification:
 * {
 *   sourceId: 'cmc',
 *   id: '1027',
 *   name: 'PAX Gold',
 *   symbol: 'PAXG',
 *   slug: 'pax-gold',
 *   assetCategory: 'Tokenized Asset',
 *   marketData: { price: 1800.50, ... },
 *   supplyData: { circulating: 245000, ... },
 *   platforms: [...],
 *   metadata: {
 *     tags: ['tokenized-gold', 'commodity'],
 *     description: 'Gold-backed cryptocurrency',
 *     peggedAsset: 'Gold',
 *     assetClassification: {
 *       confidence: 0.95,
 *       source: 'AssetClassifier',
 *       method: 'tag',
 *       timestamp: 1640995200000
 *     }
 *   },
 *   confidence: 0.85,
 *   timestamp: 1640995200000
 * }
 */

module.exports = IDataFetcher;
