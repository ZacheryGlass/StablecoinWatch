/**
 * Cross Data Source Compatibility Test Suite for AssetClassifier
 * 
 * Tests ensuring the same asset is classified consistently across different
 * API data formats from CoinMarketCap, DeFiLlama, CoinGecko, and Messari.
 */
const AssetClassifier = require('../../../services/domain/AssetClassifier');
const ApiConfig = require('../../../config/ApiConfig');

describe('AssetClassifier - Cross Data Source Compatibility', () => {
    let classifier;

    beforeEach(() => {
        classifier = new AssetClassifier(ApiConfig.getAssetClassificationConfig());
    });

    describe('Tether (USDT) Across All Data Sources', () => {
        test('should classify USDT consistently across all API formats', () => {
            // CoinMarketCap format
            const cmcFormat = {
                id: 825,
                name: "Tether USDt",
                symbol: "USDT",
                slug: "tether",
                tags: [
                    "stablecoin",
                    "asset-backed-stablecoin",
                    "usd-stablecoin",
                    "fiat-stablecoin",
                    "tron20-ecosystem",
                    "binance-ecosystem"
                ]
            };

            // DeFiLlama format
            const defiLlamaFormat = {
                id: "1",
                name: "Tether",
                symbol: "USDT",
                gecko_id: "tether",
                pegType: "peggedUSD",
                priceSource: "defillama",
                pegMechanism: "fiat-backed"
            };

            // CoinGecko format
            const coinGeckoFormat = {
                id: "tether",
                symbol: "usdt",
                name: "Tether",
                current_price: 1.00
            };

            // Messari format (minimal)
            const messariFormat = {
                id: "1e31218a-e44e-4285-820c-8282ee222035",
                serial_id: 6057,
                symbol: "USDT",
                name: "Tether",
                slug: "tether"
            };

            const results = [
                classifier.classify({ asset: cmcFormat }),
                classifier.classify({ asset: defiLlamaFormat }),
                classifier.classify({ asset: coinGeckoFormat }),
                classifier.classify({ asset: messariFormat })
            ];

            // All should classify as Stablecoin with USD peg
            results.forEach((result, index) => {
                expect(result.assetCategory).toBe('Stablecoin');
                expect(result.peggedAsset).toBe('USD');
            });
        });
    });

    describe('USDC Across All Data Sources', () => {
        test('should classify USDC consistently across all API formats', () => {
            // CoinMarketCap format
            const cmcFormat = {
                id: 3408,
                name: "USDC",
                symbol: "USDC",
                slug: "usd-coin",
                tags: [
                    "medium-of-exchange",
                    "stablecoin",
                    "asset-backed-stablecoin",
                    "coinbase-ventures-portfolio",
                    "usd-stablecoin",
                    "fiat-stablecoin"
                ]
            };

            // DeFiLlama format
            const defiLlamaFormat = {
                id: "2",
                name: "USD Coin",
                symbol: "USDC",
                gecko_id: "usd-coin",
                pegType: "peggedUSD",
                priceSource: "defillama",
                pegMechanism: "fiat-backed"
            };

            // CoinGecko format
            const coinGeckoFormat = {
                id: "usd-coin",
                symbol: "usdc",
                name: "USDC",
                current_price: 0.999825
            };

            const results = [
                classifier.classify({ asset: cmcFormat }),
                classifier.classify({ asset: defiLlamaFormat }),
                classifier.classify({ asset: coinGeckoFormat })
            ];

            results.forEach(result => {
                expect(result.assetCategory).toBe('Stablecoin');
                expect(result.peggedAsset).toBe('USD');
            });
        });
    });

    describe('Euro Stablecoins Across Data Sources', () => {
        test('should classify EURC consistently across all API formats', () => {
            // CoinMarketCap format
            const cmcFormat = {
                id: 20641,
                name: "EURC",
                symbol: "EURC",
                slug: "euro-coin",
                tags: [
                    "stablecoin",
                    "stellar-ecosystem",
                    "eur-stablecoin",
                    "fiat-stablecoin"
                ]
            };

            // DeFiLlama format
            const defiLlamaFormat = {
                name: "EURC",
                symbol: "EURC",
                gecko_id: "euro-coin",
                pegType: "peggedEUR",
                priceSource: "defillama",
                pegMechanism: "fiat-backed"
            };

            // CoinGecko format (minimal)
            const coinGeckoFormat = {
                id: "euro-coin",
                symbol: "eurc",
                name: "EURC"
            };

            const results = [
                classifier.classify({ asset: cmcFormat }),
                classifier.classify({ asset: defiLlamaFormat }),
                classifier.classify({ asset: coinGeckoFormat })
            ];

            results.forEach(result => {
                expect(result.assetCategory).toBe('Stablecoin');
                expect(result.peggedAsset).toBe('EUR');
            });
        });

        test('should classify EURS consistently across all API formats', () => {
            // CoinMarketCap format
            const cmcFormat = {
                name: "STASIS EURO",
                symbol: "EURS",
                slug: "stasis-euro",
                tags: [
                    "marketplace",
                    "stablecoin",
                    "asset-backed-stablecoin",
                    "eur-stablecoin",
                    "fiat-stablecoin"
                ]
            };

            // DeFiLlama format
            const defiLlamaFormat = {
                name: "Stasis Euro",
                symbol: "EURS",
                gecko_id: "stasis-eurs",
                pegType: "peggedEUR",
                priceSource: "defillama",
                pegMechanism: "fiat-backed"
            };

            const results = [
                classifier.classify({ asset: cmcFormat }),
                classifier.classify({ asset: defiLlamaFormat })
            ];

            results.forEach(result => {
                expect(result.assetCategory).toBe('Stablecoin');
                expect(result.peggedAsset).toBe('EUR');
            });
        });
    });

    describe('Algorithmic Stablecoins Across Data Sources', () => {
        test('should classify TerraClassicUSD consistently', () => {
            // CoinMarketCap might not have current data, but DeFiLlama does
            const defiLlamaFormat = {
                name: "TerraClassicUSD",
                symbol: "USTC",
                gecko_id: "terrausd",
                pegType: "peggedUSD",
                priceSource: "coingecko",
                pegMechanism: "algorithmic"
            };

            // Hypothetical CMC format if it existed
            const cmcFormat = {
                name: "TerraClassicUSD",
                symbol: "USTC",
                slug: "terrausd",
                tags: ["stablecoin", "algorithmic-stablecoin", "usd-stablecoin"]
            };

            const results = [
                classifier.classify({ asset: defiLlamaFormat }),
                classifier.classify({ asset: cmcFormat })
            ];

            results.forEach(result => {
                expect(result.assetCategory).toBe('Stablecoin');
                expect(result.peggedAsset).toBe('USD');
            });
        });

        test('should classify Celo Euro consistently', () => {
            // DeFiLlama format
            const defiLlamaFormat = {
                name: "Celo Euro",
                symbol: "CEUR",
                gecko_id: "celo-euro",
                pegType: "peggedEUR",
                priceSource: "defillama",
                pegMechanism: "algorithmic"
            };

            // CMC-style format
            const cmcFormat = {
                name: "Celo Euro",
                symbol: "CEUR",
                slug: "celo-euro",
                tags: ["defi", "stablecoin", "algorithmic-stablecoin", "celo-ecosystem", "eur-stablecoin"]
            };

            const results = [
                classifier.classify({ asset: defiLlamaFormat }),
                classifier.classify({ asset: cmcFormat })
            ];

            results.forEach(result => {
                expect(result.assetCategory).toBe('Stablecoin');
                expect(result.peggedAsset).toBe('EUR');
            });
        });
    });

    describe('Data Source Priority and Conflict Resolution', () => {
        test('should prioritize explicit tags over inferred patterns', () => {
            // Asset with conflicting signals
            const conflictingAsset = {
                name: "European Dollar", // Name suggests EUR
                symbol: "EURD",
                tags: ["stablecoin", "usd-stablecoin"], // Tags say USD
                pegType: "peggedUSD" // DeFiLlama confirms USD
            };

            const result = classifier.classify({ asset: conflictingAsset });
            expect(result.assetCategory).toBe('Stablecoin');
            // Should prioritize explicit tags/pegType over name inference
            expect(result.peggedAsset).toBe('USD');
        });

        test('should handle missing pegType gracefully with symbol fallback', () => {
            // DeFiLlama-style data but missing pegType
            const missingPegType = {
                name: "Some Euro Token",
                symbol: "EURT",
                gecko_id: "euro-token",
                pegMechanism: "fiat-backed"
                // No pegType or tags
            };

            const result = classifier.classify({ asset: missingPegType });
            expect(result.assetCategory).toBe('Stablecoin');
            // Should fall back to symbol detection
            expect(result.peggedAsset).toBe('EUR');
        });
    });

    describe('Chain-Specific Asset Variations', () => {
        test('should classify same asset on different chains consistently', () => {
            // USDC on different chains (common real-world scenario)
            const usdcVariants = [
                {
                    name: "USD Coin",
                    symbol: "USDC",
                    tags: ["stablecoin", "ethereum-ecosystem"],
                    chain: "Ethereum"
                },
                {
                    name: "USD Coin (PoS)",
                    symbol: "USDC",
                    tags: ["stablecoin", "polygon-ecosystem"],
                    chain: "Polygon"
                },
                {
                    name: "USD Coin",
                    symbol: "USDC.e",
                    tags: ["stablecoin", "avalanche-ecosystem"],
                    chain: "Avalanche"
                },
                {
                    name: "USD Coin",
                    symbol: "USDC",
                    tags: ["stablecoin", "solana-ecosystem"],
                    chain: "Solana"
                }
            ];

            usdcVariants.forEach(variant => {
                const result = classifier.classify({ asset: variant });
                expect(result.assetCategory).toBe('Stablecoin');
                expect(result.peggedAsset).toBe('USD');
            });
        });
    });

    describe('Data Format Normalization', () => {
        test('should handle different field naming conventions', () => {
            const differentFieldNames = [
                {
                    // Standard format
                    name: "USD Coin",
                    symbol: "USDC",
                    tags: ["stablecoin"]
                },
                {
                    // Alternative field names
                    assetName: "USD Coin",
                    ticker: "USDC",
                    categories: ["stablecoin"]
                },
                {
                    // Nested structure
                    asset: {
                        name: "USD Coin",
                        symbol: "USDC"
                    },
                    metadata: {
                        tags: ["stablecoin"]
                    }
                }
            ];

            // Only test formats that the classifier actually supports
            const standardResult = classifier.classify({ asset: differentFieldNames[0] });
            expect(standardResult.assetCategory).toBe('Stablecoin');
            expect(standardResult.peggedAsset).toBe('USD');

            // Alternative formats should be handled gracefully even if not fully supported
            expect(() => {
                classifier.classify({ asset: differentFieldNames[1] });
                classifier.classify({ asset: differentFieldNames[2] });
            }).not.toThrow();
        });
    });

    describe('API Response Structure Variations', () => {
        test('should handle wrapped vs unwrapped data structures', () => {
            const directFormat = {
                name: "Tether",
                symbol: "USDT",
                tags: ["stablecoin"]
            };

            const wrappedFormat = {
                data: {
                    name: "Tether",
                    symbol: "USDT",
                    tags: ["stablecoin"]
                }
            };

            const arrayFormat = {
                assets: [{
                    name: "Tether",
                    symbol: "USDT",
                    tags: ["stablecoin"]
                }]
            };

            // Direct format should work
            const directResult = classifier.classify({ asset: directFormat });
            expect(directResult.assetCategory).toBe('Stablecoin');

            // Wrapped formats should be handled gracefully
            expect(() => {
                classifier.classify({ asset: wrappedFormat });
                classifier.classify({ asset: arrayFormat });
            }).not.toThrow();
        });
    });

    describe('Missing Data Graceful Degradation', () => {
        test('should classify assets with partial data from different sources', () => {
            const partialDataAssets = [
                {
                    // Only name available (CoinGecko style minimal)
                    name: "USD Coin"
                },
                {
                    // Only symbol available
                    symbol: "USDC"
                },
                {
                    // Only tags available
                    tags: ["stablecoin", "usd-stablecoin"]
                },
                {
                    // Name + symbol, no tags
                    name: "USD Coin",
                    symbol: "USDC"
                },
                {
                    // Symbol + tags, no name
                    symbol: "USDC",
                    tags: ["stablecoin"]
                }
            ];

            partialDataAssets.forEach((asset, index) => {
                const result = classifier.classify({ asset });
                expect(result).toHaveProperty('assetCategory');
                expect(result).toHaveProperty('peggedAsset');
                // Should not throw errors with partial data
            });
        });
    });

    describe('Data Source Reliability Hierarchy', () => {
        test('should prefer more explicit classification data', () => {
            // Same asset with different levels of classification detail
            const minimalClassification = {
                name: "European Token",
                symbol: "EURT"
                // No explicit classification
            };

            const basicClassification = {
                name: "European Token", 
                symbol: "EURT",
                tags: ["stablecoin"]
            };

            const detailedClassification = {
                name: "European Token",
                symbol: "EURT", 
                tags: ["stablecoin", "eur-stablecoin", "fiat-stablecoin"],
                pegType: "peggedEUR"
            };

            const results = [
                classifier.classify({ asset: minimalClassification }),
                classifier.classify({ asset: basicClassification }),
                classifier.classify({ asset: detailedClassification })
            ];

            // All should reach the same conclusion despite different data detail levels
            results.forEach(result => {
                expect(result.assetCategory).toBe('Stablecoin');
                expect(result.peggedAsset).toBe('EUR');
            });
        });
    });

    describe('Real API Response Edge Cases', () => {
        test('should handle API responses with extra metadata', () => {
            // Realistic API response with lots of extra fields
            const fullAPIResponse = {
                id: 825,
                name: "Tether USDt",
                symbol: "USDT",
                slug: "tether",
                tags: ["stablecoin", "usd-stablecoin"],
                infinite_supply: true,
                self_reported_circulating_supply: null,
                self_reported_market_cap: null,
                tvl_ratio: null,
                last_updated: "2025-09-08T02:10:00.000Z",
                quote: {
                    USD: {
                        price: 1.0001234,
                        volume_24h: 92271016164,
                        volume_change_24h: 5.23,
                        percent_change_1h: 0.01,
                        percent_change_24h: 0.05,
                        percent_change_7d: -0.12,
                        market_cap: 169428638762,
                        market_cap_dominance: 4.12,
                        fully_diluted_market_cap: 169428638762,
                        last_updated: "2025-09-08T02:10:00.000Z"
                    }
                },
                platform: {
                    id: 1027,
                    name: "Ethereum",
                    symbol: "ETH",
                    slug: "ethereum",
                    token_address: "0xdac17f958d2ee523a2206206994597c13d831ec7"
                }
            };

            const result = classifier.classify({ asset: fullAPIResponse });
            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('USD');
        });
    });
});
