const axios = require('axios');
const fs = require('fs');
const path = require('path');
const IDataFetcher = require('../../interfaces/IDataFetcher');
const ApiConfig = require('../../config/ApiConfig');
const AppConfig = require('../../config/AppConfig');

class DeFiLlamaDataFetcher extends IDataFetcher {
    constructor(healthMonitor = null) {
        super();
        this.healthMonitor = healthMonitor;
        this.config = ApiConfig.getApiConfig('defillama') || {};
        this.sourceId = 'defillama';
    }

    getSourceId() { return this.sourceId; }
    getSourceName() { return this.config?.name || 'DeFiLlama'; }

    isConfigured() {
        // DeFiLlama doesn't require an API key; use enabled flag
        return !!this.config?.enabled;
    }

    getCapabilities() {
        return this.config?.capabilities || {};
    }

    getRateLimitInfo() { return this.config?.rateLimit || {}; }

    async getHealthStatus() {
        if (!this.healthMonitor) return { healthy: true };
        try { return await this.healthMonitor.getSourceHealth(this.sourceId); } catch (_) { return { healthy: true }; }
    }

    async fetchStablecoins() {
        const startTime = Date.now();
        const sourceId = this.sourceId;

        if (!this.isConfigured()) {
            return [];
        }

        if (this.healthMonitor) {
            try {
                const h = await this.healthMonitor.getSourceHealth(sourceId);
                const cb = h && h.circuitBreaker;
                if (cb && cb.state === 'open' && cb.nextRetryTime && Date.now() < cb.nextRetryTime) {
                    return [];
                }
            } catch (_) { }
        }

        try {
            let data;

            // Check if mock data mode is enabled
            if (this.config?.mockData?.enabled) {
                data = await this._loadMockData();
            } else {
                // DeFiLlama uses a different base URL for stablecoins
                const baseUrl = 'https://stablecoins.llama.fi';
                const url = `${baseUrl}${this.config?.endpoints?.stablecoins || '/stablecoins'}`;
                const headers = {
                    ...(this.config?.request?.headers || {}),
                    'Accept': 'application/json'
                };

                // Include prices in the request
                const parameters = {
                    includePrices: 'true'
                };

                const timeout = this.config?.request?.timeout || AppConfig.api.defaultTimeout;
                const response = await axios.get(url, { headers, params: parameters, timeout });
                data = response.data;
            }

            if (!data?.peggedAssets) {
                throw new Error('No peggedAssets data received from DeFiLlama API');
            }

            const stablecoins = data.peggedAssets.filter((coin) => {
                // Only basic data validation - filter out coins without basic required data
                return coin.symbol && coin.name && coin.circulating;
            });

            if (this.healthMonitor) {
                await this.healthMonitor.recordSuccess(sourceId, {
                    operation: 'fetchStablecoins',
                    duration: Date.now() - startTime,
                    recordCount: stablecoins.length,
                    timestamp: Date.now()
                });
            }

            return stablecoins;
        } catch (error) {
            if (this.healthMonitor) {
                await this.healthMonitor.recordFailure(sourceId, {
                    operation: 'fetchStablecoins',
                    errorType: this._categorizeError(error),
                    message: error?.message || 'DeFiLlama fetch error',
                    statusCode: error?.response?.status,
                    retryable: this._isRetryable(error),
                    timestamp: Date.now()
                });
            }
            throw error;
        }
    }

    transformToStandardFormat(rawData) {
        const ts = Date.now();
        const out = (rawData || []).map((coin) => {
            // Extract circulating supply - DeFiLlama uses different peg types
            const circulatingSupply = coin.circulating?.peggedUSD || 
                                    coin.circulating?.peggedEUR || 
                                    coin.circulating?.peggedBTC || 
                                    Object.values(coin.circulating || {})[0] || 
                                    null;

            // Extract current price (included when includePrices=true)
            const currentPrice = coin.price || 1.0;

            // Build network breakdown from chainCirculating data
            const networkBreakdown = [];
            if (coin.chainCirculating && typeof coin.chainCirculating === 'object') {
                for (const [chainName, chainData] of Object.entries(coin.chainCirculating)) {
                    if (chainData?.current) {
                        const chainSupply = chainData.current.peggedUSD || 
                                          chainData.current.peggedEUR || 
                                          chainData.current.peggedBTC ||
                                          Object.values(chainData.current)[0] || 
                                          null;
                        
                        if (chainSupply && chainSupply > 0) {
                            const percentage = circulatingSupply ? (chainSupply / circulatingSupply) * 100 : null;
                            networkBreakdown.push({
                                name: this._normalizeChainName(chainName),
                                network: chainName.toLowerCase(),
                                contractAddress: null, // DeFiLlama doesn't provide contract addresses in this endpoint
                                supply: chainSupply,
                                percentage: percentage,
                            });
                        }
                    }
                }
            }

            // Build platforms array from chains data
            const platforms = (coin.chains || []).map(chainName => ({
                name: this._normalizeChainName(chainName),
                network: chainName.toLowerCase(),
                contractAddress: null,
                supply: null,
                percentage: null,
            }));

            // Build the standardized object
            const standardized = {
                sourceId: this.sourceId,
                id: coin.id?.toString() || coin.symbol,
                name: coin.name,
                symbol: coin.symbol?.toUpperCase(),
                slug: (coin.symbol || coin.name || '').toLowerCase().replace(/[^a-z0-9]/g, '-'),
                marketData: {
                    price: currentPrice,
                    marketCap: circulatingSupply && currentPrice ? circulatingSupply * currentPrice : null,
                    volume24h: null, // DeFiLlama doesn't provide volume data in stablecoins endpoint
                    percentChange24h: null,
                    rank: null,
                },
                supplyData: {
                    circulating: circulatingSupply,
                    total: circulatingSupply, // For stablecoins, often circulating = total
                    max: null,
                    networkBreakdown: networkBreakdown,
                },
                platforms: platforms,
                metadata: {
                    tags: ['stablecoin'], // All data from this endpoint are stablecoins
                    description: coin.name ? `${coin.name} is a ${coin.pegMechanism || 'stablecoin'} that is ${coin.pegType || 'pegged to USD'}.` : null,
                    website: null,
                    logoUrl: null,
                    dateAdded: null,
                    // Store all DeFiLlama-specific fields for future use
                    defillamaData: {
                        pegType: coin.pegType,
                        pegMechanism: coin.pegMechanism,
                        id: coin.id,
                        rawChainCirculating: coin.chainCirculating,
                        rawCirculating: coin.circulating,
                    }
                },
                confidence: 0.8, // High confidence for DeFiLlama supply data
                timestamp: ts,
            };

            return standardized;
        });

        return out;
    }


    _normalizeChainName(chainName) {
        if (!chainName || typeof chainName !== 'string') return 'Unknown';
        
        const name = chainName.toLowerCase().trim();
        const chainMap = {
            'ethereum': 'Ethereum',
            'binance': 'BSC', 
            'bsc': 'BSC',
            'polygon': 'Polygon',
            'tron': 'Tron',
            'solana': 'Solana',
            'avalanche': 'Avalanche',
            'arbitrum': 'Arbitrum',
            'optimism': 'Optimism',
            'base': 'Base',
            'bitcoin': 'Bitcoin',
            'stellar': 'Stellar',
            'algorand': 'Algorand',
            'cardano': 'Cardano',
            'near': 'NEAR',
            'flow': 'Flow',
            'hedera': 'Hedera',
            'sui': 'Sui',
            'aptos': 'Aptos'
        };

        if (chainMap[name]) return chainMap[name];
        
        // Handle common variations
        if (name.includes('ethereum')) return 'Ethereum';
        if (name.includes('binance') || name.includes('bsc')) return 'BSC';
        if (name.includes('polygon')) return 'Polygon';
        if (name.includes('tron')) return 'Tron';
        if (name.includes('solana')) return 'Solana';
        if (name.includes('avalanche')) return 'Avalanche';
        if (name.includes('arbitrum')) return 'Arbitrum';
        if (name.includes('optimism')) return 'Optimism';
        
        // Default: capitalize first letter
        return chainName.charAt(0).toUpperCase() + chainName.slice(1).toLowerCase();
    }

    _categorizeError(error) {
        if (!error) return 'unknown';
        const status = error?.response?.status;
        if (status === 401 || status === 403) return 'auth';
        if (status === 404) return 'not_found';
        if (status === 429) return 'rate_limit';
        if (status >= 500) return 'server';
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) return 'timeout';
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') return 'network';
        return 'unknown';
    }

    _isRetryable(error) {
        const type = this._categorizeError(error);
        return ['timeout', 'network', 'server', 'rate_limit'].includes(type);
    }

    /**
     * Load mock data from file for development/testing
     * @private
     * @returns {Object} Mock API response data
     */
    async _loadMockData() {
        const mockFilePath = this.config?.mockData?.filePath || 'defillama_raw_output.json';
        const fullPath = path.resolve(mockFilePath);
        
        try {
            if (!fs.existsSync(fullPath)) {
                throw new Error(`Mock data file not found: ${fullPath}`);
            }
            
            const rawData = fs.readFileSync(fullPath, 'utf8');
            const mockData = JSON.parse(rawData);
            
            // DeFiLlama data doesn't typically have a status field, but we can add timestamp
            mockData._mockTimestamp = new Date().toISOString();
            
            return mockData;
        } catch (error) {
            throw new Error(`Failed to load DeFiLlama mock data from ${fullPath}: ${error.message}`);
        }
    }
}

module.exports = DeFiLlamaDataFetcher;

