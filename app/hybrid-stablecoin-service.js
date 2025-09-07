/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
const { MessariClient } = require('@messari/sdk');
const axios = require('axios');
const Stablecoin = require('../models/stablecoin');
const Platform = require('../models/platform');

/*---------------------------------------------------------
    HYBRID STABLECOIN SERVICE CLASS
    Combines CoinMarketCap and Messari data for comprehensive stablecoin coverage
---------------------------------------------------------*/
class HybridStablecoinService {
    constructor() {
        this.stablecoins = [];
        this.platform_data = [];
        this.metrics = { totalMCap: 0, totalVolume: 0, lastUpdated: null };

        // API Configuration
        this.MESSARI_API_KEY = process.env.MESSARI_API_KEY || '';
        this.CMC_API_KEY = process.env.CMC_API_KEY || '';
        
        if (!this.CMC_API_KEY) {
            console.warn('CMC_API_KEY not set. Will only fetch Messari data.');
        }
        if (!this.MESSARI_API_KEY) {
            console.warn('MESSARI_API_KEY not set. Will only fetch CMC data.');
        }

        // Initialize Messari client
        if (this.MESSARI_API_KEY) {
            this.messariClient = new MessariClient({ apiKey: this.MESSARI_API_KEY });
        }

        // Matching configuration
        this.MATCH_THRESHOLD = 0.8; // Similarity threshold for name matching
        this.BATCH_SIZE = 50;
    }

    /*---------------------------------------------------------
    Public: fetchStablecoinData
    Description: Main method to fetch and merge stablecoin data from both sources
    ---------------------------------------------------------*/
    async fetchStablecoinData() {
        console.log('🚀 Starting hybrid stablecoin data fetch...');
        
        try {
            // Fetch data from both APIs in parallel
            const [cmcData, messariData] = await Promise.allSettled([
                this.fetchCmcStablecoins(),
                this.fetchMessariStablecoins()
            ]);

            // Process results
            const cmcStablecoins = cmcData.status === 'fulfilled' ? cmcData.value : [];
            const messariStablecoins = messariData.status === 'fulfilled' ? messariData.value : [];

            console.log(`✓ CMC: ${cmcStablecoins.length} stablecoins`);
            console.log(`✓ Messari: ${messariStablecoins.length} stablecoins`);

            if (cmcData.status === 'rejected') {
                console.error('CMC API failed:', cmcData.reason.message);
            }
            if (messariData.status === 'rejected') {
                console.error('Messari API failed:', messariData.reason.message);
            }

            // Merge the datasets
            const mergedStablecoins = this.mergeStablecoinData(cmcStablecoins, messariStablecoins);
            
            // Transform to internal format
            this.transformHybridData(mergedStablecoins);
            this.platform_data = this.calculatePlatformData();
            this.metrics.lastUpdated = new Date().toISOString();
            
            // Add formatted metrics
            this.metrics.totalMCap_s = this.formatNumber(this.metrics.totalMCap);
            this.metrics.totalVolume_s = this.formatNumber(this.metrics.totalVolume);

            console.log(`🎯 Final result: ${this.stablecoins.length} hybrid stablecoins`);
            return this.stablecoins;

        } catch (error) {
            console.error('Hybrid data fetch failed:', error.message);
            console.error('Stack trace:', error.stack);
            return this.stablecoins; // Return existing data
        }
    }

    /*---------------------------------------------------------
    Internal: fetchCmcStablecoins
    Description: Fetch stablecoins from CoinMarketCap API
    ---------------------------------------------------------*/
    async fetchCmcStablecoins() {
        if (!this.CMC_API_KEY) {
            console.log('⏭️  Skipping CMC fetch (no API key)');
            return [];
        }

        console.log('📊 Fetching stablecoins from CoinMarketCap...');
        
        const url = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest';
        const headers = {
            'Accepts': 'application/json',
            'X-CMC_PRO_API_KEY': this.CMC_API_KEY,
        };
        
        const parameters = {
            start: '1',
            limit: '5000',
            aux: 'tags'
        };

        const response = await axios.get(url, { headers, params: parameters });
        const data = response.data;

        if (!data.data) {
            throw new Error('No data received from CoinMarketCap API');
        }

        // Filter for stablecoins by tag and price range (exclude obvious non-stablecoins)
        const stablecoins = data.data.filter(crypto => {
            const hasStablecoinTag = crypto.tags && crypto.tags.includes('stablecoin');
            const price = crypto.quote?.USD?.price;
            const isReasonablePrice = !price || (price >= 0.50 && price <= 2.00); // Filter out obvious non-stablecoins
            
            return hasStablecoinTag && isReasonablePrice;
        });

        console.log(`✓ CMC returned ${stablecoins.length} tagged stablecoins`);
        return stablecoins;
    }

    /*---------------------------------------------------------
    Internal: fetchMessariStablecoins  
    Description: Fetch stablecoins from Messari API
    ---------------------------------------------------------*/
    async fetchMessariStablecoins() {
        if (!this.MESSARI_API_KEY) {
            console.log('⏭️  Skipping Messari fetch (no API key)');
            return [];
        }

        console.log('📈 Fetching stablecoins from Messari...');
        
        const path = '/metrics/v2/stablecoins';
        const data = await this.messariClient.request({ method: 'GET', path });
        
        const list = Array.isArray(data?.data) ? data.data : data;
        console.log(`✓ Messari returned ${list ? list.length : 0} stablecoins`);
        
        return list || [];
    }

    /*---------------------------------------------------------
    Internal: mergeStablecoinData
    Description: Match and merge stablecoin data from both sources
    ---------------------------------------------------------*/
    mergeStablecoinData(cmcStablecoins, messariStablecoins) {
        console.log('🔗 Merging stablecoin datasets...');
        
        const merged = new Map(); // Use symbol as key to avoid duplicates
        const matchedMessariIds = new Set(); // Track which Messari coins we've matched

        // Step 1: Process CMC stablecoins (primary source)
        for (const cmcCoin of cmcStablecoins) {
            const symbol = cmcCoin.symbol.toUpperCase();
            
            // Try to find matching Messari coin
            const messariMatch = this.findMessariMatch(cmcCoin, messariStablecoins);
            
            if (messariMatch) {
                matchedMessariIds.add(messariMatch.id);
                // Merge CMC + Messari data
                merged.set(symbol, this.createHybridCoin(cmcCoin, messariMatch));
            } else {
                // CMC-only coin
                merged.set(symbol, this.createCmcOnlyCoin(cmcCoin));
            }
        }

        // Step 2: Add unmatched Messari coins
        for (const messariCoin of messariStablecoins) {
            if (!matchedMessariIds.has(messariCoin.id)) {
                const symbol = messariCoin.symbol.toUpperCase();
                if (!merged.has(symbol)) { // Avoid overwriting CMC data
                    merged.set(symbol, this.createMessariOnlyCoin(messariCoin));
                }
            }
        }

        const result = Array.from(merged.values());
        console.log(`✓ Merged into ${result.length} unique stablecoins`);
        console.log(`  - Hybrid (CMC+Messari): ${result.filter(c => c.source === 'hybrid').length}`);
        console.log(`  - CMC only: ${result.filter(c => c.source === 'cmc-only').length}`);
        console.log(`  - Messari only: ${result.filter(c => c.source === 'messari-only').length}`);

        return result;
    }

    /*---------------------------------------------------------
    Internal: findMessariMatch
    Description: Find matching Messari coin for a CMC coin
    ---------------------------------------------------------*/
    findMessariMatch(cmcCoin, messariStablecoins) {
        // Primary match: exact symbol match
        const exactMatch = messariStablecoins.find(m => 
            m.symbol.toUpperCase() === cmcCoin.symbol.toUpperCase()
        );
        
        if (exactMatch) {
            return exactMatch;
        }

        // Secondary match: name similarity (for edge cases)
        const nameMatches = messariStablecoins.filter(m => 
            this.calculateSimilarity(m.name, cmcCoin.name) > this.MATCH_THRESHOLD
        );

        if (nameMatches.length === 1) {
            return nameMatches[0];
        }

        return null; // No match found
    }

    /*---------------------------------------------------------
    Internal: createHybridCoin
    Description: Create merged coin object from CMC + Messari data
    ---------------------------------------------------------*/
    createHybridCoin(cmcCoin, messariCoin) {
        return {
            // Identity (CMC preferred)
            id: cmcCoin.id,
            name: cmcCoin.name || messariCoin.name,
            symbol: cmcCoin.symbol || messariCoin.symbol,
            slug: cmcCoin.slug || messariCoin.slug,
            
            // Market Data (CMC)
            price: cmcCoin.quote?.USD?.price,
            market_cap: cmcCoin.quote?.USD?.market_cap,
            volume_24h: cmcCoin.quote?.USD?.volume_24h,
            percent_change_24h: cmcCoin.quote?.USD?.percent_change_24h,
            cmc_rank: cmcCoin.cmc_rank,
            
            // Supply Data (Messari preferred, CMC fallback)
            circulating_supply: messariCoin.supply?.circulating || 
                               (cmcCoin.quote?.USD?.market_cap && cmcCoin.quote?.USD?.price ? 
                                cmcCoin.quote.USD.market_cap / cmcCoin.quote.USD.price : null),
            total_supply: messariCoin.supply?.total,
            
            // Technical Data (Messari only)
            networkBreakdown: messariCoin.networkBreakdown,
            transfers: messariCoin.transfers,
            
            // Metadata
            tags: cmcCoin.tags || [],
            date_added: cmcCoin.date_added,
            source: 'hybrid',
            
            // Original objects for debugging
            _cmc: cmcCoin,
            _messari: messariCoin
        };
    }

    /*---------------------------------------------------------
    Internal: createCmcOnlyCoin
    Description: Create coin object from CMC data only
    ---------------------------------------------------------*/
    createCmcOnlyCoin(cmcCoin) {
        return {
            id: cmcCoin.id,
            name: cmcCoin.name,
            symbol: cmcCoin.symbol,
            slug: cmcCoin.slug,
            
            price: cmcCoin.quote?.USD?.price,
            market_cap: cmcCoin.quote?.USD?.market_cap,
            volume_24h: cmcCoin.quote?.USD?.volume_24h,
            percent_change_24h: cmcCoin.quote?.USD?.percent_change_24h,
            cmc_rank: cmcCoin.cmc_rank,
            
            // Calculate supply from market data
            circulating_supply: (cmcCoin.quote?.USD?.market_cap && cmcCoin.quote?.USD?.price ? 
                               cmcCoin.quote.USD.market_cap / cmcCoin.quote.USD.price : null),
            total_supply: null,
            
            networkBreakdown: null,
            transfers: null,
            
            tags: cmcCoin.tags || [],
            date_added: cmcCoin.date_added,
            source: 'cmc-only',
            
            _cmc: cmcCoin
        };
    }

    /*---------------------------------------------------------
    Internal: createMessariOnlyCoin
    Description: Create coin object from Messari data only
    ---------------------------------------------------------*/
    createMessariOnlyCoin(messariCoin) {
        return {
            id: messariCoin.id,
            name: messariCoin.name,
            symbol: messariCoin.symbol,
            slug: messariCoin.slug,
            
            price: 1.0, // Assume $1 for stablecoins
            market_cap: messariCoin.supply?.circulating ? messariCoin.supply.circulating * 1.0 : null,
            volume_24h: null,
            percent_change_24h: null,
            cmc_rank: null,
            
            circulating_supply: messariCoin.supply?.circulating,
            total_supply: messariCoin.supply?.total,
            
            networkBreakdown: messariCoin.networkBreakdown,
            transfers: messariCoin.transfers,
            
            tags: ['stablecoin'],
            date_added: null,
            source: 'messari-only',
            
            _messari: messariCoin
        };
    }

    /*---------------------------------------------------------
    Internal: calculateSimilarity
    Description: Calculate string similarity for name matching
    ---------------------------------------------------------*/
    calculateSimilarity(str1, str2) {
        if (!str1 || !str2) return 0;
        
        const s1 = str1.toLowerCase();
        const s2 = str2.toLowerCase();
        
        if (s1 === s2) return 1;
        
        // Simple Levenshtein distance based similarity
        const matrix = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
        
        for (let i = 0; i <= s1.length; i += 1) {
            matrix[0][i] = i;
        }
        
        for (let j = 0; j <= s2.length; j += 1) {
            matrix[j][0] = j;
        }
        
        for (let j = 1; j <= s2.length; j += 1) {
            for (let i = 1; i <= s1.length; i += 1) {
                const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,
                    matrix[j - 1][i] + 1,
                    matrix[j - 1][i - 1] + indicator
                );
            }
        }
        
        const maxLength = Math.max(s1.length, s2.length);
        return 1 - (matrix[s2.length][s1.length] / maxLength);
    }

    /*---------------------------------------------------------
    Internal: transformHybridData
    Description: Transform hybrid data to internal Stablecoin format
    ---------------------------------------------------------*/
    transformHybridData(hybridStablecoins) {
        this.stablecoins = [];
        this.metrics.totalMCap = 0;
        this.metrics.totalVolume = 0;

        console.log(`🔄 Transforming ${hybridStablecoins.length} hybrid stablecoins...`);

        for (const hybrid of hybridStablecoins) {
            if (!hybrid) continue;

            const sc = new Stablecoin();
            sc.name = hybrid.name || '';
            sc.symbol = hybrid.symbol || '';
            sc.uri = (hybrid.slug || hybrid.symbol || '').toLowerCase();

            // Set image URL (try CMC first, fallback to Messari pattern)
            sc.img_url = this.getCoinImageUrl(hybrid);

            // Main data (from hybrid object)
            sc.main = {
                price: hybrid.price,
                circulating_mcap: hybrid.market_cap,
                circulating_mcap_s: this.formatNumber(hybrid.market_cap),
                volume_24h: hybrid.volume_24h,
            };

            // Platforms (from Messari network breakdown or fallback)
            sc.platforms = this.extractPlatformsFromHybrid(hybrid);

            // Populate compatibility fields used by views
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

            // Ensure other sources exist to avoid template errors
            if (!sc.cmc) sc.cmc = {};
            if (!sc.cgko) sc.cgko = {};

            // Add to totals
            if (typeof hybrid.market_cap === 'number') this.metrics.totalMCap += hybrid.market_cap;
            if (typeof hybrid.volume_24h === 'number') this.metrics.totalVolume += hybrid.volume_24h;

            this.stablecoins.push(sc);
        }

        // Sort by market cap (descending)
        this.stablecoins.sort((a, b) => (b.main.circulating_mcap || 0) - (a.main.circulating_mcap || 0));
        console.log(`✓ Transformed ${this.stablecoins.length} stablecoins`);
    }

    /*---------------------------------------------------------
    Internal: getCoinImageUrl
    Description: Get coin image URL from available data
    ---------------------------------------------------------*/
    getCoinImageUrl(hybrid) {
        // Try CMC image URL pattern first
        if (hybrid.id) {
            return `https://s2.coinmarketcap.com/static/img/coins/64x64/${hybrid.id}.png`;
        }
        
        // Fallback to Messari pattern if available
        if (hybrid._messari?.profile?.images?.logo) {
            return hybrid._messari.profile.images.logo;
        }
        
        return null;
    }

    /*---------------------------------------------------------
    Internal: extractPlatformsFromHybrid
    Description: Extract platform information from hybrid data
    ---------------------------------------------------------*/
    extractPlatformsFromHybrid(hybrid) {
        const platforms = [];
        
        try {
            // Use Messari network breakdown if available (preferred)
            if (hybrid.networkBreakdown && Array.isArray(hybrid.networkBreakdown)) {
                const platformNames = new Set();
                hybrid.networkBreakdown.forEach(network => {
                    if (network.network) {
                        platformNames.add(network.network);
                    }
                });
                
                platformNames.forEach(name => {
                    platforms.push(new Platform(name));
                });
            }
            // Fallback to CMC platform data if available
            else if (hybrid._cmc?.platform) {
                const cmcPlatform = hybrid._cmc.platform;
                if (cmcPlatform.name) {
                    platforms.push(new Platform(cmcPlatform.name));
                }
            }
            // Try to infer platform from tags
            else if (hybrid.tags && Array.isArray(hybrid.tags)) {
                const platformTags = hybrid.tags.filter(tag => 
                    tag.includes('ethereum') || tag.includes('binance') || tag.includes('solana') ||
                    tag.includes('tron') || tag.includes('polygon') || tag.includes('avalanche')
                );
                
                platformTags.forEach(tag => {
                    if (tag.includes('ethereum')) platforms.push(new Platform(tag));
                    if (tag.includes('binance')) platforms.push(new Platform(tag));
                    if (tag.includes('solana')) platforms.push(new Platform(tag));
                    if (tag.includes('tron')) platforms.push(new Platform(tag));
                    if (tag.includes('polygon')) platforms.push(new Platform(tag));
                    if (tag.includes('avalanche')) platforms.push(new Platform(tag));
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
    Internal: generateDescription
    Description: Generate a description for the hybrid coin
    ---------------------------------------------------------*/
    generateDescription(hybrid) {
        const tags = hybrid.tags ? hybrid.tags.join(', ') : '';
        const source = hybrid.source === 'hybrid' ? 'CMC + Messari' : 
                      hybrid.source === 'cmc-only' ? 'CoinMarketCap' : 'Messari';
        
        return `${hybrid.name} is a stablecoin tracked by ${source}. ${tags ? `Tags: ${tags}` : ''}`.trim();
    }

    /*---------------------------------------------------------
    Internal: Platform utilities (reused from original service)
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

    // Create a URL-safe slug from a platform name
    slugify(text) {
        if (!text) return '';
        return String(text)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    /*---------------------------------------------------------
    Public getters (compatible with existing interface)
    ---------------------------------------------------------*/
    getStablecoins() { return this.stablecoins; }
    getMetrics() { return this.metrics; }
    getData() { return { stablecoins: this.stablecoins, metrics: this.metrics, platform_data: this.platform_data || [] }; }
}

module.exports = HybridStablecoinService;
