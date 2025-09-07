/**
 * Interface for pluggable data source fetchers
 * Designed to support multiple APIs: CMC, Messari, CoinGecko, DeFiLlama, etc.
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
 * @property {MarketData} marketData - Price, market cap, volume data
 * @property {SupplyData} supplyData - Supply information
 * @property {Array<PlatformInfo>} platforms - Blockchain platforms
 * @property {MetadataInfo} metadata - Additional info (tags, description, etc.)
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
 */

module.exports = IDataFetcher;