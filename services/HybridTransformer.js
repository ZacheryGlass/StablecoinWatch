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
        // Pegged asset (e.g., USD, EUR, Gold)
        sc.pegged_asset = hybrid.pegged_asset || null;
        // Asset classification (Stablecoin, Tokenized Asset, etc.)
        sc.assetCategory = hybrid.assetCategory || hybrid.asset_category || null;

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

        // Add view-friendly formatted properties for EJS templates
        sc.price_s = DataFormatter.formatNumber(sc.main.price);
        sc.mcap_s = sc.main.circulating_mcap_s;
        sc.vol_s = sc.main.volume_s;
        // Use supply data from hybrid or scw container
        const supply = hybrid.supplyData?.circulating ?? hybrid.circulating_supply ?? sc.scw.circulating_supply;
        sc.supply_s = DataFormatter.formatNumber(supply, false);

        // Add percentage changes
        sc.change_1d = hybrid.percent_change_24h ?? hybrid.marketData?.percentChange24h ?? 0;
        sc.change_7d = hybrid.percent_change_7d ?? hybrid.marketData?.percentChange7d ?? 0;

        // Propagate any structured conflicts detected during aggregation
        sc.conflicts = hybrid.conflicts || hybrid.metadata?.conflicts || null;

        // Per-source figures for comparison, and which source each merged value came from
        sc.source_snapshots = hybrid.source_snapshots || {};
        sc.value_sources = hybrid.value_sources || {};

        // Peg mechanism and supply history from DeFiLlama
        const defillamaData = hybrid.defillamaData || hybrid.metadata?.defillamaData || null;
        sc.peg_mechanism = defillamaData?.pegMechanism || null;
        sc.supply_change = this._computeSupplyChange(defillamaData);

        return sc;
    }

    /**
     * Computes circulating supply change over 1, 7 and 30 days from DeFiLlama history.
     * Values are percentages; null when the history is missing.
     *
     * @param {Object|null} defillamaData - DeFiLlama data with rawCirculating and previous snapshots
     * @returns {{d1: number|null, d7: number|null, d30: number|null, current: number|null, prevDay: number|null, prevWeek: number|null, prevMonth: number|null}}
     * @private
     * @memberof HybridTransformer
     */
    _computeSupplyChange(defillamaData) {
        const empty = { d1: null, d7: null, d30: null, current: null, prevDay: null, prevWeek: null, prevMonth: null };
        if (!defillamaData?.rawCirculating) return empty;

        const pegKey = defillamaData.pegType || Object.keys(defillamaData.rawCirculating)[0];
        const read = (obj) => {
            const v = obj && obj[pegKey];
            return typeof v === 'number' && isFinite(v) ? v : null;
        };
        const current = read(defillamaData.rawCirculating);
        const pct = (prev) => (current !== null && prev ? ((current - prev) / prev) * 100 : null);
        const prevDay = read(defillamaData.rawCirculatingPrevDay);
        const prevWeek = read(defillamaData.rawCirculatingPrevWeek);
        const prevMonth = read(defillamaData.rawCirculatingPrevMonth);

        return {
            d1: pct(prevDay),
            d7: pct(prevWeek),
            d30: pct(prevMonth),
            current,
            prevDay,
            prevWeek,
            prevMonth
        };
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
            const price = typeof sc.main.price === 'number' && sc.main.price > 0 ? sc.main.price : null;
            const pegKey = sc.defillamaData?.pegType || null;
            const isUsdPeg = sc.pegged_asset === 'USD';

            // Compute total cross-chain supply for this coin across all known platforms
            const coinSupplyTotal = sc.platforms.reduce((sum, p) => {
                const ps = p.total_supply || p.circulating_supply || 0;
                return sum + (typeof ps === 'number' ? ps : 0);
            }, 0);

            for (const platform of sc.platforms) {
                // 'Unknown' means the coin has no chain data; it is not a chain
                if (!platform?.name || platform.name === 'Unknown') continue;

                if (!platformMap.has(platform.name)) {
                    platformMap.set(platform.name, {
                        name: platform.name,
                        total_value: 0,
                        total_supply: 0,
                        usd_current: 0,
                        usd_prev_week: 0,
                        coins: new Map()
                    });
                }

                const entry = platformMap.get(platform.name);
                const platformSupply = platform.total_supply || platform.circulating_supply || 0;

                // Value each coin in USD so coins pegged to other currencies count at their real value
                let value = 0;
                if (platformSupply > 0 && price) {
                    value = platformSupply * price;
                } else if (coinSupplyTotal > 0 && platformSupply > 0) {
                    value = sc.main.circulating_mcap * (platformSupply / coinSupplyTotal);
                } else if (sc.platforms.length === 1) {
                    // If we only have one platform, attribute full mcap to it
                    value = sc.main.circulating_mcap;
                }

                // 7-day change on this chain, from DeFiLlama history (USD-pegged coins only)
                const prevWeekRaw = pegKey ? platform.historical_data?.prevWeek?.[pegKey] : null;
                const prevWeek = typeof prevWeekRaw === 'number' && prevWeekRaw > 0 ? prevWeekRaw : null;
                if (isUsdPeg && prevWeek && platformSupply > 0) {
                    entry.usd_current += platformSupply;
                    entry.usd_prev_week += prevWeek;
                }

                entry.total_value += value;
                entry.total_supply += platformSupply > 0 ? platformSupply : 0;

                const existing = entry.coins.get(sc.symbol);
                if (existing) {
                    existing.platform_supply += platformSupply;
                    existing.platform_value += value;
                } else {
                    entry.coins.set(sc.symbol, {
                        name: sc.name,
                        symbol: sc.symbol,
                        uri: sc.uri,
                        img_url: sc.img_url || null,
                        pegged_asset: sc.pegged_asset || null,
                        price: sc.main?.price ?? null,
                        market_cap: sc.main?.circulating_mcap || null,
                        platform_supply: platformSupply,
                        platform_value: value,
                        platform_percentage: null,
                        change_7d: prevWeek && platformSupply > 0 ? ((platformSupply - prevWeek) / prevWeek) * 100 : null
                    });
                }
            }
        }

        const totalValueAllPlatforms = Array.from(platformMap.values())
            .reduce((sum, p) => sum + p.total_value, 0);
        const round2 = (v) => Math.round(v * 100) / 100;

        return Array.from(platformMap.values())
            .map(platform => {
                const coins = Array.from(platform.coins.values())
                    .map(coin => ({
                        ...coin,
                        platform_percentage: platform.total_value > 0
                            ? round2((coin.platform_value / platform.total_value) * 100)
                            : null
                    }))
                    .sort((a, b) => (b.platform_value || 0) - (a.platform_value || 0));

                const share = totalValueAllPlatforms > 0
                    ? round2((platform.total_value / totalValueAllPlatforms) * 100)
                    : 0;
                const top = coins.length > 0 && coins[0].platform_value > 0 ? coins[0] : null;

                return {
                    name: platform.name,
                    uri: DataFormatter.slugify(platform.name),
                    // Stablecoin value on this chain in USD (kept as mcap_sum for older callers)
                    mcap_sum: platform.total_value,
                    mcap_sum_s: DataFormatter.formatNumber(platform.total_value),
                    coin_count: coins.length,
                    total_supply: platform.total_supply,
                    total_supply_s: DataFormatter.formatNumber(platform.total_supply, false),
                    // Share of stablecoin value across all chains
                    supply_percentage: share,
                    supply_percentage_s: `${share}%`,
                    change_7d: platform.usd_prev_week > 0
                        ? ((platform.usd_current - platform.usd_prev_week) / platform.usd_prev_week) * 100
                        : null,
                    stablecoins: coins,
                    supply_breakdown: coins
                        .filter(coin => coin.platform_value > 0)
                        .map(coin => ({
                            name: coin.name,
                            symbol: coin.symbol,
                            uri: coin.uri,
                            supply: coin.platform_supply,
                            value: coin.platform_value,
                            percentage: coin.platform_percentage
                        })),
                    dominant_stablecoin: top
                        ? { name: top.name, symbol: top.symbol, uri: top.uri, img_url: top.img_url, supply: top.platform_supply, value: top.platform_value, percentage: top.platform_percentage }
                        : null
                };
            })
            .sort((a, b) => (b.mcap_sum || 0) - (a.mcap_sum || 0));
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
