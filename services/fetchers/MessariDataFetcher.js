const { MessariClient } = require('@messari/sdk');
const axios = require('axios');
const IDataFetcher = require('../../interfaces/IDataFetcher');
const ApiConfig = require('../../config/ApiConfig');

class MessariDataFetcher extends IDataFetcher {
    constructor(healthMonitor = null) {
        super();
        this.healthMonitor = healthMonitor;
        this.config = ApiConfig.getApiConfig('messari') || {};
        this.sourceId = 'messari';
        if (this.isConfigured()) {
            this.client = new MessariClient({ apiKey: this.config.apiKey, baseUrl: this.config?.baseUrl, timeoutMs: this.config?.request?.timeout, defaultHeaders: (this.config?.request?.headers || {}) });
        }
    }

    getSourceId() { return this.sourceId; }
    getSourceName() { return this.config?.name || 'Messari'; }

    isConfigured() {
        return !!(this.config?.enabled && this.config?.apiKey);
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
            const path = this.config?.endpoints?.stablecoinMetrics || '/metrics/v2/stablecoins';
            const list = await this._fetchStablecoinMetrics(path);

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
            } catch (_) {
                // fallback to axios
            }
        }
        const baseUrl = this.config?.baseUrl || 'https://api.messari.io';
        const url = `${baseUrl}${path}`;
        const headers = { ...(this.config?.request?.headers || {}), 'x-messari-api-key': this.config?.apiKey };
        const timeout = this.config?.request?.timeout;
        const resp = await axios.get(url, { headers, timeout });
        const data = resp?.data;
        const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
        return list || [];
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
}

module.exports = MessariDataFetcher;
