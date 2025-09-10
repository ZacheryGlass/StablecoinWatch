const Stablecoin = require('../models/stablecoin');
const Platform = require('../models/platform');

/**
 * Transforms and standardizes hybrid stablecoin data for view layer consumption.
 * Handles data transformation from aggregated sources into view models compatible
 * with the existing UI templates. Provides platform normalization, image URL generation,
 * formatting utilities, and platform data calculations.
 * 
 * @class HybridTransformer
 */
class HybridTransformer {
    /**
     * Creates an instance of HybridTransformer.
     * Initializes internal state for stablecoins array and metrics tracking.
     * 
     * @memberof HybridTransformer
     */
    constructor() {
        this.stablecoins = [];
        this.metrics = { totalMCap: 0, totalVolume: 0, lastUpdated: null };
    }

    /**
     * Transforms hybrid stablecoin data into standardized view model format.
     * Processes array of hybrid stablecoin objects, extracts and transforms data into
     * Stablecoin model instances with proper formatting, platform extraction, and metrics calculation.
     * Updates internal state with transformed stablecoins and aggregated metrics.
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

            const sc = new Stablecoin();
            sc.name = hybrid.name || '';
            sc.symbol = hybrid.symbol || '';
            sc.uri = (hybrid.slug || hybrid.symbol || '').toLowerCase();

            sc.img_url = this.getCoinImageUrl(hybrid);

            sc.main = {
                price: hybrid.price,
                circulating_mcap: hybrid.market_cap,
                circulating_mcap_s: this.formatNumber(hybrid.market_cap),
                volume_24h: hybrid.volume_24h,
                volume_s: this.formatNumber(hybrid.volume_24h),
            };

            sc.platforms = this.extractPlatformsFromHybrid(hybrid);

            sc.msri = {
                price: hybrid.price,
                circulating_mcap_s: this.formatNumber(hybrid.market_cap),
                total_supply_s: this.formatNumber(hybrid.total_supply, false),
                circulating_supply_s: this.formatNumber(hybrid.circulating_supply, false),
                volume_s: this.formatNumber(hybrid.volume_24h),
                desc: this.generateDescription(hybrid),
            };

            sc.scw = {
                price: hybrid.price,
                circulating_mcap_s: this.formatNumber(hybrid.market_cap),
                total_supply_s: this.formatNumber(hybrid.total_supply, false),
                circulating_supply_s: this.formatNumber(hybrid.circulating_supply, false),
                volume_s: this.formatNumber(hybrid.volume_24h),
                circulating_supply: hybrid.circulating_supply,
            };

            sc.cmc = this._populateCMCContainer(hybrid);
            sc.cgko = this._populateCoinGeckoContainer(hybrid);

            if (typeof hybrid.market_cap === 'number') this.metrics.totalMCap += hybrid.market_cap;
            if (typeof hybrid.volume_24h === 'number') this.metrics.totalVolume += hybrid.volume_24h;

            this.stablecoins.push(sc);
        }

        this.stablecoins.sort((a, b) => (b.main.circulating_mcap || 0) - (a.main.circulating_mcap || 0));
    }

    /**
     * Gets the appropriate image URL for a stablecoin.
     * Prioritizes CoinMarketCap image URLs if CMC ID is available, falls back to Messari logo URLs.
     * 
     * @param {Object} hybrid - Hybrid stablecoin data object
     * @param {string} [hybrid.id] - CoinMarketCap ID for generating CMC image URL
     * @param {Object} [hybrid._messari] - Messari-specific data container
     * @param {Object} [hybrid._messari.profile.images] - Messari profile images
     * @param {string} [hybrid._messari.profile.images.logo] - Messari logo URL
     * @returns {string|null} Image URL or null if no image available
     * @memberof HybridTransformer
     */
    getCoinImageUrl(hybrid) {
        if (hybrid.id) {
            return `https://s2.coinmarketcap.com/static/img/coins/64x64/${hybrid.id}.png`;
        }
        if (hybrid._messari?.profile?.images?.logo) {
            return hybrid._messari.profile.images.logo;
        }
        return null;
    }

    /**
     * Normalizes platform/blockchain names to standardized display names.
     * Maps various platform name variations to consistent, user-friendly names.
     * Handles common variations and aliases for major blockchain platforms.
     * 
     * @param {string} rawName - Raw platform name from API sources
     * @returns {string} Normalized platform name for display
     * @memberof HybridTransformer
     */
    normalizePlatformName(rawName) {
        if (!rawName || typeof rawName !== 'string') return 'Unknown';
        const name = rawName.toLowerCase().trim();
        const platformMap = {
            'ethereum-pow-ecosystem': 'Ethereum', 'ethereum': 'Ethereum', 'eth': 'Ethereum',
            'tron20-ecosystem': 'Tron', 'tron': 'Tron', 'trx': 'Tron',
            'binance-smart-chain': 'BSC', 'bsc': 'BSC', 'bnb': 'BSC',
            'polygon': 'Polygon', 'matic': 'Polygon', 'solana': 'Solana', 'sol': 'Solana',
            'avalanche': 'Avalanche', 'avax': 'Avalanche', 'arbitrum': 'Arbitrum',
            'optimism': 'Optimism', 'base': 'Base', 'bitcoin': 'Bitcoin', 'btc': 'Bitcoin',
            'omni': 'Bitcoin (Omni)', 'stellar': 'Stellar', 'xlm': 'Stellar', 'algorand': 'Algorand',
            'algo': 'Algorand', 'cardano': 'Cardano', 'ada': 'Cardano', 'near': 'NEAR',
            'flow': 'Flow', 'hedera': 'Hedera', 'sui': 'Sui', 'aptos': 'Aptos'
        };
        if (platformMap[name]) return platformMap[name];
        if (name.includes('ethereum')) return 'Ethereum';
        if (name.includes('tron')) return 'Tron';
        if (name.includes('binance') || name.includes('bsc')) return 'BSC';
        if (name.includes('polygon') || name.includes('matic')) return 'Polygon';
        if (name.includes('solana')) return 'Solana';
        if (name.includes('avalanche') || name.includes('avax')) return 'Avalanche';
        if (name.includes('arbitrum')) return 'Arbitrum';
        if (name.includes('optimism')) return 'Optimism';
        if (name.includes('bitcoin') || name.includes('btc')) return 'Bitcoin';
        return rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
    }

    /**
     * Extracts and normalizes platform information from hybrid stablecoin data.
     * Prioritizes network breakdown data, falls back to CMC platform data or tags.
     * Returns array of Platform instances with deduplicated, normalized names.
     * 
     * @param {Object} hybrid - Hybrid stablecoin data object
     * @param {Array} [hybrid.networkBreakdown] - Network breakdown data with platform details
     * @param {Object} [hybrid._cmc] - CoinMarketCap-specific data
     * @param {Object} [hybrid._cmc.platform] - CMC platform information
     * @param {Array} [hybrid.tags] - Tag array that may contain platform indicators
     * @returns {Array<Platform>} Array of Platform instances, with 'Unknown' fallback
     * @memberof HybridTransformer
     */
    extractPlatformsFromHybrid(hybrid) {
        const platforms = [];
        const seen = new Set();
        try {
            if (Array.isArray(hybrid.networkBreakdown) && hybrid.networkBreakdown.length > 0) {
                hybrid.networkBreakdown.forEach(network => {
                    const raw = network.network || network.name;
                    if (raw) {
                        const normalized = this.normalizePlatformName(raw);
                        if (!seen.has(normalized)) {
                            seen.add(normalized);
                            platforms.push(new Platform(normalized));
                        }
                    }
                });
            } else if (hybrid._cmc?.platform?.name) {
                const normalized = this.normalizePlatformName(hybrid._cmc.platform.name);
                if (!seen.has(normalized)) {
                    seen.add(normalized);
                    platforms.push(new Platform(normalized));
                }
            } else if (Array.isArray(hybrid.tags) && hybrid.tags.length > 0) {
                const platformTags = hybrid.tags.filter(tag =>
                    tag.includes('ethereum') || tag.includes('binance') || tag.includes('solana') ||
                    tag.includes('tron') || tag.includes('polygon') || tag.includes('avalanche')
                );
                platformTags.forEach(tag => {
                    const normalized = this.normalizePlatformName(tag);
                    if (!seen.has(normalized)) {
                        seen.add(normalized);
                        platforms.push(new Platform(normalized));
                    }
                });
            }
        } catch (_) { /* ignore */ }

        if (platforms.length === 0) {
            platforms.push(new Platform('Unknown'));
        }
        return platforms;
    }

    /**
     * Generates a descriptive text for a stablecoin based on its data sources and tags.
     * Creates a standardized description indicating the stablecoin's data sources and associated tags.
     * 
     * @param {Object} hybrid - Hybrid stablecoin data object
     * @param {string} [hybrid.name] - Stablecoin name
     * @param {Array} [hybrid.tags] - Array of tags associated with the stablecoin
     * @param {string} [hybrid.source] - Data source indicator ('hybrid', 'cmc-only', etc.)
     * @returns {string} Generated description text
     * @memberof HybridTransformer
     */
    generateDescription(hybrid) {
        const tags = hybrid.tags ? hybrid.tags.join(', ') : '';
        const source = hybrid.source === 'hybrid' ? 'CMC + Messari' : 
                       hybrid.source === 'cmc-only' ? 'CoinMarketCap' : 'Messari';
        return `${hybrid.name} is a stablecoin tracked by ${source}. ${tags ? `Tags: ${tags}` : ''}`.trim();
    }

    /**
     * Calculates aggregated platform data from all processed stablecoins.
     * Aggregates market cap totals and coin counts by platform, formats values for display,
     * and generates URI slugs for routing.
     * 
     * @returns {Array} Array of platform data objects with totals, counts, and formatted values
     * @memberof HybridTransformer
     */
    calculatePlatformData() {
        const map = new Map();
        for (const sc of this.stablecoins) {
            if (!sc?.platforms || !sc?.main?.circulating_mcap) continue;
            for (const p of sc.platforms) {
                if (!map.has(p.name)) map.set(p.name, { name: p.name, mcap_sum: 0, coin_count: 0 });
                const entry = map.get(p.name);
                entry.mcap_sum += sc.main.circulating_mcap;
                entry.coin_count += 1;
            }
        }
        return Array.from(map.values())
            .map((x) => ({
                ...x,
                uri: this.slugify(x.name),
                mcap_sum_s: this.formatNumber(x.mcap_sum),
            }))
            .sort((a, b) => b.mcap_sum - a.mcap_sum);
    }

    /**
     * Formats numerical values with appropriate units and currency symbols.
     * Converts large numbers to readable format with B (billions), M (millions), K (thousands) suffixes.
     * Handles edge cases and provides fallback for invalid numbers.
     * 
     * @param {number} num - Numerical value to format
     * @param {boolean} [includeDollarSign=true] - Whether to include dollar sign prefix
     * @returns {string} Formatted number string with appropriate units
     * @memberof HybridTransformer
     */
    formatNumber(num, includeDollarSign = true) {
        if (typeof num !== 'number' || !isFinite(num)) return 'No data';
        const prefix = includeDollarSign ? '$' : '';
        if (num >= 1e9) return prefix + (num / 1e9).toFixed(1) + 'B';
        if (num >= 1e6) return prefix + (num / 1e6).toFixed(1) + 'M';
        if (num >= 1e3) return prefix + (num / 1e3).toFixed(1) + 'K';
        return prefix + num.toFixed(includeDollarSign ? 2 : 0);
    }

    /**
     * Converts text to URL-friendly slug format.
     * Converts to lowercase, replaces non-alphanumeric characters with hyphens,
     * and removes leading/trailing hyphens.
     * 
     * @param {string} text - Text to convert to slug
     * @returns {string} URL-friendly slug string
     * @memberof HybridTransformer
     */
    slugify(text) {
        if (!text) return '';
        return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    }

    /**
     * Gets the array of processed stablecoin objects.
     * Returns the internal stablecoins array after transformation.
     * 
     * @returns {Array<Stablecoin>} Array of processed Stablecoin model instances
     * @memberof HybridTransformer
     */
    getStablecoins() { return this.stablecoins; }
    /**
     * Gets complete data object with stablecoins, metrics, and platform data.
     * Returns a comprehensive data object suitable for view layer consumption.
     * 
     * @returns {Object} Complete data object with stablecoins array, metrics, and platform data
     * @returns {Array} returns.stablecoins - Array of processed stablecoin objects
     * @returns {Object} returns.metrics - Aggregated metrics (totalMCap, totalVolume, lastUpdated)
     * @returns {Array} returns.platform_data - Platform aggregation data
     * @memberof HybridTransformer
     */
    getData() { return { stablecoins: this.stablecoins, metrics: this.metrics, platform_data: this.calculatePlatformData() }; }

    /**
     * Populates CoinMarketCap-specific data container with formatted values.
     * Creates a complete CMC data object with price, market cap, supply, and volume data
     * formatted consistently with other containers in the system.
     * 
     * @param {Object} hybrid - Hybrid stablecoin data object
     * @returns {Object} Populated CMC container with formatted data
     * @private
     * @memberof HybridTransformer
     */
    _populateCMCContainer(hybrid) {
        const cmcData = hybrid._cmc || {};
        return {
            price: hybrid.price,
            circulating_mcap_s: this.formatNumber(hybrid.market_cap),
            total_supply_s: this.formatNumber(hybrid.total_supply, false),
            circulating_supply_s: this.formatNumber(hybrid.circulating_supply, false),
            volume_s: this.formatNumber(hybrid.volume_24h),
            desc: cmcData.description || null,
            platform: cmcData.platform || null
        };
    }

    /**
     * Populates CoinGecko-specific data container with formatted values.
     * Creates a complete CoinGecko data object with price, market cap, supply, and volume data
     * formatted consistently with other containers in the system.
     * 
     * @param {Object} hybrid - Hybrid stablecoin data object  
     * @returns {Object} Populated CoinGecko container with formatted data
     * @private
     * @memberof HybridTransformer
     */
    _populateCoinGeckoContainer(hybrid) {
        const cgkoData = hybrid._cgko || {};
        return {
            price: hybrid.price,
            circulating_mcap_s: this.formatNumber(hybrid.market_cap),
            total_supply_s: this.formatNumber(hybrid.total_supply, false),
            circulating_supply_s: this.formatNumber(hybrid.circulating_supply, false),
            volume_s: this.formatNumber(hybrid.volume_24h),
            desc: cgkoData.description || null
        };
    }
}

module.exports = HybridTransformer;
