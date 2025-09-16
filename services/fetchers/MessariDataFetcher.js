const { MessariClient } = require('@messari/sdk');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const IDataFetcher = require('../../interfaces/IDataFetcher');
const ApiConfig = require('../../config/ApiConfig');
const AssetClassifier = require('../domain/AssetClassifier');

/**
 * Messari data fetcher implementation.
 * Fetches stablecoin supply and network breakdown data from Messari API.
 * Provides dual-mode operation using Messari SDK with Axios fallback for reliability.
 * Includes comprehensive API key validation and detailed error handling.
 * 
 * @class MessariDataFetcher
 * @extends {IDataFetcher}
 */
class MessariDataFetcher extends IDataFetcher {
    /**
     * Creates an instance of MessariDataFetcher.
     * Initializes with health monitoring, API configuration, and attempts to create
     * Messari SDK client. Falls back gracefully if SDK initialization fails.
     * 
     * @param {Object} [healthMonitor=null] - Health monitoring instance for tracking API health
     * @memberof MessariDataFetcher
     */
    constructor(healthMonitor = null) {
        super();
        this.healthMonitor = healthMonitor;
        this.config = ApiConfig.getApiConfig('messari') || {};
        this.sourceId = 'messari';
        
        // Initialize AssetClassifier for centralized classification
        const classificationConfig = this.config?.classification || {};
        this.classifier = new AssetClassifier(classificationConfig);
        this.client = null;
        
        // Pre-compile regex patterns for optimal performance
        this._precompiledPatterns = {
            stablecoinPatterns: [
                /usdt|usdc|dai|busd|frax|usdd|tusd|pax|gusd|husd/i,  // Known stablecoin symbols
                /stable|dollar|usd/i  // Generic stablecoin indicators
            ]
        };
        
        if (this.isConfigured()) {
            try {
                this.client = new MessariClient({ 
                    apiKey: this.config.apiKey, 
                    baseUrl: this.config?.baseUrl, 
                    timeoutMs: this.config?.request?.timeout, 
                    defaultHeaders: (this.config?.request?.headers || {}) 
                });
            } catch (clientError) {
                console.warn(`Failed to initialize Messari SDK client: ${clientError?.message || 'Unknown error'}`);
                this.client = null;
            }
        }
    }

    /**
     * Gets the unique identifier for this data source.
     * 
     * @returns {string} Source identifier 'messari'
     * @memberof MessariDataFetcher
     */
    getSourceId() { return this.sourceId; }
    /**
     * Gets the human-readable name for this data source.
     * 
     * @returns {string} Source name from configuration or default 'Messari'
     * @memberof MessariDataFetcher
     */
    getSourceName() { return this.config?.name || 'Messari'; }

    /**
     * Checks if the fetcher is properly configured for API access.
     * Validates that the source is enabled, API key is provided, and performs
     * comprehensive API key format validation with placeholder detection.
     * 
     * @returns {boolean} True if properly configured with valid API key, false otherwise
     * @memberof MessariDataFetcher
     */
    isConfigured() {
        // Allow operation when mock data mode is enabled even without API key
        if (this.config?.mockData?.enabled) return true;
        if (!this.config?.enabled || !this.config?.apiKey) {
            return false;
        }
        
        // Basic API key format validation
        const apiKey = this.config.apiKey;
        const keyLength = apiKey.length;
        
        // Messari API keys are typically 40-60 characters long with hyphens
        if (keyLength < 20 || keyLength > 100) {
            console.warn(`Messari API key format warning: Key length (${keyLength}) seems unusual for Messari API keys`);
        }
        
        // Check for placeholder or example keys that shouldn't be used
        if (apiKey.includes('your-api-key') || apiKey.includes('PLACEHOLDER') || apiKey === 'test' || apiKey === 'demo') {
            console.error(`Messari API key appears to be a placeholder: "${apiKey.substring(0, 20)}..."`);
            return false;
        }
        
        return true;
    }

    /**
     * Gets the data capabilities and priority information for this source.
     * Messari specializes in supply data, network breakdown, and platform information.
     * 
     * @returns {Object} Capabilities object with data types, priority, and feature flags
     * @memberof MessariDataFetcher
     */
    getCapabilities() {
        return this.config?.capabilities || {
            hasMarketData: false,
            hasSupplyData: true,
            hasPlatformData: true,
            hasNetworkBreakdown: true,
            hasMetadata: true,
            priority: 8,
            dataTypes: ['supply', 'network_breakdown', 'platforms', 'metadata']
        };
    }

    /**
     * Gets rate limiting configuration for this API source.
     * 
     * @returns {Object} Rate limit configuration object
     * @memberof MessariDataFetcher
     */
    getRateLimitInfo() {
        return this.config?.rateLimit || {};
    }

    /**
     * Gets the current health status of this data source.
     * Queries the health monitor for source-specific health metrics and status.
     * 
     * @returns {Promise<Object>} Health status object with healthy flag and metrics
     * @memberof MessariDataFetcher
     */
    async getHealthStatus() {
        if (!this.healthMonitor) return { healthy: true };
        try {
            return await this.healthMonitor.getSourceHealth(this.sourceId);
        } catch (_) {
            return { healthy: true };
        }
    }

    /**
     * Fetches stablecoin metrics data from Messari API or mock data.
     * Handles circuit breaker logic, tries Messari SDK first with Axios fallback.
     * Provides comprehensive error handling and health monitoring.
     * 
     * @returns {Promise<Array>} Array of raw stablecoin metrics data from Messari
     * @throws {Error} When API requests fail, authentication issues, or data validation errors
     * @memberof MessariDataFetcher
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
            let list;

            // Check if mock data mode is enabled
            if (this.config?.mockData?.enabled) {
                const mockData = await this._loadMockData();
                list = mockData.data || [];
            } else {
                const path = this.config?.endpoints?.stablecoinMetrics || '/metrics/v2/stablecoins';
                list = await this._fetchStablecoinMetrics(path);
            }

            // Filter the raw data to include only valid stablecoins
            const filteredList = await this._filterStablecoins(list);

            if (this.healthMonitor) {
                await this.healthMonitor.recordSuccess(sourceId, {
                    operation: 'fetchStablecoins',
                    duration: Date.now() - startTime,
                    recordCount: Array.isArray(filteredList) ? filteredList.length : 0,
                    timestamp: Date.now()
                });
            }

            return filteredList || [];
        } catch (error) {
            if (this.healthMonitor) {
                await this.healthMonitor.recordFailure(sourceId, {
                    operation: 'fetchStablecoins',
                    errorType: this._categorizeError(error),
                    message: error?.message || 'Messari fetch error',
                    statusCode: error?.response?.status,
                    retryable: this._isRetryable(error),
                    timestamp: Date.now()
                });
            }
            throw error;
        }
    }

    /**
     * Wrapper for Messari stablecoins metrics endpoint with dual-mode operation.
     * Attempts to use the Messari SDK client first for optimized requests, then falls
     * back to direct Axios HTTP calls if SDK fails. Provides detailed error logging
     * for debugging authentication and rate limit issues.
     * 
     * @param {string} path - API endpoint path to request
     * @returns {Promise<Array>} Array of stablecoin metrics data (possibly empty)
     * @throws {Error} When both SDK and Axios requests fail
     * @private
     * @memberof MessariDataFetcher
     */
    async _fetchStablecoinMetrics(path) {
        if (this.client && typeof this.client.request === "function") {
            try {
                const sdkData = await this.client.request({ method: "GET", path });
                return Array.isArray(sdkData?.data) ? sdkData.data : (Array.isArray(sdkData) ? sdkData : []);
            } catch (sdkError) {
                // Extract more details from SDK error for better diagnostics
                const errorDetails = {
                    message: sdkError?.message || 'Unknown SDK error',
                    status: sdkError?.response?.status || sdkError?.status,
                    statusText: sdkError?.response?.statusText || sdkError?.statusText,
                    code: sdkError?.code,
                    type: sdkError?.name || sdkError?.constructor?.name
                };
                
                if (errorDetails.status === 401 || errorDetails.status === 403) {
                    console.warn(`Messari SDK authentication failed (${errorDetails.status}), falling back to direct HTTP`);
                } else if (errorDetails.status === 429) {
                    console.warn(`Messari SDK rate limit exceeded (${errorDetails.status}), falling back to direct HTTP`);
                } else {
                    console.warn(`Messari SDK request failed (${errorDetails.status || errorDetails.type}): ${errorDetails.message}, falling back to direct HTTP`);
                }
            }
        }
        const baseUrl = this.config?.baseUrl || 'https://api.messari.io';
        const url = `${baseUrl}${path}`;
        const headers = { ...(this.config?.request?.headers || {}), 'x-messari-api-key': this.config?.apiKey };
        const timeout = this.config?.request?.timeout;
        
        try {
            const resp = await axios.get(url, { headers, timeout });
            const data = resp?.data;
            const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
            return list || [];
        } catch (axiosError) {
            const status = axiosError?.response?.status;
            const statusText = axiosError?.response?.statusText;
            const responseData = axiosError?.response?.data;
            
            if (status === 401 || status === 403) {
                console.error(`Messari API authentication failed (${status}): Invalid API key or insufficient permissions`);
                console.error(`API key format check: ${this.config?.apiKey ? 'Key present (length: ' + this.config.apiKey.length + ')' : 'No API key'}`);
            } else if (status === 429) {
                console.error(`Messari API rate limit exceeded (${status}): Too many requests`);
            } else if (status >= 500) {
                console.error(`Messari API server error (${status}): ${statusText || 'Server unavailable'}`);
            } else {
                console.error(`Messari API request failed (${status || 'Network Error'}): ${axiosError?.message || 'Unknown error'}`);
                console.error(`Request URL: ${url}`);
                if (responseData) {
                    console.error(`Response: ${JSON.stringify(responseData).substring(0, 200)}`);
                }
            }
            
            throw axiosError;
        }
    }

    /**
     * Filters raw Messari data to include only valid stablecoins
     * Applies pattern matching against symbols and names, plus tag-based filtering
     * to identify assets that are likely to be stablecoins
     * 
     * @param {Array} rawData - Raw asset data from Messari API
     * @returns {Array} Filtered array containing only potential stablecoins
     * @private
     * @memberof MessariDataFetcher
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
        // Use pre-compiled patterns for better performance
        const stablecoinPatterns = this._precompiledPatterns.stablecoinPatterns;

        return rawData.filter(asset => {
            // Basic validation - ensure required fields exist
            if (!asset || !asset.symbol || !asset.name) {
                return false;
            }

            const symbol = (asset.symbol || '').toLowerCase();
            const name = (asset.name || '').toLowerCase();
            const tags = asset.tags || [];

            // Check for stablecoin-related tags
            const hasStablecoinTag = tags.some(tag => 
                tag.toLowerCase().includes('stable') || 
                tag.toLowerCase().includes('currency')
            );

            // Check if symbol or name matches stablecoin patterns
            const matchesPattern = stablecoinPatterns.some(pattern => 
                pattern.test(symbol) || pattern.test(name)
            );

            // Include asset if it has stablecoin tags OR matches known patterns
            return hasStablecoinTag || matchesPattern;
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
     * Transforms raw Messari data to standardized internal format.
     * Maps Messari API response fields to the standard data structure, handling
     * multiple field name variations and extracting network breakdown information.
     * 
     * @param {Array} rawData - Raw data array from Messari API
     * @returns {Array} Array of standardized stablecoin data objects with supply and platform data
     * @memberof MessariDataFetcher
     */
    transformToStandardFormat(rawData) {
        const ts = Date.now();
        const out = (rawData || []).map((m) => {
            // Try multiple common field names for network breakdown across Messari responses
            const nbRaw = m.networkBreakdown || m.network_breakdown || m.breakdown || m.networks || m.chains || m.platforms;
            let nbArray = Array.isArray(nbRaw) ? nbRaw : [];
            if (!Array.isArray(nbArray) && typeof nbRaw === 'object' && nbRaw) {
                try { nbArray = Object.values(nbRaw).flat(); } catch (_) { nbArray = []; }
            }
            
            // Use AssetClassifier for consistent classification
            const classification = this.classifier.classify({
                asset: {
                    tags: Array.isArray(m.tags) ? m.tags : [],
                    name: m.name,
                    symbol: m.symbol,
                    slug: m.slug
                },
                source: this.sourceId
            });
            
            // No tracing logs in production
            const standardized = {
                sourceId: this.sourceId,
                id: m.id,
                name: m.name,
                symbol: m.symbol ? String(m.symbol).toUpperCase() : m.symbol,
                slug: (m.slug || m.symbol || '').toLowerCase(),
                marketData: {
                    price: 1.0,
                    marketCap: m.supply?.circulating ? m.supply.circulating * 1.0 : null,
                    volume24h: null,
                    percentChange24h: null,
                    rank: null,
                },
                supplyData: {
                    circulating: m.supply?.circulating ?? null,
                    total: m.supply?.total ?? null,
                    max: m.supply?.max ?? null,
                    networkBreakdown: Array.isArray(nbArray)
                        ? nbArray.filter(n => !!(n.network || n.name)).map(n => ({
                            name: n.network || n.name,
                            network: (n.network || n.name || null) ? String(n.network || n.name).toLowerCase() : null,
                            contractAddress: n.contract || n.contract_address || null,
                            supply: n.supply ?? n.amount ?? null,
                            percentage: n.share ?? n.percentage ?? null,
                        }))
                        : [],
                },
                platforms: Array.isArray(nbArray)
                    ? nbArray.filter((n) => !!(n.network || n.name)).map((n) => ({
                        name: n.network || n.name,
                        network: (n.network || n.name || null) ? String(n.network || n.name).toLowerCase() : null,
                        contractAddress: n.contract || n.contract_address || null,
                        supply: n.supply ?? n.amount ?? null,
                        percentage: n.share ?? n.percentage ?? null,
                    }))
                    : [],
                metadata: {
                    // Preserve tags if present
                    tags: Array.isArray(m.tags) ? m.tags : [],
                    description: m.profile?.general?.overview?.project_details || null,
                    website: m.profile?.general?.overview?.official_links?.[0]?.link || null,
                    logoUrl: m.profile?.images?.logo || null,
                    dateAdded: null,
                    peggedAsset: classification.peggedAsset,
                },
                assetCategory: classification.assetCategory,
                confidence: 0.85,
                timestamp: ts,
            };
            return standardized;
        });
        return out;
    }

    /**
     * Categorizes errors for better error handling and monitoring.
     * Maps different error types (HTTP status codes, network issues) to
     * standardized error categories for consistent handling.
     * 
     * @param {Error} error - The error object to categorize
     * @returns {string} Error category ('auth', 'rate_limit', 'network', 'server', etc.)
     * @private
     * @memberof MessariDataFetcher
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
     * @memberof MessariDataFetcher
     */
    _isRetryable(error) {
        const type = this._categorizeError(error);
        return ['timeout', 'network', 'server', 'rate_limit'].includes(type);
    }

    /**
     * Loads mock data from file for development/testing purposes.
     * Reads JSON data from configured mock file path and simulates fresh API response
     * by updating timestamps. Used when mock data mode is enabled in configuration.
     * 
     * @returns {Promise<Object>} Mock API response data with updated timestamp
     * @throws {Error} When mock file is not found or cannot be parsed
     * @private
     * @memberof MessariDataFetcher
     */
    async _loadMockData() {
        const mockFilePath = this.config?.mockData?.filePath || 'messari_raw_output.json';
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
            throw new Error(`Failed to load Messari mock data from ${fullPath}: ${error.message}`);
        }
    }
}

module.exports = MessariDataFetcher;
