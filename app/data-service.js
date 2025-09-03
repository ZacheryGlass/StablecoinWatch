/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
const axios = require('axios');
const { getTokenPlatform } = require('./util');
const Stablecoin = require('../models/stablecoin');
const Platform = require('../models/platform');

/*---------------------------------------------------------
    DATA SERVICE CLASS
---------------------------------------------------------*/
class DataService {
    constructor() {
        this.stablecoins = [];
        this.metrics = {
            totalMCap: 0,
            totalVolume: 0,
            lastUpdated: null
        };
    }

    /*---------------------------------------------------------
    Function: isStablecoin
    Description: Determine if a coin is a stablecoin using Messari classification
    ---------------------------------------------------------*/
    isStablecoin(coin) {
        // Only use official Messari classification - no fallbacks or patterns
        
        // Check sector (v1 API profile.sector)
        if (coin.profile?.sector === 'Stablecoins') {
            return true;
        }
        
        // Check sectors array (v2 API misc_data.sectors)
        if (coin.misc_data?.sectors?.includes('Stablecoins')) {
            return true;
        }
        
        return false;
    }

    /*---------------------------------------------------------
    Function: fetchStablecoinData
    Description: Fetch stablecoin data from Messari API
    ---------------------------------------------------------*/
    async fetchStablecoinData() {
        try {
            console.log('Fetching stablecoin data from Messari...');
            
            // Use v1 API which has sector classification in profile
            const limit = global.DEBUG ? 200 : 1000;
            const response = await axios.get(`https://data.messari.io/api/v1/assets?limit=${limit}`);
            const allCoins = response.data.data;

            this.stablecoins = [];
            let totalMCap = 0;
            let totalVolume = 0;

            allCoins.forEach((coin) => {
                if (this.isStablecoin(coin)) {
                    let platforms = [];

                    try {
                        // Use contract_addresses array if available for detailed platform info
                        if (coin.profile.contract_addresses && coin.profile.contract_addresses.length > 0) {
                            const platformMap = new Map();
                            coin.profile.contract_addresses.forEach((contract) => {
                                // Convert platform names to friendly format
                                let platformName = this.getPlatformName(contract.platform);
                                if (!platformMap.has(platformName)) {
                                    platformMap.set(platformName, new Platform(platformName));
                                }
                            });
                            platforms = Array.from(platformMap.values());
                        }
                        // Fallback to token_details.type if contract_addresses not available
                        else if (coin.profile.token_details && coin.profile.token_details.type) {
                            const tokenTypes = coin.profile.token_details.type.split(', ');
                            tokenTypes.forEach((tokenType) => {
                                let platformName = getTokenPlatform(tokenType);
                                if (platformName === 'Native') platformName = coin.name;
                                platforms.push(new Platform(platformName));
                            });
                        }
                    } catch (error) {
                        console.warn(`Failed to get platforms for Messari coin: ${coin.name}`);
                    }
                    
                    // Ensure every coin has at least one platform
                    if (platforms.length === 0) {
                        platforms.push(new Platform('Unknown'));
                    }

                    const stablecoin = new Stablecoin();
                    stablecoin.name = coin.name;
                    stablecoin.symbol = coin.symbol;
                    stablecoin.platforms = platforms;
                    stablecoin.uri = coin.slug || coin.symbol.toLowerCase();
                    stablecoin.img_url = null; // Will use default image
                    
                    // Set main data (primary data source)  
                    stablecoin.main = {
                        price: coin.metrics?.market_data?.price_usd || null,
                        circulating_mcap: coin.metrics?.marketcap?.current_marketcap_usd || null,
                        volume: coin.metrics?.market_data?.real_volume_last_24_hours || null,
                        circulating_supply: coin.metrics?.supply?.circulating || null
                    };

                    // Format large numbers for display
                    if (stablecoin.main.circulating_mcap) {
                        stablecoin.main.circulating_mcap_s = this.formatNumber(stablecoin.main.circulating_mcap);
                        totalMCap += stablecoin.main.circulating_mcap;
                    }

                    if (stablecoin.main.volume) {
                        stablecoin.main.volume_s = this.formatNumber(stablecoin.main.volume);
                        totalVolume += stablecoin.main.volume;
                    }

                    // Add total supply data (using circulating as fallback if y_plus10 not available)
                    stablecoin.main.total_supply = coin.metrics?.supply?.y_plus10 || coin.metrics?.supply?.circulating || null;
                    if (stablecoin.main.total_supply) {
                        stablecoin.main.total_supply_s = this.formatNumber(stablecoin.main.total_supply, false);
                    }

                    // Set backup data sources for template compatibility (simplified)
                    stablecoin.msri = { ...stablecoin.main };
                    stablecoin.scw = { ...stablecoin.main };
                    stablecoin.cmc = { ...stablecoin.main };
                    stablecoin.cgko = { ...stablecoin.main };

                    this.stablecoins.push(stablecoin);
                }
            });

            // Update metrics
            this.metrics = {
                totalMCap,
                totalVolume,
                lastUpdated: new Date()
            };

            // Calculate platform_data dynamically from stablecoins
            this.platform_data = this.calculatePlatformData();

            console.log(`Successfully fetched ${this.stablecoins.length} stablecoins`);
            return this.stablecoins;

        } catch (error) {
            console.error('Error fetching stablecoin data:', error);
            throw error;
        }
    }

    /*---------------------------------------------------------
    Function: calculatePlatformData
    Description: Calculate aggregated platform data from stablecoins
    ---------------------------------------------------------*/
    calculatePlatformData() {
        const platformMap = new Map();

        this.stablecoins.forEach((stablecoin) => {
            if (stablecoin.platforms && stablecoin.main.circulating_mcap) {
                stablecoin.platforms.forEach((platform) => {
                    if (!platformMap.has(platform.name)) {
                        platformMap.set(platform.name, {
                            name: platform.name,
                            mcap_sum: 0,
                            coin_count: 0
                        });
                    }
                    
                    const platformData = platformMap.get(platform.name);
                    platformData.mcap_sum += stablecoin.main.circulating_mcap;
                    platformData.coin_count += 1;
                });
            }
        });

        // Convert to array and format
        const platformArray = Array.from(platformMap.values()).map(platform => ({
            name: platform.name,
            mcap_sum: platform.mcap_sum,
            mcap_sum_s: this.formatNumber(platform.mcap_sum),
            coin_count: platform.coin_count
        }));

        // Sort by market cap descending
        return platformArray.sort((a, b) => b.mcap_sum - a.mcap_sum);
    }

    /*---------------------------------------------------------
    Function: getPlatformName
    Description: Convert Messari platform names to friendly format
    ---------------------------------------------------------*/
    getPlatformName(platformId) {
        const platformMap = {
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
            'cardano': 'Cardano'
        };
        
        return platformMap[platformId] || platformId.charAt(0).toUpperCase() + platformId.slice(1).replace(/-/g, ' ');
    }

    /*---------------------------------------------------------
    Function: formatNumber
    Description: Format large numbers for display (e.g., 1.2B, 500M)
    ---------------------------------------------------------*/
    formatNumber(num, includeDollarSign = true) {
        if (!num) return 'No data';
        
        const prefix = includeDollarSign ? '$' : '';
        
        if (num >= 1e9) {
            return prefix + (num / 1e9).toFixed(1) + 'B';
        } else if (num >= 1e6) {
            return prefix + (num / 1e6).toFixed(1) + 'M';
        } else if (num >= 1e3) {
            return prefix + (num / 1e3).toFixed(1) + 'K';
        } else {
            return prefix + num.toFixed(includeDollarSign ? 2 : 0);
        }
    }

    /*---------------------------------------------------------
    Function: getStablecoins
    Description: Return cached stablecoin data
    ---------------------------------------------------------*/
    getStablecoins() {
        return this.stablecoins;
    }

    /*---------------------------------------------------------
    Function: getMetrics
    Description: Return cached metrics
    ---------------------------------------------------------*/
    getMetrics() {
        return this.metrics;
    }

    /*---------------------------------------------------------
    Function: getData
    Description: Return all data in format expected by routes
    ---------------------------------------------------------*/
    getData() {
        return {
            stablecoins: this.stablecoins,
            metrics: this.metrics,
            platform_data: this.platform_data || []
        };
    }
}

/*---------------------------------------------------------
    EXPORTS
---------------------------------------------------------*/
module.exports = DataService;