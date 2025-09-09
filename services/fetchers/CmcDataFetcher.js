const axios = require('axios');
const fs = require('fs');
const path = require('path');
const IDataFetcher = require('../../interfaces/IDataFetcher');
const ApiConfig = require('../../config/ApiConfig');
const AppConfig = require('../../config/AppConfig');

class CmcDataFetcher extends IDataFetcher {
    constructor(healthMonitor = null) {
        super();
        this.healthMonitor = healthMonitor;
        this.config = ApiConfig.getApiConfig('cmc') || {};
        this.sourceId = 'cmc';
    }

    getSourceId() { return this.sourceId; }
    getSourceName() { return this.config?.name || 'CoinMarketCap'; }

    isConfigured() {
        return !!(this.config?.enabled && this.config?.apiKey);
    }

    getCapabilities() {
        return this.config?.capabilities || {
            hasMarketData: true,
            hasSupplyData: true,
            hasPlatformData: true,
            hasNetworkBreakdown: false,
            hasMetadata: true,
            priority: 10,
            dataTypes: ['price', 'market_cap', 'volume', 'rank', 'tags']
        };
    }

    getRateLimitInfo() {
        return this.config?.rateLimit || {};
    }

    async getHealthStatus() {
        if (!this.healthMonitor) return { healthy: true };
        try {
            return await this.healthMonitor.getSourceHealth(this.sourceId);
        } catch (_) {
            return { healthy: true };
        }
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
                const baseUrl = this.config?.baseUrl || 'https://pro-api.coinmarketcap.com';
                const url = `${baseUrl}${this.config?.endpoints?.listings || '/v1/cryptocurrency/listings/latest'}`;
                const headers = {
                    ...(this.config?.request?.headers || {}),
                    'X-CMC_PRO_API_KEY': this.config?.apiKey,
                };

                const parameters = {
                    start: '1',
                    limit: String(this.config?.processing?.maxResults || 5000),
                    aux: 'tags'
                };

                const timeout = this.config?.request?.timeout || AppConfig.api.defaultTimeout;
                const response = await axios.get(url, { headers, params: parameters, timeout });
                data = response.data;
            }

            if (!data?.data) {
                throw new Error('No data received from CoinMarketCap API');
            }

            const priceRange = this.config?.processing?.stablecoinFilter?.priceRange || { min: 0.5, max: 2.0 };
            const stablecoins = data.data.filter((crypto) => {
                const hasStablecoinTag = crypto.tags && crypto.tags.includes(this.config?.processing?.stablecoinFilter?.tagName || 'stablecoin');
                const price = crypto.quote?.USD?.price;
                const isReasonablePrice = !price || (price >= priceRange.min && price <= priceRange.max);
                return hasStablecoinTag && isReasonablePrice;
            });

            // No tracing logs in production

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
                    message: error?.message || 'CMC fetch error',
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
        const out = (rawData || []).map((coin) => ({
            sourceId: this.sourceId,
            id: coin.id,
            name: coin.name,
            symbol: coin.symbol ? String(coin.symbol).toUpperCase() : coin.symbol,
            slug: (coin.slug || coin.symbol || '').toLowerCase(),
            marketData: {
                price: coin.quote?.USD?.price ?? null,
                marketCap: coin.quote?.USD?.market_cap ?? null,
                volume24h: coin.quote?.USD?.volume_24h ?? null,
                percentChange24h: coin.quote?.USD?.percent_change_24h ?? null,
                rank: coin.cmc_rank ?? null,
            },
            supplyData: {
                circulating: (coin.quote?.USD?.market_cap && coin.quote?.USD?.price)
                    ? coin.quote.USD.market_cap / coin.quote.USD.price
                    : coin.circulating_supply ?? null,
                total: coin.total_supply ?? null,
                max: coin.max_supply ?? null,
                networkBreakdown: coin.platform ? [{
                    name: coin.platform.name || 'Unknown',
                    network: (coin.platform.slug || coin.platform.symbol || null) ? String(coin.platform.slug || coin.platform.symbol).toLowerCase() : null,
                    contractAddress: coin.platform.token_address || null,
                    supply: null,
                    percentage: null,
                }] : [],
            },
            platforms: coin.platform ? [{
                name: coin.platform.name || 'Unknown',
                network: (coin.platform.slug || coin.platform.symbol || null) ? String(coin.platform.slug || coin.platform.symbol).toLowerCase() : null,
                contractAddress: coin.platform.token_address || null,
                supply: null,
                percentage: null,
            }] : [],
            metadata: {
                tags: coin.tags || [],
                description: null,
                website: null,
                logoUrl: `https://s2.coinmarketcap.com/static/img/coins/64x64/${coin.id}.png`,
                dateAdded: coin.date_added || null,
            },
            confidence: 0.9,
            timestamp: ts,
        }));
        return out;
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
        const mockFilePath = this.config?.mockData?.filePath || 'cmc_raw_output.json';
        const fullPath = path.resolve(mockFilePath);
        
        try {
            if (!fs.existsSync(fullPath)) {
                throw new Error(`Mock data file not found: ${fullPath}`);
            }
            
            const rawData = fs.readFileSync(fullPath, 'utf8');
            const mockData = JSON.parse(rawData);
            
            // Add timestamp to simulate fresh data
            if (mockData.status) {
                mockData.status.timestamp = new Date().toISOString();
            }
            
            return mockData;
        } catch (error) {
            throw new Error(`Failed to load CMC mock data from ${fullPath}: ${error.message}`);
        }
    }
}

module.exports = CmcDataFetcher;
