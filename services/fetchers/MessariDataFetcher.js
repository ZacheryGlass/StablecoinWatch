const { MessariClient } = require('@messari/sdk');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const IDataFetcher = require('../../interfaces/IDataFetcher');
const ApiConfig = require('../../config/ApiConfig');

class MessariDataFetcher extends IDataFetcher {
    constructor(healthMonitor = null) {
        super();
        this.healthMonitor = healthMonitor;
        this.config = ApiConfig.getApiConfig('messari') || {};
        this.sourceId = 'messari';
        this.client = null;
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

    getSourceId() { return this.sourceId; }
    getSourceName() { return this.config?.name || 'Messari'; }

    isConfigured() {
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
            let list;

            // Check if mock data mode is enabled
            if (this.config?.mockData?.enabled) {
                const mockData = await this._loadMockData();
                list = mockData.data || [];
            } else {
                const path = this.config?.endpoints?.stablecoinMetrics || '/metrics/v2/stablecoins';
                list = await this._fetchStablecoinMetrics(path);
            }

            if (this.healthMonitor) {
                await this.healthMonitor.recordSuccess(sourceId, {
                    operation: 'fetchStablecoins',
                    duration: Date.now() - startTime,
                    recordCount: Array.isArray(list) ? list.length : 0,
                    timestamp: Date.now()
                });
            }

            return list || [];
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
     * Wrapper for Messari stablecoins metrics endpoint.
     * Tries the SDK request first, then falls back to Axios using ApiConfig.
     * Always returns an array (possibly empty).
     * @private
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

    transformToStandardFormat(rawData) {
        const ts = Date.now();
        const out = (rawData || []).map((m) => {
            // Try multiple common field names for network breakdown across Messari responses
            const nbRaw = m.networkBreakdown || m.network_breakdown || m.breakdown || m.networks || m.chains || m.platforms;
            let nbArray = Array.isArray(nbRaw) ? nbRaw : [];
            if (!Array.isArray(nbArray) && typeof nbRaw === 'object' && nbRaw) {
                try { nbArray = Object.values(nbRaw).flat(); } catch (_) { nbArray = []; }
            }
            // No tracing logs in production
            const standardized = {
                sourceId: this.sourceId,
                id: m.id,
                name: m.name,
                symbol: m.symbol,
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
                            network: n.network || n.name || null,
                            contractAddress: n.contract || n.contract_address || null,
                            supply: n.supply ?? n.amount ?? null,
                            percentage: n.share ?? n.percentage ?? null,
                        }))
                        : [],
                },
                platforms: Array.isArray(nbArray)
                    ? nbArray.filter((n) => !!(n.network || n.name)).map((n) => ({
                        name: n.network || n.name,
                        network: n.network || n.name,
                        contractAddress: n.contract || n.contract_address || null,
                        supply: n.supply ?? n.amount ?? null,
                        percentage: n.share ?? n.percentage ?? null,
                    }))
                    : [],
                metadata: {
                    tags: Array.isArray(m.tags) ? m.tags : ['stablecoin'],
                    description: m.profile?.general?.overview?.project_details || null,
                    website: m.profile?.general?.overview?.official_links?.[0]?.link || null,
                    logoUrl: m.profile?.images?.logo || null,
                    dateAdded: null,
                },
                confidence: 0.85,
                timestamp: ts,
            };
            return standardized;
        });
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
