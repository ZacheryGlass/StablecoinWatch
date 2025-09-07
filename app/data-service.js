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
    Description: Fetch stablecoins directly from Messari Stablecoins endpoint
    ---------------------------------------------------------*/
    async fetchStablecoinData() {
        if (!this.MESSARI_API_KEY) {
            console.warn('Missing MESSARI_API_KEY - cannot fetch stablecoin data');
            return this.stablecoins;
        }

        try {
            console.log('Fetching Messari stablecoins via @messari/sdk ...');
            
            // Get stablecoin data directly from the stablecoins endpoint
            const stablecoinsData = await this.getStablecoinDataFromMetrics();
            if (!Array.isArray(stablecoinsData) || stablecoinsData.length === 0) {
                console.warn('No stablecoins returned from API');
                return this.stablecoins;
            }

            // Transform the stablecoin data
            this.transformStablecoinData(stablecoinsData);
            this.platform_data = this.calculatePlatformData();
            this.metrics.lastUpdated = new Date().toISOString();
            
            // Add formatted header metrics
            this.metrics.totalMCap_s = this.formatNumber(this.metrics.totalMCap);
            this.metrics.totalVolume_s = this.formatNumber(this.metrics.totalVolume);

            console.log(`✓ Successfully fetched ${this.stablecoins.length} stablecoins`);
            return this.stablecoins;
            
        } catch (error) {
            console.error('Error fetching stablecoin data:', error.message);
            console.error('Stack trace:', error.stack);
            return this.stablecoins; // Return existing data if available
        }
    }

    /*---------------------------------------------------------
    Internal: getStablecoinDataFromMetrics (uses client.request)
    ---------------------------------------------------------*/
    async getStablecoinDataFromMetrics() {
        console.log('Calling /metrics/v2/stablecoins endpoint...');
        const path = '/metrics/v2/stablecoins';
        const data = await this.client.request({ method: 'GET', path });
        
        // Handle different response structures
        const list = Array.isArray(data?.data) ? data.data : data;
        console.log(`Raw API response contains ${list ? list.length : 0} stablecoins`);
        
        if (list && list.length > 0) {
            console.log('Sample stablecoin data structure:', Object.keys(list[0]));
        }
        
        return list || [];
    }

    /*---------------------------------------------------------
    Internal: transformStablecoinData - Convert API data to app format
    ---------------------------------------------------------*/
    transformStablecoinData(stablecoinsData) {
        this.stablecoins = [];
        this.metrics.totalMCap = 0;
        this.metrics.totalVolume = 0;

        console.log(`Transforming ${stablecoinsData.length} stablecoins...`);

        for (const stablecoin of stablecoinsData) {
            if (!stablecoin) continue;

            const sc = new Stablecoin();
            sc.name = stablecoin.name || stablecoin.slug || stablecoin.symbol || '';
            sc.symbol = stablecoin.symbol || '';
            sc.uri = (stablecoin.slug || stablecoin.symbol || '').toLowerCase();

            // Use available data from the stablecoins endpoint
            const supply = stablecoin.supply || {};
            const circulating = typeof supply.circulating === 'number' ? supply.circulating : null;
            const total = typeof supply.total === 'number' ? supply.total : null;
            
            // For now, set price to $1 (typical for stablecoins) and calculate basic metrics
            const price = 1.0; // Most stablecoins target $1
            const mcap = circulating ? circulating * price : null;

            sc.main = {
                price: price,
                circulating_mcap: mcap,
                circulating_mcap_s: this.formatNumber(mcap),
                volume_24h: null, // Not available in stablecoins endpoint
            };

            // Extract platforms from networkBreakdown if available
            sc.platforms = this.extractPlatformsFromNetworkBreakdown(stablecoin);

            // Populate compatibility fields used by views
            sc.msri = {
                price: price,
                circulating_mcap_s: this.formatNumber(mcap),
                total_supply_s: this.formatNumber(total, false),
                circulating_supply_s: this.formatNumber(circulating, false),
                volume_s: 'No data',
                desc: `${stablecoin.name} is a stablecoin tracked by Messari.`,
            };

            sc.scw = {
                price: price,
                circulating_mcap_s: this.formatNumber(mcap),
                total_supply_s: this.formatNumber(total, false),
                circulating_supply_s: this.formatNumber(circulating, false),
                volume_s: 'No data',
                circulating_supply: circulating,
            };

            // Ensure other sources exist to avoid template errors
            if (!sc.cmc) sc.cmc = {};
            if (!sc.cgko) sc.cgko = {};

            // Add to totals
            if (typeof mcap === 'number') this.metrics.totalMCap += mcap;

            this.stablecoins.push(sc);
        }

        // Sort by market cap
        this.stablecoins.sort((a, b) => (b.main.circulating_mcap || 0) - (a.main.circulating_mcap || 0));
        console.log(`✓ Transformed ${this.stablecoins.length} stablecoins`);
    }

    /*---------------------------------------------------------
    Internal: extractPlatformsFromNetworkBreakdown
    ---------------------------------------------------------*/
    extractPlatformsFromNetworkBreakdown(stablecoin) {
        const platforms = [];
        
        try {
            const networkBreakdown = stablecoin.networkBreakdown || [];
            if (Array.isArray(networkBreakdown)) {
                const platformNames = new Set();
                networkBreakdown.forEach(network => {
                    if (network.network) {
                        const readable = this.readablePlatform(network.network.toLowerCase());
                        platformNames.add(readable);
                    }
                });
                
                platformNames.forEach(name => {
                    platforms.push(new Platform(name));
                });
            }
        } catch (error) {
            console.warn('Error extracting platforms:', error.message);
        }
        
        if (platforms.length === 0) {
            platforms.push(new Platform('Unknown'));
        }
        
        return platforms;
    }

    /*---------------------------------------------------------
    Internal: Legacy transformAssets method (kept for compatibility)
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
    Internal: Legacy extractPlatforms method (kept for compatibility)
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
            .map((x) => ({
                ...x,
                // add stable slug for URL routing
                uri: this.slugify(x.name),
                mcap_sum_s: this.formatNumber(x.mcap_sum),
            }))
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

    // Create a URL-safe slug from a platform name
    slugify(text) {
        if (!text) return '';
        return String(text)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    /*---------------------------------------------------------
    Public getters
    ---------------------------------------------------------*/
    getStablecoins() { return this.stablecoins; }
    getMetrics() { return this.metrics; }
    getData() { return { stablecoins: this.stablecoins, metrics: this.metrics, platform_data: this.platform_data || [] }; }
}

module.exports = DataService;
