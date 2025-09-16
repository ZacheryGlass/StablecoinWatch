/**
 * Performance Stress Test Suite for AssetClassifier
 * 
 * Tests performance characteristics under load scenarios similar to real
 * production data volumes from CoinMarketCap (9,515+ assets), DeFiLlama,
 * and other API sources.
 */
const AssetClassifier = require('../../../services/domain/AssetClassifier');
const ApiConfig = require('../../../config/ApiConfig');

describe('AssetClassifier - Performance Stress Tests', () => {
    let classifier;

    beforeEach(() => {
        classifier = new AssetClassifier(ApiConfig.getAssetClassificationConfig());
    });

    describe('Large Dataset Processing', () => {
        test('should handle CMC-scale dataset (9,515 assets) efficiently', () => {
            // Simulate processing the full CMC dataset size
            const cmcScaleDataset = Array.from({ length: 9515 }, (_, i) => ({
                id: i + 1,
                name: `Asset ${i}`,
                symbol: `SYM${i}`,
                slug: `asset-${i}`,
                tags: i % 10 === 0 ? ['stablecoin', 'usd-stablecoin'] : ['cryptocurrency', 'defi'],
                current_price: Math.random() * 100,
                market_cap: Math.random() * 1000000000
            }));

            const startTime = Date.now();
            const results = cmcScaleDataset.map(asset => classifier.classify({ asset }));
            const endTime = Date.now();

            expect(results).toHaveLength(9515);
            expect(results.every(r => r.hasOwnProperty('assetCategory'))).toBe(true);
            expect(results.every(r => r.hasOwnProperty('peggedAsset'))).toBe(true);

            // Should process 9,515 assets in under 2 seconds (realistic production requirement)
            expect(endTime - startTime).toBeLessThan(2000);
            
            // Calculate throughput
            const throughput = 9515 / ((endTime - startTime) / 1000);
            expect(throughput).toBeGreaterThan(4000); // Should process >4000 assets/second
        });

        test('should maintain consistent performance across different batch sizes', () => {
            const batchSizes = [100, 500, 1000, 2500, 5000];
            const performanceResults = [];

            batchSizes.forEach(batchSize => {
                const dataset = Array.from({ length: batchSize }, (_, i) => ({
                    name: `Batch Asset ${i}`,
                    symbol: `BA${i}`,
                    tags: ['stablecoin', 'usd-stablecoin'],
                    slug: `batch-asset-${i}`
                }));

                const startTime = Date.now();
                const results = dataset.map(asset => classifier.classify({ asset }));
                const endTime = Date.now();

                const throughput = batchSize / ((endTime - startTime) / 1000);
                performanceResults.push({
                    batchSize,
                    duration: endTime - startTime,
                    throughput
                });

                expect(results).toHaveLength(batchSize);
                expect(results.every(r => r.assetCategory === 'Stablecoin')).toBe(true);
            });

            // Performance should scale reasonably (not degrade significantly with size)
            const smallBatchThroughput = performanceResults[0].throughput;
            const largeBatchThroughput = performanceResults[performanceResults.length - 1].throughput;
            
            // Large batch should be at least 70% as efficient as small batch
            expect(largeBatchThroughput).toBeGreaterThan(smallBatchThroughput * 0.7);
        });
    });

    describe('Complex Tag Array Performance', () => {
        test('should efficiently process assets with many tags (Bitcoin-style)', () => {
            // Bitcoin has 50+ tags in real CMC data
            const manyTagsTemplate = [
                "stablecoin", "usd-stablecoin", "mineable", "pow", "sha-256", "store-of-value",
                "coinbase-ventures-portfolio", "three-arrows-capital-portfolio",
                "polychain-capital-portfolio", "binance-labs-portfolio",
                "blockchain-capital-portfolio", "boostvc-portfolio", "cms-holdings-portfolio",
                "dcg-portfolio", "dragonfly-capital-portfolio", "electric-capital-portfolio",
                "fabric-ventures-portfolio", "framework-ventures-portfolio",
                "galaxy-digital-portfolio", "huobi-capital-portfolio", "alameda-research-portfolio",
                "a16z-portfolio", "1confirmation-portfolio", "winklevoss-capital-portfolio",
                "usv-portfolio", "placeholder-ventures-portfolio", "pantera-capital-portfolio",
                "multicoin-capital-portfolio", "paradigm-portfolio", "layer-1",
                "ethereum-ecosystem", "polygon-ecosystem", "avalanche-ecosystem",
                "arbitrum-ecosystem", "optimism-ecosystem", "binance-ecosystem",
                "solana-ecosystem", "cardano-ecosystem", "polkadot-ecosystem",
                "cosmos-ecosystem", "near-ecosystem", "tron20-ecosystem", "defi",
                "yield-farming", "lending-borrowing", "trading", "dex", "centralized-exchange",
                "decentralized-exchange", "asset-backed-stablecoin", "fiat-stablecoin"
            ];

            const manyTagsAssets = Array.from({ length: 1000 }, (_, i) => ({
                name: `Complex Asset ${i}`,
                symbol: `COMP${i}`,
                tags: manyTagsTemplate,
                slug: `complex-asset-${i}`
            }));

            const startTime = Date.now();
            const results = manyTagsAssets.map(asset => classifier.classify({ asset }));
            const endTime = Date.now();

            expect(results).toHaveLength(1000);
            expect(results.every(r => r.assetCategory === 'Stablecoin')).toBe(true);
            expect(endTime - startTime).toBeLessThan(200); // Should be fast even with complex tags
        });

        test('should handle extremely long tag arrays without performance degradation', () => {
            // Test with unrealistically large tag arrays to test limits
            const extremeTagsAsset = {
                name: "Extreme Tags Asset",
                symbol: "EXTREME",
                tags: Array.from({ length: 500 }, (_, i) => `tag-${i}`).concat(['stablecoin', 'usd-stablecoin']),
                slug: "extreme-tags-asset"
            };

            const iterations = 100;
            const startTime = Date.now();
            
            for (let i = 0; i < iterations; i++) {
                const result = classifier.classify({ asset: extremeTagsAsset });
                expect(result.assetCategory).toBe('Stablecoin');
            }
            
            const endTime = Date.now();
            expect(endTime - startTime).toBeLessThan(100); // Should handle extreme cases efficiently
        });
    });

    describe('Memory Usage and Garbage Collection', () => {
        test('should not leak memory during large batch processing', () => {
            const initialMemory = process.memoryUsage().heapUsed;
            const batchCount = 10;
            const batchSize = 1000;

            for (let batch = 0; batch < batchCount; batch++) {
                const assets = Array.from({ length: batchSize }, (_, i) => ({
                    name: `Memory Test Asset ${batch}-${i}`,
                    symbol: `MTA${batch}${i}`,
                    tags: ['stablecoin', 'usd-stablecoin'],
                    slug: `memory-test-asset-${batch}-${i}`
                }));

                const results = assets.map(asset => classifier.classify({ asset }));
                expect(results).toHaveLength(batchSize);

                // Force garbage collection if available
                if (global.gc) {
                    global.gc();
                }
            }

            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;
            
            // Memory increase should be reasonable (less than 50MB for processing 10k assets)
            expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
        });

        test('should efficiently handle repeated classification of same assets', () => {
            const testAsset = {
                name: "Repeated Test Asset",
                symbol: "RTA",
                tags: ['stablecoin', 'usd-stablecoin'],
                slug: "repeated-test-asset"
            };

            const iterations = 10000;
            const startTime = Date.now();

            for (let i = 0; i < iterations; i++) {
                const result = classifier.classify({ asset: testAsset });
                expect(result.assetCategory).toBe('Stablecoin');
                expect(result.peggedAsset).toBe('USD');
            }

            const endTime = Date.now();
            
            // Should handle 10k classifications of same asset very quickly
            expect(endTime - startTime).toBeLessThan(100);
            
            const throughput = iterations / ((endTime - startTime) / 1000);
            expect(throughput).toBeGreaterThan(100000); // >100k classifications/second for same asset
        });
    });

    describe('Complex Pattern Matching Performance', () => {
        test('should efficiently process assets with complex symbol patterns', () => {
            const complexSymbolAssets = Array.from({ length: 2000 }, (_, i) => ({
                name: `Complex Symbol Asset ${i}`,
                symbol: `VERY-LONG-COMPLEX-SYMBOL-WITH-DASHES-AND-NUMBERS-${i}-USD-TOKEN`,
                tags: ['stablecoin'],
                slug: `complex-symbol-asset-${i}`
            }));

            const startTime = Date.now();
            const results = complexSymbolAssets.map(asset => classifier.classify({ asset }));
            const endTime = Date.now();

            expect(results).toHaveLength(2000);
            expect(results.every(r => r.assetCategory === 'Stablecoin')).toBe(true);
            expect(endTime - startTime).toBeLessThan(300); // Should handle complex patterns efficiently
        });

        test('should handle regex-intensive classification efficiently', () => {
            // Assets that trigger multiple regex patterns
            const regexIntensiveAssets = Array.from({ length: 1000 }, (_, i) => ({
                name: `USD Euro Yen Pound Franc Swiss Dollar ${i}`, // Triggers multiple currency patterns
                symbol: `MULTI${i}`,
                tags: ['stablecoin', 'multi-currency', 'basket-currency'],
                slug: `multi-currency-asset-${i}`
            }));

            const startTime = Date.now();
            const results = regexIntensiveAssets.map(asset => classifier.classify({ asset }));
            const endTime = Date.now();

            expect(results).toHaveLength(1000);
            expect(results.every(r => r.assetCategory === 'Stablecoin')).toBe(true);
            expect(endTime - startTime).toBeLessThan(200);
        });
    });

    describe('Concurrent Processing Simulation', () => {
        test('should handle multiple simultaneous classification requests', async () => {
            const simultaneousRequests = 100;
            const assetsPerRequest = 50;

            const requests = Array.from({ length: simultaneousRequests }, (_, requestId) => 
                Array.from({ length: assetsPerRequest }, (_, assetId) => ({
                    name: `Concurrent Asset ${requestId}-${assetId}`,
                    symbol: `CA${requestId}${assetId}`,
                    tags: ['stablecoin', 'usd-stablecoin'],
                    slug: `concurrent-asset-${requestId}-${assetId}`
                }))
            );

            const startTime = Date.now();
            
            // Simulate concurrent processing
            const results = await Promise.all(
                requests.map(async (requestAssets) => {
                    return requestAssets.map(asset => classifier.classify({ asset }));
                })
            );
            
            const endTime = Date.now();

            expect(results).toHaveLength(simultaneousRequests);
            expect(results.every(batch => batch.length === assetsPerRequest)).toBe(true);
            
            const flatResults = results.flat();
            expect(flatResults).toHaveLength(simultaneousRequests * assetsPerRequest);
            expect(flatResults.every(r => r.assetCategory === 'Stablecoin')).toBe(true);
            
            // Should handle concurrent processing efficiently
            expect(endTime - startTime).toBeLessThan(1000);
        });
    });

    describe('Edge Case Performance', () => {
        test('should efficiently handle mixed asset types in large batches', () => {
            const mixedAssets = Array.from({ length: 5000 }, (_, i) => {
                const assetType = i % 5;
                switch (assetType) {
                    case 0: // Stablecoin
                        return {
                            name: `Stablecoin ${i}`,
                            symbol: `STABLE${i}`,
                            tags: ['stablecoin', 'usd-stablecoin'],
                            slug: `stablecoin-${i}`
                        };
                    case 1: // Tokenized Asset
                        return {
                            name: `Gold Token ${i}`,
                            symbol: `GOLD${i}`,
                            tags: ['tokenized-assets', 'tokenized-gold'],
                            slug: `gold-token-${i}`
                        };
                    case 2: // DeFi Token
                        return {
                            name: `DeFi Token ${i}`,
                            symbol: `DEFI${i}`,
                            tags: ['defi', 'yield-farming'],
                            slug: `defi-token-${i}`
                        };
                    case 3: // NFT
                        return {
                            name: `NFT Token ${i}`,
                            symbol: `NFT${i}`,
                            tags: ['nft', 'collectibles'],
                            slug: `nft-token-${i}`
                        };
                    default: // Generic cryptocurrency
                        return {
                            name: `Crypto ${i}`,
                            symbol: `CRYPTO${i}`,
                            tags: ['cryptocurrency'],
                            slug: `crypto-${i}`
                        };
                }
            });

            const startTime = Date.now();
            const results = mixedAssets.map(asset => classifier.classify({ asset }));
            const endTime = Date.now();

            expect(results).toHaveLength(5000);
            expect(results.every(r => r.hasOwnProperty('assetCategory'))).toBe(true);
            
            // Should efficiently classify mixed asset types
            expect(endTime - startTime).toBeLessThan(500);
            
            // Verify classification distribution
            const stablecoins = results.filter(r => r.assetCategory === 'Stablecoin');
            const tokenizedAssets = results.filter(r => r.assetCategory === 'Tokenized Asset');
            const others = results.filter(r => r.assetCategory === 'Other');
            
            expect(stablecoins).toHaveLength(1000); // 20% stablecoins
            expect(tokenizedAssets).toHaveLength(1000); // 20% tokenized assets
            expect(others).toHaveLength(3000); // 60% other
        });

        test('should handle malformed data efficiently in large batches', () => {
            const malformedAssets = Array.from({ length: 1000 }, (_, i) => {
                const malformationType = i % 4;
                switch (malformationType) {
                    case 0: // Missing fields
                        return { name: `Asset ${i}` };
                    case 1: // Null/undefined values
                        return {
                            name: null,
                            symbol: undefined,
                            tags: null,
                            slug: `asset-${i}`
                        };
                    case 2: // Wrong data types
                        return {
                            name: 123,
                            symbol: true,
                            tags: "stablecoin",
                            slug: []
                        };
                    default: // Valid asset
                        return {
                            name: `Valid Asset ${i}`,
                            symbol: `VALID${i}`,
                            tags: ['stablecoin'],
                            slug: `valid-asset-${i}`
                        };
                }
            });

            const startTime = Date.now();
            
            // Should not throw errors even with malformed data
            const results = malformedAssets.map(asset => {
                try {
                    return classifier.classify({ asset });
                } catch (error) {
                    return { assetCategory: 'Error', peggedAsset: null };
                }
            });
            
            const endTime = Date.now();

            expect(results).toHaveLength(1000);
            expect(results.every(r => r.hasOwnProperty('assetCategory'))).toBe(true);
            
            // Should handle malformed data gracefully and quickly
            expect(endTime - startTime).toBeLessThan(200);
            
            // Should have some successful classifications (valid assets)
            const successfulClassifications = results.filter(r => r.assetCategory !== 'Error');
            expect(successfulClassifications.length).toBeGreaterThan(200);
        });
    });

    describe('Baseline Performance Benchmarks', () => {
        test('should establish baseline single asset classification time', () => {
            const simpleAsset = {
                name: "USD Coin",
                symbol: "USDC",
                tags: ['stablecoin', 'usd-stablecoin'],
                slug: "usd-coin"
            };

            const iterations = 10000;
            const startTime = process.hrtime.bigint();

            for (let i = 0; i < iterations; i++) {
                classifier.classify({ asset: simpleAsset });
            }

            const endTime = process.hrtime.bigint();
            const durationNs = Number(endTime - startTime);
            const avgTimePerClassification = durationNs / iterations / 1000000; // Convert to milliseconds

            // Single classification should take less than 0.1ms on average
            expect(avgTimePerClassification).toBeLessThan(0.1);
        });

        test('should establish throughput benchmark for production scenarios', () => {
            // Simulate real-world mix of assets similar to actual API data
            const realisticAssets = Array.from({ length: 1000 }, (_, i) => {
                const random = Math.random();
                if (random < 0.1) { // 10% stablecoins
                    return {
                        name: `Stablecoin ${i}`,
                        symbol: `USD${i}`,
                        tags: ['stablecoin', 'usd-stablecoin', 'fiat-stablecoin'],
                        slug: `stablecoin-${i}`
                    };
                } else { // 90% other assets
                    return {
                        name: `Cryptocurrency ${i}`,
                        symbol: `CRYPTO${i}`,
                        tags: ['cryptocurrency', 'defi'],
                        slug: `crypto-${i}`
                    };
                }
            });

            const startTime = Date.now();
            const results = realisticAssets.map(asset => classifier.classify({ asset }));
            const endTime = Date.now();

            const throughput = 1000 / ((endTime - startTime) / 1000);

            expect(results).toHaveLength(1000);
            // Should achieve high throughput for realistic workloads
            expect(throughput).toBeGreaterThan(10000); // >10k assets/second

            // Log performance metrics for monitoring
            console.log(`Performance Benchmark - Throughput: ${Math.round(throughput)} assets/second`);
        });
    });
});
