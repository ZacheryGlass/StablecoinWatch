const Stablecoin = require('../models/stablecoin');
const Platform = require('../models/platform');

class HybridTransformer {
    constructor() {
        this.stablecoins = [];
        this.metrics = { totalMCap: 0, totalVolume: 0, lastUpdated: null };
    }

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

            if (!sc.cmc) sc.cmc = {};
            if (!sc.cgko) sc.cgko = {};

            if (typeof hybrid.market_cap === 'number') this.metrics.totalMCap += hybrid.market_cap;
            if (typeof hybrid.volume_24h === 'number') this.metrics.totalVolume += hybrid.volume_24h;

            this.stablecoins.push(sc);
        }

        this.stablecoins.sort((a, b) => (b.main.circulating_mcap || 0) - (a.main.circulating_mcap || 0));
    }

    getCoinImageUrl(hybrid) {
        if (hybrid.id) {
            return `https://s2.coinmarketcap.com/static/img/coins/64x64/${hybrid.id}.png`;
        }
        if (hybrid._messari?.profile?.images?.logo) {
            return hybrid._messari.profile.images.logo;
        }
        return null;
    }

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

    extractPlatformsFromHybrid(hybrid) {
        const platforms = [];
        const seen = new Set();
        try {
            if (Array.isArray(hybrid.networkBreakdown)) {
                console.log(`[Transformer] Using networkBreakdown for ${hybrid.symbol}:`, hybrid.networkBreakdown.map(n=>n.network||n.name));
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
                console.log(`[Transformer] Using CMC platform fallback for ${hybrid.symbol}:`, hybrid._cmc.platform.name);
                const normalized = this.normalizePlatformName(hybrid._cmc.platform.name);
                if (!seen.has(normalized)) {
                    seen.add(normalized);
                    platforms.push(new Platform(normalized));
                }
            } else if (Array.isArray(hybrid.tags)) {
                console.log(`[Transformer] Using tags fallback for ${hybrid.symbol}:`, hybrid.tags);
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
            console.log(`[Transformer] No platform data found for ${hybrid.symbol}; defaulting to Unknown`);
            platforms.push(new Platform('Unknown'));
        }
        return platforms;
    }

    generateDescription(hybrid) {
        const tags = hybrid.tags ? hybrid.tags.join(', ') : '';
        const source = hybrid.source === 'hybrid' ? 'CMC + Messari' : 
                       hybrid.source === 'cmc-only' ? 'CoinMarketCap' : 'Messari';
        return `${hybrid.name} is a stablecoin tracked by ${source}. ${tags ? `Tags: ${tags}` : ''}`.trim();
    }

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

    formatNumber(num, includeDollarSign = true) {
        if (typeof num !== 'number' || !isFinite(num)) return 'No data';
        const prefix = includeDollarSign ? '$' : '';
        if (num >= 1e9) return prefix + (num / 1e9).toFixed(1) + 'B';
        if (num >= 1e6) return prefix + (num / 1e6).toFixed(1) + 'M';
        if (num >= 1e3) return prefix + (num / 1e3).toFixed(1) + 'K';
        return prefix + num.toFixed(includeDollarSign ? 2 : 0);
    }

    slugify(text) {
        if (!text) return '';
        return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    }

    getStablecoins() { return this.stablecoins; }
    getData() { return { stablecoins: this.stablecoins, metrics: this.metrics, platform_data: this.calculatePlatformData() }; }
}

module.exports = HybridTransformer;
