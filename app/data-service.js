/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
const { MessariClient } = require('@messari/sdk');
const Stablecoin = require('../models/stablecoin');
const Platform = require('../models/platform');

/*---------------------------------------------------------
    DATA SERVICE CLASS (Rewritten to use Messari SDK)
---------------------------------------------------------*/
class DataService {
    constructor() {
        this.stablecoins = [];
        this.platform_data = [];
        this.metrics = { totalMCap: 0, totalVolume: 0, lastUpdated: null };

        this.MESSARI_API_KEY = process.env.MESSARI_API_KEY || '';
        if (!this.MESSARI_API_KEY) {
            console.warn('MESSARI_API_KEY not set. Backend will not fetch Messari data.');
        }

        this.client = new MessariClient({ apiKey: this.MESSARI_API_KEY });
        this.BATCH_SIZE = 50;
    }

    /*---------------------------------------------------------
    Public: fetchStablecoinData
    Description: Fetch stablecoins from Messari Stablecoins endpoint, hydrate with asset details
    ---------------------------------------------------------*/
    async fetchStablecoinData() {
        if (!this.MESSARI_API_KEY) throw new Error('Missing MESSARI_API_KEY');

        console.log('Fetching Messari stablecoins via @messari/sdk ...');
        // 1) Get canonical list of stablecoins
        const slugs = await this.getStablecoinSlugsFromMetrics();
        if (!Array.isArray(slugs) || slugs.length === 0) throw new Error('No stablecoins returned');

        // 2) Hydrate with v2 asset details (profiles + market data)
        const assets = await this.fetchAssetsBySlugs(slugs);

        // 3) Transform → Stablecoin[] and aggregate metrics
        this.transformAssets(assets);
        this.platform_data = this.calculatePlatformData();
        this.metrics.lastUpdated = new Date().toISOString();

        console.log(`Stablecoins fetched: ${this.stablecoins.length}`);
        return this.stablecoins;
    }

    /*---------------------------------------------------------
    Internal: getStablecoinSlugsFromMetrics (uses client.request)
    ---------------------------------------------------------*/
    async getStablecoinSlugsFromMetrics() {
        // SDK currently does not expose Stablecoins endpoints; use client.request directly
        const path = '/metrics/v2/stablecoins';
        const data = await this.client.request({ method: 'GET', path });
        const list = Array.isArray(data?.data) ? data.data : data; // handle wrapped/unwrapped
        const slugs = (list || [])
            .map((item) => item?.slug || item?.id || item?.symbol?.toLowerCase())
            .filter(Boolean);
        return Array.from(new Set(slugs));
    }

    /*---------------------------------------------------------
    Internal: fetchAssetsBySlugs (batches)
    ---------------------------------------------------------*/
    async fetchAssetsBySlugs(slugs) {
        const results = [];
        for (let i = 0; i < slugs.length; i += this.BATCH_SIZE) {
            const batch = slugs.slice(i, i + this.BATCH_SIZE).join(',');
            const resp = await this.client.asset.getAssetDetails({ slugs: batch });
            const items = resp?.data || resp || [];
            results.push(...items);
        }
        return results;
    }

    /*---------------------------------------------------------
    Internal: transform Messari assets → Stablecoin list
    ---------------------------------------------------------*/
    transformAssets(assets) {
        this.stablecoins = [];
        this.metrics.totalMCap = 0;
        this.metrics.totalVolume = 0;

        for (const asset of assets) {
            if (!asset) continue;

            const sc = new Stablecoin();
            sc.name = asset.name || asset.slug || asset.symbol || '';
            sc.symbol = asset.symbol || '';
            sc.uri = (asset.slug || asset.symbol || '').toLowerCase();

            // Logo
            sc.img_url = asset?.profile?.images?.logo || asset?.profile?.images?.thumb || null;

            // Price + Market Cap
            const md = asset?.market_data || {};
            const price = typeof md?.price_usd === 'number' ? md.price_usd : null;
            let mcap = null;
            if (typeof asset?.metrics?.marketcap?.current_usd === 'number') {
                mcap = asset.metrics.marketcap.current_usd;
            } else if (typeof price === 'number' && typeof asset?.supply?.circulating === 'number') {
                mcap = price * asset.supply.circulating;
            }
            const vol24h = typeof md?.real_volume_last_24_hours === 'number' ? md.real_volume_last_24_hours : null;

            sc.main = {
                price,
                circulating_mcap: mcap,
                circulating_mcap_s: this.formatNumber(mcap),
                volume_24h: vol24h,
            };

            // Platforms (best-effort)
            sc.platforms = this.extractPlatforms(asset);

            // Populate compatibility fields used by views
            const totalSupply = typeof asset?.supply?.total === 'number' ? asset.supply.total : null;
            const circSupply = typeof asset?.supply?.circulating === 'number' ? asset.supply.circulating : null;

            sc.msri = {
                price: price,
                circulating_mcap_s: this.formatNumber(mcap),
                total_supply_s: this.formatNumber(totalSupply, false),
                circulating_supply_s: this.formatNumber(circSupply, false),
                volume_s: this.formatNumber(vol24h),
                desc: asset?.profile?.general?.overview || asset?.profile?.technology?.overview || null,
            };

            // Provide StablecoinWatch aggregate for charts (denominator expects numeric circulating_supply)
            sc.scw = {
                price: price,
                circulating_mcap_s: this.formatNumber(mcap),
                total_supply_s: this.formatNumber(totalSupply, false),
                circulating_supply_s: this.formatNumber(circSupply, false),
                volume_s: this.formatNumber(vol24h),
                circulating_supply: circSupply,
            };

            // Ensure other sources exist to avoid template errors
            if (!sc.cmc) sc.cmc = {};
            if (!sc.cgko) sc.cgko = {};

            if (typeof mcap === 'number') this.metrics.totalMCap += mcap;
            if (typeof vol24h === 'number') this.metrics.totalVolume += vol24h;

            this.stablecoins.push(sc);
        }

        this.stablecoins.sort((a, b) => (b.main.circulating_mcap || 0) - (a.main.circulating_mcap || 0));
    }

    /*---------------------------------------------------------
    Internal: extractPlatforms from asset profile
    ---------------------------------------------------------*/
    extractPlatforms(asset) {
        const out = [];
        const add = (name) => {
            if (!name) return;
            const clean = this.readablePlatform(String(name).toLowerCase());
            if (!out.find((p) => p.name === clean)) out.push(new Platform(clean));
        };

        try {
            if (Array.isArray(asset?.profile?.economics?.usage?.on_chain_metrics?.smart_contract_platforms)) {
                for (const r of asset.profile.economics.usage.on_chain_metrics.smart_contract_platforms) add(r?.name || r);
            }
            if (asset?.profile?.platform) add(asset.profile.platform);
        } catch (_) {
            // ignore parsing errors
        }

        if (out.length === 0) out.push(new Platform('Unknown'));
        return out;
    }

    /*---------------------------------------------------------
    Internal: aggregate platform data
    ---------------------------------------------------------*/
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
            .map((x) => ({ ...x, mcap_sum_s: this.formatNumber(x.mcap_sum) }))
            .sort((a, b) => b.mcap_sum - a.mcap_sum);
    }

    /*---------------------------------------------------------
    Utils
    ---------------------------------------------------------*/
    readablePlatform(id) {
        const m = {
            'ethereum': 'Ethereum',
            'binance-smart-chain': 'Binance Smart Chain',
            'tron': 'Tron',
            'solana': 'Solana',
            'polygon-pos': 'Polygon',
            'arbitrum-one': 'Arbitrum',
            'optimistic-ethereum': 'Optimism',
            'avalanche': 'Avalanche',
            'xdai': 'Gnosis Chain',
            'fantom': 'Fantom',
            'celo': 'Celo',
            'moonbeam': 'Moonbeam',
            'cronos': 'Cronos',
            'near-protocol': 'NEAR Protocol',
            'harmony-shard-0': 'Harmony',
            'the-open-network': 'TON',
            'algorand': 'Algorand',
            'stellar': 'Stellar',
            'cardano': 'Cardano',
        };
        return m[id] || id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' ');
    }

    formatNumber(num, includeDollarSign = true) {
        if (typeof num !== 'number' || !isFinite(num)) return 'No data';
        const prefix = includeDollarSign ? '$' : '';
        if (num >= 1e9) return prefix + (num / 1e9).toFixed(1) + 'B';
        if (num >= 1e6) return prefix + (num / 1e6).toFixed(1) + 'M';
        if (num >= 1e3) return prefix + (num / 1e3).toFixed(1) + 'K';
        return prefix + num.toFixed(includeDollarSign ? 2 : 0);
    }

    /*---------------------------------------------------------
    Public getters
    ---------------------------------------------------------*/
    getStablecoins() { return this.stablecoins; }
    getMetrics() { return this.metrics; }
    getData() { return { stablecoins: this.stablecoins, metrics: this.metrics, platform_data: this.platform_data || [] }; }
}

module.exports = DataService;
