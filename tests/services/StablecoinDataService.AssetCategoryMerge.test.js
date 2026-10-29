const ServiceFactory = require('../../services/ServiceFactory');

/**
 * Minimal fetcher stub: returns pre-standardized records for one source
 */
function stubFetcher(sourceId, priority, records) {
    return {
        getSourceId: () => sourceId,
        getCapabilities: () => ({ priority }),
        isConfigured: () => true,
        fetchStablecoins: async () => records,
        transformToStandardFormat: (raw) => raw,
    };
}

function record(symbol, assetCategory, marketCap) {
    return {
        symbol,
        name: symbol,
        slug: symbol.toLowerCase(),
        assetCategory,
        marketData: { price: 1, marketCap, volume24h: 1000 },
        supplyData: { circulating: marketCap, total: marketCap, networkBreakdown: [] },
        metadata: { tags: [] },
    };
}

async function refresh(fetchers) {
    const service = ServiceFactory.createDataServiceWithFetchers(fetchers);
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const err = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
        await service.refreshData();
    } finally {
        log.mockRestore();
        err.mockRestore();
    }
    return service;
}

describe('StablecoinDataService assetCategory merge', () => {
    test("a higher-priority 'Other' does not override a lower-priority 'Stablecoin'", async () => {
        // Mirrors coins CMC does not list: CoinGecko/Messari classify them 'Other', DeFiLlama says 'Stablecoin'
        const service = await refresh([
            stubFetcher('messari', 8, [record('USDTB', 'Other', 1_000_000)]),
            stubFetcher('coingecko', 6, [record('USDTB', 'Other', 1_000_000)]),
            stubFetcher('defillama', 4, [record('USDTB', 'Stablecoin', 1_000_000)]),
        ]);

        const coin = await service.getStablecoin('USDTB');
        expect(coin.assetCategory).toBe('Stablecoin');
        expect(service.stablecoinMetrics.count).toBe(1);
        expect(service.stablecoinMetrics.totalMarketCap).toBe(1_000_000);
    });

    test('source priority still decides between concrete categories', async () => {
        const service = await refresh([
            stubFetcher('cmc', 10, [record('PAXG', 'Tokenized Asset', 2_000_000)]),
            stubFetcher('defillama', 4, [record('PAXG', 'Stablecoin', 2_000_000)]),
        ]);

        expect((await service.getStablecoin('PAXG')).assetCategory).toBe('Tokenized Asset');
    });

    test("stays 'Other' when no source positively classifies the coin", async () => {
        const service = await refresh([
            stubFetcher('coingecko', 6, [record('BFUSD', 'Other', 3_000_000)]),
            stubFetcher('messari', 8, [record('BFUSD', 'Other', 3_000_000)]),
        ]);

        expect((await service.getStablecoin('BFUSD')).assetCategory).toBe('Other');
        expect(service.stablecoinMetrics.count).toBe(0);
    });
});
