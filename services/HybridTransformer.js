const Stablecoin = require('../models/stablecoin');
const IViewModelTransformer = require('../interfaces/IViewModelTransformer');
const DataFormatter = require('./formatters/DataFormatter');
const PlatformNormalizer = require('./formatters/PlatformNormalizer');
const SourceDataPopulator = require('./formatters/SourceDataPopulator');

/**
 * Transforms and standardizes hybrid stablecoin data for view layer consumption.
 * Orchestrates data transformation using specialized formatter classes following
 * the Single Responsibility Principle. Implements IViewModelTransformer interface
 * for loose coupling with service layer.
 * 
 * @class HybridTransformer
 * @extends {IViewModelTransformer}
 */
class HybridTransformer extends IViewModelTransformer {
    /**
     * Creates an instance of HybridTransformer.
     * Initializes formatter dependencies and internal state for stablecoins and metrics.
     * 
     * @param {Object} [config={}] - Configuration options for the transformer
     * @memberof HybridTransformer
     */
    constructor(config = {}) {
        super();
        this.stablecoins = [];
        this.metrics = { totalMCap: 0, totalVolume: 0, lastUpdated: null };
        this.config = config;
        
        // Initialize formatter dependencies
        this.dataFormatter = new DataFormatter();
        this.platformNormalizer = new PlatformNormalizer();
        this.sourceDataPopulator = new SourceDataPopulator();
    }

    /**
     * Transforms hybrid stablecoin data into standardized view model format.
     * Orchestrates the transformation workflow using specialized formatters while
     * maintaining the exact same interface and behavior as the original implementation.
     * 
     * @param {Array} hybridStablecoins - Array of hybrid stablecoin data objects from aggregation service
     * @memberof HybridTransformer
     */
    transformHybridData(hybridStablecoins) {
        this.stablecoins = [];
        this.metrics.totalMCap = 0;
        this.metrics.totalVolume = 0;

        for (const hybrid of (hybridStablecoins || [])) {
            if (!hybrid) continue;

            const stablecoin = this._createStablecoinFromHybrid(hybrid);
            if (stablecoin) {
                this._updateMetrics(hybrid);
                this.stablecoins.push(stablecoin);
            }
        }

        this._sortStablecoinsByMarketCap();
    }

    /**
     * Creates a Stablecoin model instance from hybrid data using formatters.
     * Enhanced to populate DeFiLlama cross-chain supply data and calculate dominant chains.
     * 
     * @param {Object} hybrid - Hybrid stablecoin data object
     * @returns {Stablecoin|null} Processed Stablecoin instance or null if invalid
     * @private
     * @memberof HybridTransformer
     */
    _createStablecoinFromHybrid(hybrid) {
        if (!this.sourceDataPopulator.isValidHybridData(hybrid)) {
            return null;
        }

        const sc = new Stablecoin();
        
        // Basic identification
        sc.name = hybrid.name || '';
        sc.symbol = hybrid.symbol || '';
        sc.uri = (hybrid.slug || hybrid.symbol || '').toLowerCase();
        sc.img_url = this.sourceDataPopulator.getCoinImageUrl(hybrid);

        // Platform extraction (now prioritizes DeFiLlama data)
        sc.platforms = this.platformNormalizer.extractPlatformsFromHybrid(hybrid);

        // Enhanced cross-chain supply breakdown
        this._populateCrossChainData(sc, hybrid);

        // Source-specific containers
        const containers = this.sourceDataPopulator.getAllSourceContainers(hybrid);
        sc.main = containers.main;
        sc.msri = containers.msri;
        sc.scw = containers.scw;
        sc.cmc = containers.cmc;
        sc.cgko = containers.cgko;

        return sc;
    }

    /**
     * Populates cross-chain supply breakdown data from DeFiLlama source.
     * Calculates total cross-chain supply, dominant chain, and detailed breakdown.
     * 
     * @param {Stablecoin} stablecoin - Stablecoin instance to populate
     * @param {Object} hybrid - Hybrid data object with potential DeFiLlama data
     * @private
     * @memberof HybridTransformer
     */
    _populateCrossChainData(stablecoin, hybrid) {
        const defillamaData = hybrid.defillamaData || hybrid.metadata?.defillamaData;
        
        if (!defillamaData?.rawChainCirculating) {
            return; // No DeFiLlama data available
        }

        // Store raw DeFiLlama data
        stablecoin.defillamaData = defillamaData;

        // Calculate total cross-chain supply
        const chainCirculating = defillamaData.rawChainCirculating;
        let totalSupply = 0;
        let dominantChainSupply = 0;
        let dominantChainName = null;
        const breakdown = {};

        for (const [chainName, chainData] of Object.entries(chainCirculating)) {
            if (!chainData?.current) continue;

            const chainSupply = chainData.current.peggedUSD || 
                              chainData.current.peggedEUR || 
                              Object.values(chainData.current)[0] || 
                              null;

            if (!chainSupply || chainSupply <= 0) continue;

            const normalizedChainName = this.platformNormalizer.normalizePlatformName(chainName);
            
            breakdown[normalizedChainName] = {
                supply: chainSupply,
                percentage: 0, // Will be calculated after totalSupply is known
                historical: {
                    prevDay: chainData.circulatingPrevDay || null,
                    prevWeek: chainData.circulatingPrevWeek || null,
                    prevMonth: chainData.circulatingPrevMonth || null
                }
            };

            totalSupply += chainSupply;

            // Track dominant chain
            if (chainSupply > dominantChainSupply) {
                dominantChainSupply = chainSupply;
                dominantChainName = normalizedChainName;
            }
        }

        // Calculate percentages
        if (totalSupply > 0) {
            for (const chainData of Object.values(breakdown)) {
                chainData.percentage = (chainData.supply / totalSupply) * 100;
            }
        }

        // Populate stablecoin fields
        stablecoin.chainSupplyBreakdown = breakdown;
        stablecoin.totalCrossChainSupply = totalSupply;
        stablecoin.dominantChain = dominantChainName;
    }

    /**
     * Updates internal metrics with data from a hybrid stablecoin object.
     * 
     * @param {Object} hybrid - Hybrid stablecoin data object
     * @private
     * @memberof HybridTransformer
     */
    _updateMetrics(hybrid) {
        const mcap = hybrid?.marketData?.marketCap ?? hybrid.market_cap;
        const vol = hybrid?.marketData?.volume24h ?? hybrid.volume_24h;
        if (typeof mcap === 'number') this.metrics.totalMCap += mcap;
        if (typeof vol === 'number') this.metrics.totalVolume += vol;
    }

    /**
     * Sorts stablecoins by market capitalization in descending order.
     * 
     * @private
     * @memberof HybridTransformer
     */
    _sortStablecoinsByMarketCap() {
        this.stablecoins.sort((a, b) => (b.main.circulating_mcap || 0) - (a.main.circulating_mcap || 0));
    }

    /**
     * Calculates aggregated platform data from all processed stablecoins.
     * Uses DataFormatter for consistent number formatting and slug generation.
     * 
     * @returns {Array} Array of platform data objects with totals, counts, and formatted values
     * @memberof HybridTransformer
     */
    calculatePlatformData() {
        const platformMap = new Map();
        
        for (const sc of this.stablecoins) {
            if (!sc?.platforms || !sc?.main?.circulating_mcap) continue;
            // Compute total cross-chain supply for this coin across all known platforms
            const coinSupplyTotal = sc.platforms.reduce((sum, p) => {
                const ps = p.total_supply || p.circulating_supply || 0;
                return sum + (typeof ps === 'number' ? ps : 0);
            }, 0);
            
            for (const platform of sc.platforms) {
                if (!platformMap.has(platform.name)) {
                    platformMap.set(platform.name, { 
                        name: platform.name, 
                        mcap_sum: 0, 
                        coin_count: 0,
                        total_supply: 0,
                        stablecoins: [],
                        supply_breakdown: new Map(),
                        dominant_stablecoin: { name: '', supply: 0 }
                    });
                }
                
                const entry = platformMap.get(platform.name);
                // Allocate only the proportional share of market cap to this platform
                const platformSupply = platform.total_supply || platform.circulating_supply || 0;
                let allocatedMcap = 0;
                if (coinSupplyTotal > 0 && platformSupply > 0) {
                    allocatedMcap = sc.main.circulating_mcap * (platformSupply / coinSupplyTotal);
                } else if (sc.platforms.length === 1) {
                    // If we only have one platform, attribute full mcap to it
                    allocatedMcap = sc.main.circulating_mcap;
                } else {
                    // No reliable supply split info across multiple platforms - skip to avoid double counting
                    allocatedMcap = 0;
                }
                entry.mcap_sum += allocatedMcap;
                entry.coin_count += 1;
                
                // Enhanced supply aggregation using cross-chain data
                // Reuse computed platformSupply
                if (platformSupply > 0) {
                    entry.total_supply += platformSupply;
                    
                    // Track individual stablecoin supplies on this platform
                    if (!entry.supply_breakdown.has(sc.symbol)) {
                        entry.supply_breakdown.set(sc.symbol, {
                            name: sc.name,
                            symbol: sc.symbol,
                            supply: 0,
                            percentage: 0,
                            uri: sc.uri
                        });
                    }
                    
                    const coinEntry = entry.supply_breakdown.get(sc.symbol);
                    coinEntry.supply += platformSupply;
                    
                    // Track dominant stablecoin on this platform
                    if (coinEntry.supply > entry.dominant_stablecoin.supply) {
                        entry.dominant_stablecoin = {
                            name: sc.name,
                            symbol: sc.symbol,
                            supply: coinEntry.supply,
                            uri: sc.uri
                        };
                    }
                }
                
                // Track unique stablecoins on this platform
                if (!entry.stablecoins.find(coin => coin.symbol === sc.symbol)) {
                    entry.stablecoins.push({
                        name: sc.name,
                        symbol: sc.symbol,
                        uri: sc.uri,
                        price: sc.main?.price || null,
                        market_cap: sc.main?.circulating_mcap || null,
                        platform_supply: platformSupply,
                        platform_percentage: platform.supply_percentage || null
                    });
                }
            }
        }

        // Calculate total supply across all platforms for percentage calculations
        let totalSupplyAllPlatforms = 0;
        for (const entry of platformMap.values()) {
            totalSupplyAllPlatforms += entry.total_supply;
        }

        return Array.from(platformMap.values())
            .map(platform => {
                // Convert supply breakdown map to array and calculate percentages
                const supplyBreakdownArray = Array.from(platform.supply_breakdown.values())
                    .map(coin => ({
                        ...coin,
                        percentage: platform.total_supply > 0 ? 
                            Math.round((coin.supply / platform.total_supply) * 10000) / 100 : 0
                    }))
                    .sort((a, b) => b.supply - a.supply);

                return {
                    name: platform.name,
                    uri: DataFormatter.slugify(platform.name),
                    mcap_sum: platform.mcap_sum,
                    mcap_sum_s: DataFormatter.formatNumber(platform.mcap_sum),
                    coin_count: platform.coin_count,
                    total_supply: platform.total_supply,
                    total_supply_s: DataFormatter.formatNumber(platform.total_supply, false),
                    supply_percentage: totalSupplyAllPlatforms > 0 ? 
                        Math.round((platform.total_supply / totalSupplyAllPlatforms) * 10000) / 100 : 0,
                    supply_percentage_s: totalSupplyAllPlatforms > 0 ?
                        `${Math.round((platform.total_supply / totalSupplyAllPlatforms) * 10000) / 100}%` : '0%',
                    stablecoins: platform.stablecoins.sort((a, b) => (b.platform_supply || 0) - (a.platform_supply || 0)),
                    supply_breakdown: supplyBreakdownArray,
                    dominant_stablecoin: platform.dominant_stablecoin.name ? platform.dominant_stablecoin : null
                };
            })
            .sort((a, b) => (b.total_supply || 0) - (a.total_supply || 0));
    }

    /**
     * Gets the array of processed stablecoin objects.
     * 
     * @returns {Array<Stablecoin>} Array of processed Stablecoin model instances
     * @memberof HybridTransformer
     */
    getStablecoins() {
        return this.stablecoins;
    }

    /**
     * Gets complete data object with stablecoins, metrics, and platform data.
     * Maintains backward compatibility with existing interface.
     * 
     * @returns {Object} Complete data object with stablecoins array, metrics, and platform data
     * @memberof HybridTransformer
     */
    getData() {
        return {
            stablecoins: this.stablecoins,
            metrics: this.metrics,
            platform_data: this.calculatePlatformData()
        };
    }

    // IViewModelTransformer interface implementations
    /**
     * Transforms raw aggregated data into standardized view model format.
     * Maps to transformHybridData for interface compliance.
     * 
     * @param {Array} aggregatedData - Array of aggregated data objects from multiple sources
     * @returns {void} Method updates internal state with transformed data
     * @memberof HybridTransformer
     */
    transformData(aggregatedData) {
        return this.transformHybridData(aggregatedData);
    }

    /**
     * Gets the array of transformed data objects.
     * Maps to getStablecoins for interface compliance.
     * 
     * @returns {Array} Array of transformed data objects
     * @memberof HybridTransformer
     */
    getTransformedData() {
        return this.getStablecoins();
    }

    /**
     * Calculates aggregated data for specific view requirements.
     * Maps to calculatePlatformData for interface compliance.
     * 
     * @returns {Array} Array of aggregated data objects
     * @memberof HybridTransformer
     */
    calculateAggregations() {
        return this.calculatePlatformData();
    }

    /**
     * Gets complete transformed data structure for view layer.
     * Maps to getData for interface compliance.
     * 
     * @returns {Object} Complete transformed data structure
     * @memberof HybridTransformer
     */
    getCompleteViewModel() {
        return this.getData();
    }

    /**
     * Resets the internal state of the transformer.
     * Clears cached data to prepare for new transformation cycle.
     * 
     * @returns {void}
     * @memberof HybridTransformer
     */
    reset() {
        this.stablecoins = [];
        this.metrics = { totalMCap: 0, totalVolume: 0, lastUpdated: null };
    }

    /**
     * Validates input data structure before transformation.
     * Checks if the provided data meets transformation requirements.
     * 
     * @param {Array} data - Data array to validate
     * @returns {boolean} True if data is valid for transformation
     * @memberof HybridTransformer
     */
    validateInputData(data) {
        return Array.isArray(data) && data.every(item => 
            item && typeof item === 'object' && (item.name || item.symbol)
        );
    }

    /**
     * Gets metadata about the transformer implementation.
     * Returns information about capabilities and version.
     * 
     * @returns {Object} Transformer metadata
     * @memberof HybridTransformer
     */
    getTransformerInfo() {
        return {
            name: 'HybridTransformer',
            version: '2.0.0',
            capabilities: ['hybrid_data_transformation', 'platform_aggregation', 'view_formatting']
        };
    }

    // Backward compatibility methods - delegate to static formatter methods
    /**
     * Formats numerical values with appropriate units and currency symbols.
     * Delegates to DataFormatter for backward compatibility.
     * 
     * @param {number} num - Numerical value to format
     * @param {boolean} [includeDollarSign=true] - Whether to include dollar sign prefix
     * @returns {string} Formatted number string with appropriate units
     * @memberof HybridTransformer
     */
    formatNumber(num, includeDollarSign = true) {
        return DataFormatter.formatNumber(num, includeDollarSign);
    }

    /**
     * Converts text to URL-friendly slug format.
     * Delegates to DataFormatter for backward compatibility.
     * 
     * @param {string} text - Text to convert to slug
     * @returns {string} URL-friendly slug string
     * @memberof HybridTransformer
     */
    slugify(text) {
        return DataFormatter.slugify(text);
    }

    /**
     * Normalizes platform/blockchain names to standardized display names.
     * Delegates to PlatformNormalizer for backward compatibility.
     * 
     * @param {string} rawName - Raw platform name from API sources
     * @returns {string} Normalized platform name for display
     * @memberof HybridTransformer
     */
    normalizePlatformName(rawName) {
        return this.platformNormalizer.normalizePlatformName(rawName);
    }

    /**
     * Extracts and normalizes platform information from hybrid stablecoin data.
     * Delegates to PlatformNormalizer for backward compatibility.
     * 
     * @param {Object} hybrid - Hybrid stablecoin data object
     * @returns {Array<Platform>} Array of Platform instances
     * @memberof HybridTransformer
     */
    extractPlatformsFromHybrid(hybrid) {
        return this.platformNormalizer.extractPlatformsFromHybrid(hybrid);
    }

    /**
     * Gets the appropriate image URL for a stablecoin.
     * Delegates to SourceDataPopulator for backward compatibility.
     * 
     * @param {Object} hybrid - Hybrid stablecoin data object
     * @returns {string|null} Image URL or null if no image available
     * @memberof HybridTransformer
     */
    getCoinImageUrl(hybrid) {
        return this.sourceDataPopulator.getCoinImageUrl(hybrid);
    }

    /**
     * Generates a descriptive text for a stablecoin.
     * Delegates to SourceDataPopulator for backward compatibility.
     * 
     * @param {Object} hybrid - Hybrid stablecoin data object
     * @returns {string} Generated description text
     * @memberof HybridTransformer
     */
    generateDescription(hybrid) {
        return this.sourceDataPopulator.generateDescription(hybrid);
    }
}

module.exports = HybridTransformer;
