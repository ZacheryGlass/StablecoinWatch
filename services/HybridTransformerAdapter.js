const IViewModelTransformer = require('../interfaces/IViewModelTransformer');
const HybridTransformer = require('./HybridTransformer');

/**
 * Adapter that makes HybridTransformer consume the service's aggregated DTOs.
 * Implements IViewModelTransformer and delegates to HybridTransformer after
 * mapping AggregatedStablecoin objects to the hybrid input shape.
 */
class HybridTransformerAdapter extends IViewModelTransformer {
    constructor(config = {}) {
        super();
        this.config = config;
        this.impl = new HybridTransformer(config);
    }

    /**
     * Accepts array of AggregatedStablecoin objects and maps them to the
     * hybrid format expected by HybridTransformer.
     * @param {Array<Object>} aggregatedList
     */
    transformData(aggregatedList) {
        if (!Array.isArray(aggregatedList)) {
            this.impl.reset();
            return;
        }
        const hybridInput = aggregatedList.map((agg) => this._fromAggregatedToHybrid(agg)).filter(Boolean);
        this.impl.transformData(hybridInput);
    }

    getTransformedData() {
        return this.impl.getTransformedData();
    }

    calculateAggregations() {
        return this.impl.calculateAggregations();
    }

    getCompleteViewModel() {
        return this.impl.getCompleteViewModel();
    }

    reset() {
        return this.impl.reset();
    }

    validateInputData(data) {
        return Array.isArray(data);
    }

    getTransformerInfo() {
        const base = this.impl.getTransformerInfo?.() || {};
        return {
            name: 'HybridTransformerAdapter',
            version: '1.0.0',
            adapterFor: base.name || 'HybridTransformer',
            capabilities: base.capabilities || ['hybrid_data_transformation', 'platform_aggregation', 'view_formatting']
        };
    }

    /**
     * Map AggregatedStablecoin DTO (service internal) to the legacy hybrid shape
     * expected by HybridTransformer and its formatters/utilities.
     */
    _fromAggregatedToHybrid(agg) {
        if (!agg || typeof agg !== 'object') return null;
        const md = agg.marketData || {};
        const sd = agg.supplyData || {};
        const meta = agg.metadata || {};

        const networkBreakdown = Array.isArray(sd.networkBreakdown)
            ? sd.networkBreakdown.map((n) => ({
                network: n.network || n.platform || null,
                supply: n.supply ?? null,
                share: n.percentage ?? null,
                contract: n.contractAddress || null,
            }))
            : [];

        // Build minimal source-like containers to keep downstream helpers working
        const cmcContainer = (() => {
            const firstPlatform = Array.isArray(agg.platforms) && agg.platforms.length > 0 ? agg.platforms[0] : null;
            return firstPlatform || meta.logoUrl || meta.description
                ? {
                    platform: firstPlatform ? { name: firstPlatform.name } : undefined,
                    description: meta.description || null,
                    marketData: null
                }
                : undefined;
        })();

        const messariContainer = (meta.logoUrl || meta.description)
            ? {
                profile: { images: { logo: meta.logoUrl || null } },
                description: meta.description || null
            }
            : undefined;

        const cgkoContainer = meta.description
            ? { description: meta.description, marketData: null }
            : undefined;

        const defillamaContainer = networkBreakdown.length
            ? { networkBreakdown, chainData: null }
            : undefined;

        return {
            id: agg.id || null,
            name: agg.name,
            symbol: agg.symbol,
            slug: agg.slug || (agg.symbol || '').toLowerCase(),
            imageUrl: agg.imageUrl || (meta.logoUrl || null),
            price: md.price ?? null,
            market_cap: md.marketCap ?? (sd.circulating && md.price ? sd.circulating * md.price : null),
            volume_24h: md.volume24h ?? null,
            percent_change_24h: md.percentChange24h ?? null,
            cmc_rank: md.rank ?? null,
            circulating_supply: sd.circulating ?? null,
            total_supply: sd.total ?? null,
            networkBreakdown,
            tags: Array.isArray(meta.tags) ? meta.tags : ['stablecoin'],
            source: 'aggregated',
            _cmc: cmcContainer,
            _messari: messariContainer,
            _cgko: cgkoContainer,
            _defillama: defillamaContainer
        };
    }
}

module.exports = HybridTransformerAdapter;
