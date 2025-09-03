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
    Function: fetchStablecoinData
    Description: Fetch stablecoin data from Messari API
    ---------------------------------------------------------*/
    async fetchStablecoinData() {
        try {
            console.log('Fetching stablecoin data from Messari...');
            
            const limit = global.DEBUG ? 200 : 500;
            const response = await axios.get(`https://data.messari.io/api/v1/assets?fields=id,slug,symbol,name,metrics,profile&limit=${limit}`);
            const allCoins = response.data.data;

            this.stablecoins = [];
            let totalMCap = 0;
            let totalVolume = 0;

            allCoins.forEach((coin) => {
                if (coin.profile && coin.profile.sector === 'Stablecoins' && !global.EXCLUDE_LIST.includes(coin.symbol)) {
                    let platforms = [];

                    try {
                        if (coin.profile.token_details && coin.profile.token_details.type) {
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

                    // Set backup data sources for template compatibility
                    stablecoin.msri = { ...stablecoin.main };
                    stablecoin.scw = { ...stablecoin.main };
                    stablecoin.cmc = { ...stablecoin.main }; // Add CMC compatibility  
                    stablecoin.cgko = { ...stablecoin.main }; // Add CoinGecko compatibility
                    
                    // Add formatted string versions for template compatibility
                    if (stablecoin.msri.circulating_mcap_s) {
                        stablecoin.msri.circulating_mcap_s = stablecoin.main.circulating_mcap_s;
                        stablecoin.msri.volume_s = stablecoin.main.volume_s;
                    }
                    
                    if (stablecoin.scw.circulating_supply) {
                        stablecoin.scw.circulating_supply_s = this.formatNumber(stablecoin.scw.circulating_supply, false);
                        stablecoin.scw.circulating_mcap_s = stablecoin.main.circulating_mcap_s;
                    }
                    
                    if (stablecoin.cmc.price) {
                        stablecoin.cmc.circulating_mcap_s = stablecoin.main.circulating_mcap_s;
                        stablecoin.cmc.volume_s = stablecoin.main.volume_s;
                        stablecoin.cmc.circulating_supply_s = this.formatNumber(stablecoin.cmc.circulating_supply, false);
                        stablecoin.cmc.total_supply_s = this.formatNumber(stablecoin.cmc.circulating_supply, false); // Using circulating as total
                    }
                    
                    // Add CoinGecko data compatibility  
                    if (stablecoin.cgko.price) {
                        stablecoin.cgko.circulating_mcap_s = stablecoin.main.circulating_mcap_s;
                        stablecoin.cgko.volume_s = stablecoin.main.volume_s;
                        stablecoin.cgko.circulating_supply_s = this.formatNumber(stablecoin.cgko.circulating_supply, false);
                        stablecoin.cgko.total_supply_s = this.formatNumber(stablecoin.cgko.circulating_supply, false);
                    }

                    this.stablecoins.push(stablecoin);
                }
            });

            // Update metrics
            this.metrics = {
                totalMCap,
                totalVolume,
                lastUpdated: new Date()
            };

            // Create basic platform_data for template compatibility
            this.platform_data = [
                { name: 'Ethereum', mcap_sum: 0, mcap_sum_s: '$0' },
                { name: 'Tron', mcap_sum: 0, mcap_sum_s: '$0' },
                { name: 'Binance Chain', mcap_sum: 0, mcap_sum_s: '$0' },
                { name: 'Solana', mcap_sum: 0, mcap_sum_s: '$0' },
                { name: 'Algorand', mcap_sum: 0, mcap_sum_s: '$0' }
            ];

            console.log(`Successfully fetched ${this.stablecoins.length} stablecoins`);
            return this.stablecoins;

        } catch (error) {
            console.error('Error fetching stablecoin data:', error);
            throw error;
        }
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