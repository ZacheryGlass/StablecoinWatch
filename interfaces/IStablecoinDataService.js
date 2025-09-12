/**
 * Interface for the main stablecoin data service
 * Provides high-level API for accessing aggregated stablecoin data
 */
class IStablecoinDataService {
    constructor() {
        if (this.constructor === IStablecoinDataService) {
            throw new Error('Cannot instantiate interface IStablecoinDataService directly');
        }
    }

    /**
     * Get all stablecoins with aggregated data from multiple sources
     * @returns {Promise<Array<AggregatedStablecoin>>} Array of stablecoins with merged data
     */
    async getStablecoins() {
        throw new Error('Method getStablecoins() must be implemented');
    }

    /**
     * Get a specific stablecoin by symbol or ID
     * @param {string} identifier - Symbol or ID to search for
     * @returns {Promise<AggregatedStablecoin|null>} Stablecoin data or null if not found
     */
    async getStablecoin(identifier) {
        throw new Error('Method getStablecoin() must be implemented');
    }

    /**
     * Get platform/blockchain data aggregated across all stablecoins
     * @returns {Promise<Array<PlatformData>>} Platform statistics
     */
    async getPlatformData() {
        throw new Error('Method getPlatformData() must be implemented');
    }

    /**
     * Get overall market metrics (total market cap, volume, etc.)
     * @returns {Promise<MarketMetrics>} Aggregated market data
     */
    async getMarketMetrics() {
        throw new Error('Method getMarketMetrics() must be implemented');
    }

    /**
     * Get service health status including all data sources
     * @returns {Promise<ServiceHealth>} Overall service health
     */
    async getHealthStatus() {
        throw new Error('Method getHealthStatus() must be implemented');
    }

    /**
     * Refresh data from all configured sources
     * @returns {Promise<RefreshResult>} Result of refresh operation
     */
    async refreshData() {
        throw new Error('Method refreshData() must be implemented');
    }

    /**
     * Get data freshness information
     * @returns {Promise<DataFreshness>} Information about when data was last updated
     */
    async getDataFreshness() {
        throw new Error('Method getDataFreshness() must be implemented');
    }

    /**
     * Get list of configured data sources and their status
     * @returns {Promise<Array<DataSourceStatus>>} Status of all data sources
     */
    async getDataSources() {
        throw new Error('Method getDataSources() must be implemented');
    }
}

/**
 * Aggregated stablecoin with merged data from multiple sources
 * @typedef {Object} AggregatedStablecoin
 * @property {string} id - Primary identifier
 * @property {string} name - Stablecoin name
 * @property {string} symbol - Symbol
 * @property {string} slug - URL-safe identifier
 * @property {string} imageUrl - Logo URL
 * @property {AggregatedMarketData} marketData - Market data (price, mcap, volume)
 * @property {AggregatedSupplyData} supplyData - Supply information
 * @property {Array<NormalizedPlatform>} platforms - Blockchain platforms
 * @property {AggregatedMetadata} metadata - Merged metadata
 * @property {DataConfidence} confidence - Confidence scores for different data types
 * @property {Array<string>} dataSources - Which sources provided data for this coin
 * @property {number} lastUpdated - When this data was last refreshed
 * @property {DataQuality} quality - Data quality indicators
 */

/**
 * Aggregated market data with source attribution
 * @typedef {Object} AggregatedMarketData
 * @property {number} price - Consensus price from multiple sources
 * @property {string} priceSource - Primary source for price data
 * @property {number} marketCap - Consensus market cap
 * @property {string} marketCapSource - Primary source for market cap
 * @property {number} volume24h - 24h volume
 * @property {string} volumeSource - Primary source for volume
 * @property {number} percentChange24h - 24h price change
 * @property {number} rank - Market cap ranking
 * @property {Object} sourcePrices - Price from each source for comparison
 */

/**
 * Aggregated supply data
 * @typedef {Object} AggregatedSupplyData
 * @property {number} circulating - Circulating supply
 * @property {string} circulatingSource - Source for circulating supply
 * @property {number} total - Total supply
 * @property {string} totalSource - Source for total supply
 * @property {number} max - Maximum supply
 * @property {Array<CrossChainSupply>} networkBreakdown - Supply breakdown by network
 */

/**
 * Cross-chain supply information
 * @typedef {Object} CrossChainSupply
 * @property {string} platform - Platform name (normalized)
 * @property {string} network - Network identifier
 * @property {number} supply - Supply on this network
 * @property {number} percentage - Percentage of total supply
 * @property {string} contractAddress - Contract address if applicable
 * @property {string} source - Which API provided this data
 */

/**
 * Normalized platform information
 * @typedef {Object} NormalizedPlatform
 * @property {string} name - Standardized platform name
 * @property {string} displayName - Display name for UI
 * @property {string} slug - URL-safe identifier
 * @property {string} category - Platform category (L1, L2, sidechain, etc.)
 * @property {Array<string>} aliases - Alternative names for this platform
 */

/**
 * Data confidence scores
 * @typedef {Object} DataConfidence
 * @property {number} overall - Overall confidence (0-1)
 * @property {number} marketData - Market data confidence
 * @property {number} supplyData - Supply data confidence
 * @property {number} platformData - Platform data confidence
 * @property {number} sourceCount - Number of sources providing data
 * @property {number} consensus - Consensus level between sources (0-1)
 */

/**
 * Data quality indicators
 * @typedef {Object} DataQuality
 * @property {boolean} hasRecentData - Data is fresh (< threshold)
 * @property {boolean} hasMultipleSources - Multiple sources confirm data
 * @property {boolean} hasMarketData - Has complete market data
 * @property {boolean} hasSupplyData - Has supply information
 * @property {Array<string>} warnings - Data quality warnings
 * @property {Array<string>} missingFields - List of missing data fields
 */

/**
 * Platform aggregated data
 * @typedef {Object} PlatformData
 * @property {string} name - Platform name
 * @property {string} slug - URL-safe identifier
 * @property {number} totalMarketCap - Total market cap of stablecoins on this platform
 * @property {number} stablecoinCount - Number of stablecoins on this platform
 * @property {number} percentageOfTotal - Percentage of total stablecoin market
 * @property {Array<TopStablecoin>} topStablecoins - Top stablecoins by market cap
 * @property {PlatformMetrics} metrics - Platform-specific metrics
 */

/**
 * Top stablecoin on platform
 * @typedef {Object} TopStablecoin
 * @property {string} symbol - Stablecoin symbol
 * @property {string} name - Stablecoin name
 * @property {number} marketCap - Market cap on this platform
 * @property {number} supply - Supply on this platform
 */

/**
 * Platform metrics
 * @typedef {Object} PlatformMetrics
 * @property {number} averagePrice - Average price across stablecoins
 * @property {number} totalVolume - Total 24h volume
 * @property {number} dominanceScore - Platform dominance score
 */

/**
 * Overall market metrics
 * @typedef {Object} MarketMetrics
 * @property {number} totalMarketCap - Total stablecoin market cap
 * @property {string} totalMarketCapFormatted - Formatted market cap string
 * @property {number} totalVolume - Total 24h volume
 * @property {string} totalVolumeFormatted - Formatted volume string
 * @property {number} stablecoinCount - Total number of tracked stablecoins
 * @property {number} platformCount - Total number of platforms
 * @property {TopStablecoinsByMarketCap} topByMarketCap - Top stablecoins
 * @property {DominanceBreakdown} dominance - Market dominance breakdown
 * @property {number} lastUpdated - When metrics were calculated
 */

/**
 * Service health status
 * @typedef {Object} ServiceHealth
 * @property {boolean} healthy - Overall service health
 * @property {number} dataFreshness - How fresh data is (ms since last update)
 * @property {Array<DataSourceHealth>} sources - Health of each data source
 * @property {ServiceMetrics} metrics - Service performance metrics
 * @property {Array<string>} warnings - Any warnings or issues
 * @property {string} status - Overall status (healthy, degraded, critical)
 */

/**
 * Data refresh result
 * @typedef {Object} RefreshResult
 * @property {boolean} success - Whether refresh succeeded
 * @property {number} stablecoinsUpdated - Number of stablecoins updated
 * @property {number} duration - Refresh duration in ms
 * @property {Array<SourceRefreshResult>} sourceResults - Results per source
 * @property {Array<string>} errors - Any errors encountered
 * @property {number} timestamp - When refresh completed
 */

/**
 * Source refresh result
 * @typedef {Object} SourceRefreshResult
 * @property {string} sourceId - Data source identifier
 * @property {boolean} success - Whether this source succeeded
 * @property {number} recordCount - Number of records fetched
 * @property {number} duration - Fetch duration in ms
 * @property {string} error - Error message if failed
 */

/**
 * Data freshness information
 * @typedef {Object} DataFreshness
 * @property {number} lastUpdate - Last successful update timestamp
 * @property {number} age - Data age in milliseconds
 * @property {boolean} isStale - Whether data is considered stale
 * @property {number} nextUpdate - When next update is scheduled
 * @property {Array<SourceFreshness>} sources - Freshness per source
 */

/**
 * Source freshness
 * @typedef {Object} SourceFreshness
 * @property {string} sourceId - Data source identifier
 * @property {number} lastSuccess - Last successful fetch
 * @property {number} age - Age of data from this source
 * @property {boolean} isStale - Whether this source data is stale
 */

/**
 * Data source status
 * @typedef {Object} DataSourceStatus
 * @property {string} sourceId - Source identifier
 * @property {string} sourceName - Human readable name
 * @property {boolean} configured - Whether properly configured
 * @property {boolean} healthy - Current health status
 * @property {DataSourceCapabilities} capabilities - What this source provides
 * @property {number} priority - Priority in data merging
 * @property {RateLimitStatus} rateLimit - Current rate limit status
 */

/**
 * Rate limit status
 * @typedef {Object} RateLimitStatus
 * @property {number} remaining - Requests remaining
 * @property {number} limit - Total request limit
 * @property {number} resetTime - When limit resets
 * @property {boolean} exceeded - Whether limit is exceeded
 */

module.exports = IStablecoinDataService;