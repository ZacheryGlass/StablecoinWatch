const IStablecoinDataService = require('../interfaces/IStablecoinDataService');
const DataFetcherRegistry = require('./DataFetcherRegistry');
const AppConfig = require('../config/AppConfig');
const DataFormatter = require('./formatters/DataFormatter');
const DEBUG = AppConfig.development.debugMode || AppConfig.development.verbose;

/**
 * Main service that coordinates stablecoin data fetching, aggregation, and transformation.
 * Implements a comprehensive data aggregation system that combines data from multiple API sources
 * (CoinMarketCap, Messari, DeFiLlama, CoinGecko) with priority-based merging, consensus scoring,
 * and confidence metrics. Uses dependency injection for loose coupling with transformation layer.
 * 
 * @class StablecoinDataService
 * @extends {IStablecoinDataService}
 */
class StablecoinDataService extends IStablecoinDataService {
    /**
     * Creates an instance of StablecoinDataService.
     * Initializes the service with injected dependencies for transformation and formatting.
     * Sets up internal state for aggregated data, platform data, metrics, and view models.
     * 
     * @param {Object} [healthMonitor=null] - Health monitoring instance for tracking API source health
     * @param {DataFetcherRegistry} [fetcherRegistry=null] - Registry of data fetchers, creates default if not provided
     * @param {IViewModelTransformer} [viewModelTransformer=null] - Transformer for view layer data conversion
     * @param {IDataFormatter} [dataFormatter=null] - Formatter for numerical and text data
     * @memberof StablecoinDataService
     */
    constructor(healthMonitor = null, fetcherRegistry = null, viewModelTransformer = null, dataFormatter = null) {
        super();
        this.healthMonitor = healthMonitor;
        this.fetcherRegistry = fetcherRegistry || DataFetcherRegistry.createDefault(healthMonitor);

        // Injected dependencies for loose coupling
        this.viewModelTransformer = viewModelTransformer;
        this.dataFormatter = dataFormatter;

        this._aggregated = [];
        this._platformData = [];
        this._metrics = { totalMarketCap: 0, totalVolume: 0, lastUpdated: null };
        this._lastRefresh = 0;
        this._viewModel = { stablecoins: [], metrics: {}, platform_data: [] };
        this._degraded = { active: false, reasons: [] };
    }

    // Interface methods
    /**
     * Gets all aggregated stablecoin data sorted by market cap.
     * Returns the internal aggregated data array that contains merged data from all sources
     * with confidence scores, consensus metrics, and quality indicators.
     * 
     * @returns {Promise<Array>} Array of aggregated stablecoin objects
     * @memberof StablecoinDataService
     */
    async getStablecoins() { return this._aggregated; }

    /**
     * Gets a specific stablecoin by identifier (slug or symbol).
     * Performs case-insensitive matching on both slug and symbol fields.
     * 
     * @param {string} identifier - The stablecoin slug or symbol to search for
     * @returns {Promise<Object|null>} The matching stablecoin object or null if not found
     * @memberof StablecoinDataService
     */
    async getStablecoin(identifier) {
        const id = String(identifier || '').toLowerCase();
        return this._aggregated.find(c => (c.slug || '').toLowerCase() === id || (c.symbol || '').toLowerCase() === id) || null;
    }

    /**
     * Gets aggregated platform/network data with market cap totals and coin counts.
     * Returns platform breakdown data showing total market cap and stablecoin count per platform.
     * 
     * @returns {Promise<Array>} Array of platform data objects with aggregated metrics
     * @memberof StablecoinDataService
     */
    async getPlatformData() { return this._platformData; }

    /**
     * Gets overall market metrics including total market cap, volume, and counts.
     * Returns aggregated metrics across all stablecoins with formatted values.
     * 
     * @returns {Promise<Object>} Market metrics object with totals and metadata
     * @memberof StablecoinDataService
     */
    async getMarketMetrics() { return this._metrics; }

    /**
     * Gets comprehensive health status including system health, data freshness, and warnings.
     * Combines health monitor data with data freshness checks and degraded mode status.
     * 
     * @returns {Promise<Object>} Health status object with system status, freshness, sources, and warnings
     * @memberof StablecoinDataService
     */
    async getHealthStatus() {
        const system = this.healthMonitor ? await this.healthMonitor.getSystemHealth() : null;
        const freshness = await this.getDataFreshness();
        const warnings = [];
        if (freshness.isStale) warnings.push('Data is stale');
        if (this._degraded.active) {
            warnings.push(...this._degraded.reasons);
        }
        return {
            healthy: system ? system.status === 'healthy' : !this._degraded.active,
            dataFreshness: freshness.age,
            sources: system ? system.sources : [],
            metrics: system ? system.metrics : {},
            warnings,
            status: system ? system.status : (this._degraded.active ? 'degraded' : 'unknown')
        };
    }

    /**
     * Refreshes all stablecoin data from active sources and rebuilds aggregated data.
     * Coordinates parallel data fetching from all active sources, performs priority-based
     * data merging with consensus scoring, builds view models, and updates internal state.
     * Implements degraded mode handling and comprehensive error tracking.
     * 
     * @returns {Promise<Object>} Refresh operation result with success status, counts, duration, and errors
     * @throws {Error} When no data sources are available or all sources fail
     * @memberof StablecoinDataService
     */
    async refreshData() {
        const start = Date.now();
        const sourceResults = [];
        const errors = [];

        // 1) Fetch and standardize data from all active fetchers
        const activeFetchers = this.fetcherRegistry.getActive();
        // Build effective priority map: env override (SOURCE_PRIORITY) takes precedence over fetcher-declared capability
        const priorityOverrides = (AppConfig?.dataSources?.priority) || {};
        const sourcePriority = new Map(activeFetchers.map(f => {
            const id = f.getSourceId();
            const declared = f.getCapabilities()?.priority || 0;
            const hasOverride = Object.prototype.hasOwnProperty.call(priorityOverrides, id);
            const effective = hasOverride ? priorityOverrides[id] : declared;
            if (DEBUG) {
                console.log(`[Priority] ${id}: effective=${effective} (override=${hasOverride ? priorityOverrides[id] : 'none'}, declared=${declared})`);
            }
            return [id, effective];
        }));

        const settled = await Promise.allSettled(activeFetchers.map(async (f) => {
            try {
                const raw = await f.fetchStablecoins();
                const std = f.transformToStandardFormat(raw);
                sourceResults.push({ sourceId: f.getSourceId(), success: true, recordCount: std.length, duration: 0 });
                return { id: f.getSourceId(), list: std };
            } catch (e) {
                sourceResults.push({ sourceId: f.getSourceId(), success: false, recordCount: 0, duration: 0, error: e?.message });
                errors.push(`${f.getSourceId()}: ${e?.message}`);
                return { id: f.getSourceId(), list: [] };
            }
        }));

        // Check degraded mode
        if (this.healthMonitor && typeof this.healthMonitor.checkDegradedMode === 'function') {
            try {
                const d = await this.healthMonitor.checkDegradedMode();
                this._degraded = { active: !!d.recommended, reasons: d.reasons || [] };
            } catch (_) { this._degraded = { active: false, reasons: [] }; }
        }

        // 2) Build map keyed by symbol for merging
        const bySymbol = new Map();
        for (const res of settled) {
            const payload = res.value || res.reason || null;
            if (!payload || !Array.isArray(payload.list)) continue;
            const src = payload.id;
            for (const item of payload.list) {
                const key = (item.symbol || item.slug || item.name || '').toUpperCase();
                if (!key) continue;
                if (!bySymbol.has(key)) bySymbol.set(key, []);
                bySymbol.get(key).push({ sourceId: src, data: item });
            }
        }

        // 3) Merge per symbol using priority and consensusd
        const aggregated = [];
        for (const [key, entries] of bySymbol) {
            const pickBy = (picker) => {
                // Return value from highest-priority source that satisfies picker
                let best = null;
                let bestPrio = -Infinity;
                for (const { sourceId, data } of entries) {
                    const val = picker(data);
                    const prio = sourcePriority.get(sourceId) || 0;
                    if ((val !== undefined && val !== null) && prio > bestPrio) {
                        bestPrio = prio;
                        best = { value: val, sourceId };
                    }
                }
                return best;
            };

            const namePick = pickBy(d => d.name);
            const symbolPick = pickBy(d => d.symbol);
            const slugPick = pickBy(d => d.slug);

            // Market data consensus
            const prices = entries.map(e => ({ s: e.sourceId, v: e.data.marketData?.price })).filter(x => typeof x.v === 'number');
            const marketCaps = entries.map(e => ({ s: e.sourceId, v: e.data.marketData?.marketCap })).filter(x => typeof x.v === 'number');
            const volumes = entries.map(e => ({ s: e.sourceId, v: e.data.marketData?.volume24h })).filter(x => typeof x.v === 'number');

            const primaryPrice = pickBy(d => d.marketData?.price);
            const primaryMCap = pickBy(d => d.marketData?.marketCap);
            const primaryVol = pickBy(d => d.marketData?.volume24h);

            const supplyCirc = pickBy(d => d.supplyData?.circulating);
            const supplyTotal = pickBy(d => d.supplyData?.total);
            const supplyMax = pickBy(d => d.supplyData?.max);

            // PRIORITY OVERRIDE: Always use DeFiLlama for platform/chain data when available
            const defillamaEntry = entries.find(e => e.sourceId === 'defillama');
            let breakdown = [];
            let defillamaData = null;
            
            if (defillamaEntry?.data?.metadata?.defillamaData?.rawChainCirculating) {
                // Use DeFiLlama chain data exclusively
                defillamaData = defillamaEntry.data.metadata.defillamaData;
                breakdown = this._extractDeFiLlamaChainBreakdown(defillamaData);
            } else {
                // Fallback to standard network breakdown merge (union by network+contract)
                const seenNet = new Set();
                for (const { data } of entries) {
                    const fromSupply = Array.isArray(data?.supplyData?.networkBreakdown) ? data.supplyData.networkBreakdown : [];
                    const fromPlatforms = Array.isArray(data?.platforms)
                        ? data.platforms.map(p => ({
                            name: p.name,
                            network: p.network || p.name,
                            contractAddress: p.contractAddress || null,
                            supply: p.supply ?? null,
                            percentage: p.percentage ?? null,
                        }))
                        : [];
                    const arr = [...fromSupply, ...fromPlatforms];
                    for (const n of arr) {
                        const k = `${(n.network || n.name || '').toString().toLowerCase()}:${(n.contractAddress || '').toString().toLowerCase()}`;
                        if (!seenNet.has(k)) {
                            seenNet.add(k);
                            breakdown.push({
                                platform: n.name || n.network || 'Unknown',
                                network: n.network || n.name || null,
                                supply: n.supply ?? null,
                                percentage: n.percentage ?? null,
                                contractAddress: n.contractAddress || null,
                            });
                        }
                    }
                }
            }

            // track if breakdown has entries (used for internal metrics if needed)

            // Metadata merge (priority-aware for description, website, logo, dateAdded)
            const allTags = new Set();
            for (const { data } of entries) {
                (data.metadata?.tags || []).forEach(t => allTags.add(t));
            }

            const descriptionPick = pickBy(d => d.metadata?.description);
            const websitePick = pickBy(d => d.metadata?.website);
            const logoPick = pickBy(d => d.metadata?.logoUrl);
            const dateAddedPick = pickBy(d => d.metadata?.dateAdded);
            if (DEBUG && (key === 'USDT' || key === 'USDC')) {
                if (logoPick?.value) {
                    console.log(`[Aggregation Debug] ${key}: logo chosen from ${logoPick.sourceId}: ${logoPick.value}`);
                }
            }

            // Consensus + confidence
            const consensus = this._computeConsensus(prices.map(p => p.v));
            const sourceIds = [...new Set(entries.map(e => e.sourceId))];
            const confidence = this._computeConfidence({
                priceSources: prices.length,
                mcapSources: marketCaps.length,
                supplySources: entries.filter(e => e.data.supplyData?.circulating != null).length,
                consensus,
            });

            const marketData = {
                price: primaryPrice?.value ?? (prices[0]?.v ?? null),
                priceSource: primaryPrice?.sourceId || (prices[0]?.s || null),
                marketCap: primaryMCap?.value ?? (marketCaps[0]?.v ?? null),
                marketCapSource: primaryMCap?.sourceId || (marketCaps[0]?.s || null),
                volume24h: primaryVol?.value ?? (volumes[0]?.v ?? null),
                volumeSource: primaryVol?.sourceId || (volumes[0]?.s || null),
                percentChange24h: pickBy(d => d.marketData?.percentChange24h)?.value ?? null,
                rank: pickBy(d => d.marketData?.rank)?.value ?? null,
                sourcePrices: Object.fromEntries(prices.map(p => [p.s, p.v]))
            };
            
            // Debug logging for volume data processing
            if (DEBUG && (key === 'USDT' || key === 'USDC')) {
                console.log(`[Volume Debug] ${key}: volumes array length=${volumes.length}, primaryVol=${primaryVol?.value}, final volume24h=${marketData.volume24h}`);
                if (volumes.length > 0) {
                    console.log(`[Volume Debug] ${key}: volumes[0]=${volumes[0]?.v} from source ${volumes[0]?.s}`);
                }
            }

            const agg = {
                id: slugPick?.value || symbolPick?.value || key,
                name: namePick?.value || key,
                symbol: symbolPick?.value || key,
                slug: (slugPick?.value || symbolPick?.value || key).toLowerCase(),
                imageUrl: logoPick?.value || null,
                marketData,
                supplyData: {
                    circulating: supplyCirc?.value ?? null,
                    circulatingSource: supplyCirc?.sourceId || null,
                    total: supplyTotal?.value ?? null,
                    totalSource: supplyTotal?.sourceId || null,
                    max: supplyMax?.value ?? null,
                    networkBreakdown: breakdown
                },
                platforms: [], // filled in view transformation
                metadata: {
                    tags: Array.from(allTags),
                    description: descriptionPick?.value || null,
                    website: websitePick?.value || null,
                    logoUrl: logoPick?.value || null,
                    dateAdded: dateAddedPick?.value || null,
                    // Include DeFiLlama data for cross-chain analysis
                    defillamaData: defillamaData
                },
                confidence: {
                    overall: confidence.overall,
                    marketData: confidence.market,
                    supplyData: confidence.supply,
                    platformData: confidence.platform,
                    sourceCount: sourceIds.length,
                    consensus: consensus
                },
                dataSources: sourceIds,
                lastUpdated: Date.now(),
                quality: this._computeQuality({ marketData, supply: { circ: supplyCirc?.value, total: supplyTotal?.value } })
            };

            // Store aggregated record; transformer adapter will handle input mapping
            aggregated.push({ aggregated: agg });
        }
        

        // 4) If no data fetched, surface degraded fallback (keep previous data)
        if (aggregated.length === 0) {
            return {
                success: false,
                stablecoinsUpdated: 0,
                duration: Date.now() - start,
                sourceResults,
                errors: errors.length ? errors : ['No data from any source'],
                timestamp: Date.now()
            };
        }

        // 5) Build view models using the injected transformer for compatibility
        // Pass aggregated DTOs; adapter handles any required mapping
        this.viewModelTransformer.transformData(aggregated.map(x => x.aggregated));
        const viewStablecoins = this.viewModelTransformer.getTransformedData();
        const platformData = this.viewModelTransformer.calculateAggregations();

        // 6) Store results and metrics
        this._aggregated = aggregated.map(x => x.aggregated)
            .sort((a, b) => (b.marketData.marketCap || 0) - (a.marketData.marketCap || 0));
        this._platformData = platformData;
        this._metrics = {
            totalMarketCap: this._aggregated.reduce((s, c) => s + (c.marketData.marketCap || 0), 0),
            totalMarketCapFormatted: DataFormatter.formatNumber(this._aggregated.reduce((s, c) => s + (c.marketData.marketCap || 0), 0)),
            totalVolume: this._aggregated.reduce((s, c) => s + (c.marketData.volume24h || 0), 0),
            totalVolumeFormatted: DataFormatter.formatNumber(this._aggregated.reduce((s, c) => s + (c.marketData.volume24h || 0), 0)),
            stablecoinCount: this._aggregated.length,
            platformCount: platformData.length,
            lastUpdated: Date.now(),
        };
        this._lastRefresh = Date.now();

        // Build view model for routes using legacy shape
        this._viewModel = {
            stablecoins: viewStablecoins,
            metrics: {
                totalMCap: this._metrics.totalMarketCap,
                totalMCap_s: DataFormatter.formatNumber(this._metrics.totalMarketCap),
                totalVolume: this._metrics.totalVolume,
                totalVolume_s: DataFormatter.formatNumber(this._metrics.totalVolume),
                lastUpdated: new Date(this._metrics.lastUpdated || Date.now()).toISOString()
            },
            platform_data: platformData
        };

        return {
            success: errors.length === 0,
            stablecoinsUpdated: this._aggregated.length,
            duration: Date.now() - start,
            sourceResults,
            errors,
            timestamp: Date.now()
        };
    }

    /**
     * Gets data freshness information including age, staleness, and next update time.
     * Calculates data age based on last refresh timestamp and determines staleness
     * based on configured update intervals.
     * 
     * @returns {Promise<Object>} Freshness data with timestamps, age, staleness status, and source info
     * @memberof StablecoinDataService
     */
    async getDataFreshness() {
        const lastUpdate = this._lastRefresh;
        const age = Date.now() - (lastUpdate || 0);
        const isStale = age > (AppConfig.dataUpdate.intervalMinutes * 60 * 1000 * 2);
        const sources = this.fetcherRegistry.getAll().map(f => {
            let lastSuccess = null;
            try {
                const h = this.healthMonitor ? this.healthMonitor.getSourceHealth(f.getSourceId()) : null;
                // h may be a promise; ignore for brevity in freshness
            } catch (_) { }
            return { sourceId: f.getSourceId(), lastSuccess };
        });
        return { lastUpdate, age, isStale, nextUpdate: lastUpdate + (AppConfig.dataUpdate.intervalMinutes * 60 * 1000), sources };
    }

    /**
     * Gets information about all configured data sources including health and capabilities.
     * Returns detailed information about each data fetcher including configuration status,
     * health status, capabilities, and rate limiting information.
     * 
     * @returns {Promise<Array>} Array of data source information objects
     * @memberof StablecoinDataService
     */
    async getDataSources() {
        const list = [];
        for (const f of this.fetcherRegistry.getAll()) {
            let healthy = true;
            try {
                const h = await f.getHealthStatus();
                healthy = !!h?.healthy || (h?.status !== 'down');
            } catch (_) { healthy = false; }
            const priorityOverrides = (AppConfig?.dataSources?.priority) || {};
            const declared = f.getCapabilities()?.priority || 0;
            const hasOverride = Object.prototype.hasOwnProperty.call(priorityOverrides, f.getSourceId());
            const effectivePriority = hasOverride ? priorityOverrides[f.getSourceId()] : declared;
            list.push({
                sourceId: f.getSourceId(),
                sourceName: f.getSourceName(),
                configured: f.isConfigured(),
                healthy,
                capabilities: f.getCapabilities(),
                priority: effectivePriority,
                rateLimit: f.getRateLimitInfo()
            });
        }
        return list;
    }

    /**
     * Gets the view model data for legacy route compatibility.
     * Returns the internal view model that matches the expected format for existing routes.
     * 
     * @returns {Object} View model object with stablecoins, metrics, and platform data
     * @memberof StablecoinDataService
     */
    getData() { return this._viewModel; }

    // Helpers
    /**
     * Computes consensus score for a set of numerical values.
     * Calculates how closely values agree by measuring deviation from median.
     * Higher scores indicate better agreement between sources.
     * 
     * @param {Array<number>} values - Array of numerical values to analyze
     * @returns {number} Consensus score between 0 and 1 (1 = perfect agreement)
     * @private
     * @memberof StablecoinDataService
     */
    _computeConsensus(values) {
        const nums = (values || []).filter(v => typeof v === 'number' && isFinite(v));
        if (nums.length <= 1) return 0.5;
        const median = this._median(nums);
        if (!median) return 0.5;
        const maxRel = Math.max(...nums.map(v => Math.abs(v - median) / Math.max(1, median)));
        // 0 deviation => 1.0, 5% deviation => ~0, clamp
        const score = 1 - Math.min(1, maxRel / 0.05);
        return Math.max(0, Math.min(1, score));
    }

    /**
     * Computes confidence scores for different data categories.
     * Calculates overall confidence based on number of sources and consensus quality.
     * 
     * @param {Object} params - Configuration object
     * @param {number} params.priceSources - Number of sources providing price data
     * @param {number} params.mcapSources - Number of sources providing market cap data
     * @param {number} params.supplySources - Number of sources providing supply data
     * @param {number} params.consensus - Consensus score from _computeConsensus
     * @returns {Object} Confidence scores object with overall, market, supply, and platform scores
     * @private
     * @memberof StablecoinDataService
     */
    _computeConfidence({ priceSources, mcapSources, supplySources, consensus }) {
        const srcScore = Math.min(1, (priceSources + mcapSources + supplySources) / 6); // heuristic up to 6 datapoints
        const market = Math.min(1, ((priceSources >= 1 ? 0.5 : 0) + (mcapSources >= 1 ? 0.3 : 0) + consensus * 0.2));
        const supply = Math.min(1, (supplySources >= 1 ? 0.8 : 0) + (supplySources >= 2 ? 0.2 : 0));
        const platform = 0.5; // until network breakdown implemented broadly
        const overall = Math.min(1, (market * 0.4 + supply * 0.4 + platform * 0.2) * (0.8 + 0.2 * srcScore));
        return { overall, market, supply, platform };
    }

    /**
     * Computes data quality metrics for a stablecoin entry.
     * Evaluates completeness of data and identifies missing critical fields.
     * 
     * @param {Object} params - Data object to evaluate
     * @param {Object} params.marketData - Market data object with price and market cap
     * @param {Object} params.supply - Supply data object with circulating supply
     * @returns {Object} Quality metrics object with completeness flags and missing fields
     * @private
     * @memberof StablecoinDataService
     */
    _computeQuality({ marketData, supply }) {
        const missing = [];
        if (marketData.price == null) missing.push('price');
        if (marketData.marketCap == null) missing.push('marketCap');
        if (supply.circ == null) missing.push('circulating');
        return {
            hasRecentData: true,
            hasMultipleSources: false,
            hasMarketData: marketData.price != null && marketData.marketCap != null,
            hasSupplyData: supply.circ != null,
            warnings: [],
            missingFields: missing
        };
    }

    /**
     * Calculates the median value of a numerical array.
     * Handles both odd and even length arrays appropriately.
     * 
     * @param {Array<number>} arr - Array of numbers to find median of
     * @returns {number} The median value
     * @private
     * @memberof StablecoinDataService
     */
    _median(arr) {
        const s = [...arr].sort((a, b) => a - b);
        const m = Math.floor(s.length / 2);
        return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
    }

    /**
     * Extracts network breakdown data from DeFiLlama chainCirculating structure.
     * Processes DeFiLlama's detailed cross-chain supply data and converts it to
     * the standard network breakdown format used throughout the application.
     * 
     * @param {Object} defillamaData - DeFiLlama data object with rawChainCirculating
     * @returns {Array} Array of network breakdown objects with platform, supply, percentage data
     * @private
     * @memberof StablecoinDataService
     */
    _extractDeFiLlamaChainBreakdown(defillamaData) {
        const breakdown = [];
        if (!defillamaData?.rawChainCirculating) return breakdown;

        const chainCirculating = defillamaData.rawChainCirculating;
        const totalSupply = defillamaData.rawCirculating?.peggedUSD || 
                           defillamaData.rawCirculating?.peggedEUR || 
                           Object.values(defillamaData.rawCirculating || {})[0] || 
                           null;

        for (const [chainName, chainData] of Object.entries(chainCirculating)) {
            if (!chainData?.current) continue;

            const chainSupply = chainData.current.peggedUSD || 
                              chainData.current.peggedEUR || 
                              Object.values(chainData.current)[0] || 
                              null;

            if (!chainSupply || chainSupply <= 0) continue;

            // Normalize chain name using the same logic as PlatformNormalizer
            const normalizedName = this._normalizeChainName(chainName);
            const percentage = totalSupply ? (chainSupply / totalSupply) * 100 : null;

            breakdown.push({
                platform: normalizedName,
                network: chainName.toLowerCase(),
                supply: chainSupply,
                percentage: percentage,
                contractAddress: null, // DeFiLlama doesn't provide contract addresses
                // Include historical data for potential future use
                historical: {
                    prevDay: chainData.circulatingPrevDay || null,
                    prevWeek: chainData.circulatingPrevWeek || null,
                    prevMonth: chainData.circulatingPrevMonth || null
                }
            });
        }

        // Sort by supply descending to show largest chains first
        return breakdown.sort((a, b) => (b.supply || 0) - (a.supply || 0));
    }

    /**
     * Normalizes DeFiLlama chain names to consistent display names.
     * Uses similar logic to PlatformNormalizer for consistency.
     * 
     * @param {string} chainName - Raw chain name from DeFiLlama
     * @returns {string} Normalized chain name for display
     * @private
     * @memberof StablecoinDataService
     */
    _normalizeChainName(chainName) {
        if (!chainName || typeof chainName !== 'string') return 'Unknown';
        
        const name = chainName.toLowerCase().trim();
        const chainMap = {
            'ethereum': 'Ethereum', 'tron': 'Tron', 'binance': 'BSC', 'bsc': 'BSC',
            'polygon': 'Polygon', 'solana': 'Solana', 'avalanche': 'Avalanche',
            'arbitrum': 'Arbitrum', 'optimism': 'Optimism', 'base': 'Base',
            'bitcoin': 'Bitcoin', 'stellar': 'Stellar', 'algorand': 'Algorand',
            'cardano': 'Cardano', 'near': 'NEAR', 'flow': 'Flow', 'hedera': 'Hedera',
            'sui': 'Sui', 'aptos': 'Aptos', 'manta': 'Manta', 'thundercore': 'ThunderCore',
            'ton': 'TON', 'cronos': 'Cronos', 'mantle': 'Mantle', 'linea': 'Linea',
            'scroll': 'Scroll', 'blast': 'Blast', 'zksync': 'zkSync Era',
            'fantom': 'Fantom', 'celo': 'Celo', 'harmony': 'Harmony'
        };

        return chainMap[name] || (chainName.charAt(0).toUpperCase() + chainName.slice(1).toLowerCase());
    }

}

module.exports = StablecoinDataService;
