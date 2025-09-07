const { MessariClient } = require('@messari/sdk');
const IDataFetcher = require('../../interfaces/IDataFetcher');
const ApiConfig = require('../../config/ApiConfig');

class MessariDataFetcher extends IDataFetcher {
    constructor(healthMonitor = null) {
        super();
        this.healthMonitor = healthMonitor;
        this.config = ApiConfig.getApiConfig('messari') || {};
        this.sourceId = 'messari';
        if (this.isConfigured()) {
            this.client = new MessariClient({ apiKey: this.config.apiKey });
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
            const data = await this.client.request({ method: 'GET', path });
            const list = Array.isArray(data?.data) ? data.data : data;

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

    transformToStandardFormat(rawData) {
        const ts = Date.now();
        return (rawData || []).map((m) => ({
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
            },
            platforms: Array.isArray(m.networkBreakdown)
                ? m.networkBreakdown.filter((n) => !!n.network).map((n) => ({
                    name: n.network,
                    network: n.network,
                    contractAddress: n.contract || null,
                    supply: n.supply ?? null,
                    percentage: n.share ?? null,
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
        }));
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

