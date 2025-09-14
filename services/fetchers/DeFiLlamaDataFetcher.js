const axios = require('axios');
const fs = require('fs');
const path = require('path');
const IDataFetcher = require('../../interfaces/IDataFetcher');
const ApiConfig = require('../../config/ApiConfig');
const AppConfig = require('../../config/AppConfig');

/**
 * DeFiLlama data fetcher implementation.
 * Fetches stablecoin data from DeFiLlama's dedicated stablecoins API.
 * Specializes in cross-chain supply data with detailed network breakdown.
 * Does not require API key authentication and provides comprehensive
 * chain-specific supply information.
 * 
 * @class DeFiLlamaDataFetcher
 * @extends {IDataFetcher}
 */
class DeFiLlamaDataFetcher extends IDataFetcher {
    /**
     * Creates an instance of DeFiLlamaDataFetcher.
     * Initializes the fetcher with health monitoring and API configuration.
     * 
     * @param {Object} [healthMonitor=null] - Health monitoring instance for tracking API health
     * @memberof DeFiLlamaDataFetcher
     */
    constructor(healthMonitor = null) {
        super();
        this.healthMonitor = healthMonitor;
        this.config = ApiConfig.getApiConfig('defillama') || {};
        this.sourceId = 'defillama';
        
        // Pre-compile regex patterns for optimal performance
        this._precompiledPatterns = {
            excludePatterns: [
                /wrapped/i, /liquid/i, /staked/i, /yield/i, /reward/i,
                /^w[A-Z]+$/, // Wrapped tokens like wETH, wBTC
                /pool/i, /vault/i, /interest/i, /synthetic/i
            ]
        };
    }

    /**
     * Gets the unique identifier for this data source.
     * 
     * @returns {string} Source identifier 'defillama'
     * @memberof DeFiLlamaDataFetcher
     */
    getSourceId() { return this.sourceId; }
    /**
     * Gets the human-readable name for this data source.
     * 
     * @returns {string} Source name from configuration or default 'DeFiLlama'
     * @memberof DeFiLlamaDataFetcher
     */
    getSourceName() { return this.config?.name || 'DeFiLlama'; }

    /**
     * Checks if the fetcher is properly configured for API access.
     * DeFiLlama doesn't require an API key, only needs to be enabled in configuration.
     * 
     * @returns {boolean} True if enabled in configuration, false otherwise
     * @memberof DeFiLlamaDataFetcher
     */
    isConfigured() {
        // DeFiLlama doesn't require an API key; use enabled flag
        return !!this.config?.enabled;
    }

    /**
     * Gets the data capabilities and priority information for this source.
     * DeFiLlama excels at cross-chain supply data and network breakdown information.
     * 
     * @returns {Object} Capabilities object from configuration or empty object
     * @memberof DeFiLlamaDataFetcher
     */
    getCapabilities() {
        return this.config?.capabilities || {};
    }

    /**
     * Gets rate limiting configuration for this API source.
     * 
     * @returns {Object} Rate limit configuration object or empty object
     * @memberof DeFiLlamaDataFetcher
     */
    getRateLimitInfo() { return this.config?.rateLimit || {}; }

    /**
     * Gets the current health status of this data source.
     * Queries the health monitor for source-specific health metrics and status.
     * 
     * @returns {Promise<Object>} Health status object with healthy flag
     * @memberof DeFiLlamaDataFetcher
     */
    async getHealthStatus() {
        if (!this.healthMonitor) return { healthy: true };
        try { return await this.healthMonitor.getSourceHealth(this.sourceId); } catch (_) { return { healthy: true }; }
    }

    /**
     * Fetches stablecoin data from DeFiLlama stablecoins API or mock data.
     * Requests data with prices included and handles circuit breaker logic.
     * Filters results to include only coins with basic required data.
     * 
     * @returns {Promise<Array>} Array of raw stablecoin data from DeFiLlama
     * @throws {Error} When API request fails, network issues, or data validation errors
     * @memberof DeFiLlamaDataFetcher
     */
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

            // Log unique peg types from the response (pre-filter)
            try {
                const pegTypes = Array.from(new Set((data.peggedAssets || [])
                    .map(c => c?.pegType)
                    .filter(Boolean)))
                    .sort();
                console.debug(`DeFiLlama peg types present (${pegTypes.length}): ${pegTypes.join(', ')}`);
            } catch (_) { /* ignore logging errors */ }

            // Filter the raw data to include only valid stablecoins
            const stablecoins = await this._filterStablecoins(data.peggedAssets);

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

    /**
     * Filters raw DeFiLlama data to include only valid stablecoins
     * Applies comprehensive filtering including peg type validation, symbol/pattern exclusions,
     * price range checks for USD-pegged coins, and circulating supply minimums
     * 
     * @param {Array} rawData - Raw peggedAssets data from DeFiLlama API
     * @returns {Array} Filtered array containing only valid stablecoins
     * @private
     * @memberof DeFiLlamaDataFetcher
     */
    async _filterStablecoins(rawData) {
        if (!Array.isArray(rawData)) {
            return [];
        }

        // For large datasets, use async batching to prevent main thread blocking
        if (rawData.length > 1000) {
            return await this._filterStablecoinsAsync(rawData);
        }

        return this._filterStablecoinsSync(rawData);
    }

    _filterStablecoinsSync(rawData) {
        // Get filtering configuration and pre-compute Sets for O(1) lookups
        const filterCfg = this.config?.processing?.stablecoinFilter || {};
        // Allow all peg types by default; optionally exclude specific peg types via config/env
        const excludedPegTypes = new Set(
            (filterCfg.excludedPegTypes || [])
                .map(t => String(t).trim())
                .filter(Boolean)
        );
        const priceRange = filterCfg.priceRange || { min: 0.5, max: 2.0 };
        const minCirculating = typeof filterCfg.minCirculatingSupply === 'number' ? filterCfg.minCirculatingSupply : 0;
        const excludeSymbols = new Set((filterCfg.excludeSymbols || []).map(s => String(s).toUpperCase()));
        
        // Use pre-compiled patterns instead of config patterns for better performance
        const excludePatterns = this._precompiledPatterns.excludePatterns;

        return rawData.filter((coin) => {
            // Basic validation - ensure required fields exist
            if (!coin || !coin.symbol || !coin.name || !coin.circulating) {
                return false;
            }

            // 1) Peg type exclusions (allow all by default, block configured ones like peggedBTC)
            if (coin.pegType && excludedPegTypes.has(String(coin.pegType).trim())) {
                return false;
            }

            // 2) Exclusions by symbol/pattern (defensive filtering)
            const sym = String(coin.symbol).toUpperCase();
            if (excludeSymbols.has(sym)) {
                return false;
            }
            
            const name = String(coin.name);
            if (excludePatterns.some(rx => {
                try { 
                    return rx.test(name) || rx.test(sym); 
                } catch (_) { 
                    return false; 
                }
            })) {
                return false;
            }

            // 3) Price sanity for USD-pegged only (non-USD pegs have different USD price levels)
            if (coin.pegType === 'peggedUSD') {
                const price = coin.price;
                if (typeof price === 'number' && isFinite(price)) {
                    if (price < priceRange.min || price > priceRange.max) {
                        return false;
                    }
                }
            }

            // 4) Circulating supply sanity for USD leg (if present)
            const circUSD = coin.circulating?.peggedUSD ?? null;
            if (typeof circUSD === 'number' && isFinite(circUSD)) {
                if (circUSD < minCirculating) {
                    return false;
                }
            }

            return true;
        });
    }

    async _filterStablecoinsAsync(rawData) {
        const batchSize = 500;
        const results = [];
        
        for (let i = 0; i < rawData.length; i += batchSize) {
            const batch = rawData.slice(i, i + batchSize);
            const filtered = this._filterStablecoinsSync(batch);
            results.push(...filtered);
            
            // Yield control back to event loop to prevent blocking
            if (i + batchSize < rawData.length) {
                await new Promise(resolve => setImmediate(resolve));
            }
        }
        
        return results;
    }

    /**
     * Transforms raw DeFiLlama data to standardized internal format.
     * Maps DeFiLlama's peggedAssets format to the standard data structure,
     * extracting cross-chain supply data and building comprehensive network breakdowns.
     * 
     * @param {Array} rawData - Raw data array from DeFiLlama stablecoins API
     * @returns {Array} Array of standardized stablecoin data objects with network breakdown
     * @memberof DeFiLlamaDataFetcher
     */
    transformToStandardFormat(rawData) {
        const ts = Date.now();
        const out = (rawData || []).map((coin) => {
            // Normalize pegged asset from pegType
            const normalizePeggedAsset = (pegType) => {
                if (!pegType || typeof pegType !== 'string') return null;
                // Expect values like 'peggedUSD', 'peggedEUR', 'peggedXAU', etc.
                const match = /^pegged([A-Za-z0-9]+)$/.exec(pegType.trim());
                if (!match) return null;
                const code = match[1].toUpperCase();
                const special = {
                    XAU: 'Gold',
                    XAG: 'Silver',
                };
                return special[code] || code;
            };

            // Extract circulating supply - DeFiLlama uses different peg types
            const circulatingSupply = coin.circulating?.peggedUSD || 
                                    coin.circulating?.peggedEUR || 
                                    coin.circulating?.peggedBTC || 
                                    Object.values(coin.circulating || {})[0] || 
                                    null;

            // Extract current price (included when includePrices=true)
            const currentPrice = coin.price;

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
                    peggedAsset: normalizePeggedAsset(coin.pegType),
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


    /**
     * Normalizes blockchain/chain names to standardized display names.
     * Maps DeFiLlama chain identifiers to consistent, user-friendly names.
     * Handles common variations and aliases for major blockchain networks.
     * 
     * @param {string} chainName - Raw chain name from DeFiLlama API
     * @returns {string} Normalized chain name for display
     * @private
     * @memberof DeFiLlamaDataFetcher
     */
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

    /**
     * Categorizes errors for better error handling and monitoring.
     * Maps different error types (HTTP status codes, network issues) to
     * standardized error categories for consistent handling.
     * 
     * @param {Error} error - The error object to categorize
     * @returns {string} Error category ('auth', 'rate_limit', 'network', 'server', etc.)
     * @private
     * @memberof DeFiLlamaDataFetcher
     */
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

    /**
     * Determines if an error is retryable for circuit breaker logic.
     * Identifies which error types should trigger retry attempts vs. permanent failures.
     * 
     * @param {Error} error - The error object to evaluate
     * @returns {boolean} True if the error type is retryable, false otherwise
     * @private
     * @memberof DeFiLlamaDataFetcher
     */
    _isRetryable(error) {
        const type = this._categorizeError(error);
        return ['timeout', 'network', 'server', 'rate_limit'].includes(type);
    }

    /**
     * Loads mock data from file for development/testing purposes.
     * Reads JSON data from configured mock file path and adds mock timestamp.
     * Used when mock data mode is enabled in configuration.
     * 
     * @returns {Promise<Object>} Mock API response data with mock timestamp
     * @throws {Error} When mock file is not found or cannot be parsed
     * @private
     * @memberof DeFiLlamaDataFetcher
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
