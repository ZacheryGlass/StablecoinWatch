/**
 * Real-World Edge Cases Test Suite for AssetClassifier
 * 
 * Tests based on actual problematic assets found in production data from
 * CoinMarketCap, DeFiLlama, CoinGecko, and Messari APIs.
 */
const AssetClassifier = require('../../../services/domain/AssetClassifier');
const ApiConfig = require('../../../config/ApiConfig');

describe('AssetClassifier - Real-World Edge Cases', () => {
    let classifier;

    beforeEach(() => {
        classifier = new AssetClassifier(ApiConfig.getAssetClassificationConfig());
    });

    describe('Depegged and Collapsed Stablecoins', () => {
        test('should classify Venus BUSD despite extreme depeg', () => {
            // Real asset from CMC: vBUSD trading at $0.022 (96% depegged)
            const venusUST = {
                id: 7959,
                name: "Venus BUSD",
                symbol: "vBUSD",
                slug: "venus-busd",
                tags: ["stablecoin"],
                current_price: 0.02231431262938752 // Real price from data
            };

            const result = classifier.classify({ asset: venusUST });
            expect(result.assetCategory).toBe('Stablecoin');
            // Should still detect as USD stablecoin despite price
            expect(result.peggedAsset).toBe('USD');
        });

        test('should classify TerraClassicUSD despite algorithmic collapse', () => {
            // Real asset from DeFiLlama: USTC post-collapse
            const terraClassicUSD = {
                name: "TerraClassicUSD",
                symbol: "USTC",
                gecko_id: "terrausd",
                pegType: "peggedUSD",
                pegMechanism: "algorithmic",
                tags: ["stablecoin"]
            };

            const result = classifier.classify({ asset: terraClassicUSD });
            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('USD');
        });

        test('should handle completely defunct stablecoins', () => {
            const defunctStablecoin = {
                name: "Iron Finance USD",
                symbol: "IRON",
                tags: ["stablecoin", "algorithmic-stablecoin"],
                current_price: 0.00001, // Effectively worthless
                circulating_supply: 0
            };

            const result = classifier.classify({ asset: defunctStablecoin });
            expect(result.assetCategory).toBe('Stablecoin');
            // Should still detect the intended peg
            expect(result.peggedAsset).toBe('USD');
        });
    });

    describe('Complex Real-World EUR Stablecoins', () => {
        test('should classify all EUR stablecoin variants from real data', () => {
            const realEURStablecoins = [
                { name: "Tether EURt", symbol: "EURt", tags: ["stablecoin", "asset-backed-stablecoin", "eur-stablecoin"] },
                { name: "EURC", symbol: "EURC", tags: ["stablecoin", "eur-stablecoin"] },
                { name: "STASIS EURO", symbol: "EURS", tags: ["stablecoin", "asset-backed-stablecoin", "eur-stablecoin"] },
                { name: "Celo Euro", symbol: "CEUR", pegType: "peggedEUR", pegMechanism: "algorithmic" },
                { name: "sEUR", symbol: "SEUR", pegType: "peggedEUR", pegMechanism: "crypto-backed" },
                { name: "EURA", symbol: "EURA", pegType: "peggedEUR", pegMechanism: "crypto-backed" },
                { name: "Anchored Coins AEUR", symbol: "AEUR", tags: ["stablecoin", "eur-stablecoin"] },
                { name: "Eurite", symbol: "EURI", tags: ["stablecoin", "eur-stablecoin"] },
                { name: "StablR Euro", symbol: "EURR", tags: ["stablecoin", "asset-backed-stablecoin", "eur-stablecoin"] },
                { name: "EUR CoinVertible", symbol: "EURCV", tags: ["stablecoin", "eur-stablecoin"] }
            ];

            realEURStablecoins.forEach(asset => {
                const result = classifier.classify({ asset: {
                    ...asset,
                    slug: asset.name.toLowerCase().replace(/\s+/g, '-')
                }});
                expect(result.assetCategory).toBe('Stablecoin');
                expect(result.peggedAsset).toBe('EUR');
            });
        });
    });

    describe('Complex Real-World USD Stablecoins', () => {
        test('should classify unusual USD stablecoin symbols from real data', () => {
            const realUSDStablecoins = [
                { name: "World Liberty Financial USD", symbol: "USD1", tags: ["stablecoin", "usd-stablecoin"] },
                { name: "Ethena USDe", symbol: "USDe", tags: ["stablecoin", "asset-backed-stablecoin", "usd-stablecoin"] },
                { name: "USDD", symbol: "USDD", tags: ["stablecoin", "algorithmic-stablecoin", "usd-stablecoin"] },
                { name: "Falcon USD", symbol: "USDf", tags: ["stablecoin", "usd-stablecoin"] },
                { name: "Ondo US Dollar Yield", symbol: "USDY", tags: ["stablecoin"] },
                { name: "Usual USD", symbol: "USD0", tags: ["stablecoin", "asset-backed-stablecoin", "usd-stablecoin"] },
                { name: "Global Dollar", symbol: "USDG", tags: ["stablecoin", "usd-stablecoin"] },
                { name: "Noble Dollar", symbol: "USDN", tags: ["stablecoin", "usd-stablecoin"] },
                { name: "StraitsX USD", symbol: "XUSD", tags: ["stablecoin"] },
                { name: "Frax USD", symbol: "FRXUSD", tags: ["stablecoin", "usd-stablecoin"] },
                { name: "lisUSD", symbol: "lisUSD", tags: ["stablecoin", "usd-stablecoin"] },
                { name: "USDB", symbol: "USDB", tags: ["stablecoin", "usd-stablecoin"] },
                { name: "Lift Dollar", symbol: "USDL", tags: ["stablecoin"] },
                { name: "AUSD", symbol: "AUSD", tags: ["stablecoin", "usd-stablecoin"] },
                { name: "Aegis YUSD", symbol: "YUSD", tags: ["stablecoin", "usd-stablecoin"] },
                { name: "ZUSD", symbol: "ZUSD", tags: ["stablecoin", "usd-stablecoin"] }
            ];

            realUSDStablecoins.forEach(asset => {
                const result = classifier.classify({ asset: {
                    ...asset,
                    slug: asset.name.toLowerCase().replace(/\s+/g, '-')
                }});
                expect(result.assetCategory).toBe('Stablecoin');
                expect(result.peggedAsset).toBe('USD');
            });
        });
    });

    describe('Ambiguous and Edge Case Assets', () => {
        test('should handle assets with unclear currency designation', () => {
            // Real asset from CMC data - tagged as stablecoin but unclear peg
            const mnee = {
                id: 32878,
                name: "MNEE",
                symbol: "MNEE",
                slug: "mnee",
                tags: ["stablecoin"],
                current_price: 1.0018441320420692
            };

            const result = classifier.classify({ asset: mnee });
            expect(result.assetCategory).toBe('Stablecoin');
            // Should not assume a currency if unclear
            expect(result.peggedAsset).toBeNull();
        });

        test('should handle synthetic USD assets', () => {
            const stanDXUSD = {
                name: "DeFiDollar",
                symbol: "DUSD",
                slug: "standx-dusd",
                tags: ["defi", "derivatives", "stablecoin"],
                current_price: 0.9999316377892337
            };

            const result = classifier.classify({ asset: stanDXUSD });
            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('USD');
        });

        test('should handle wrapped/bridged stablecoins', () => {
            // Variations of the same stablecoin across different chains
            const wrappedVariants = [
                { name: "Wrapped USDC", symbol: "WUSDC", tags: ["stablecoin"] },
                { name: "Polygon USDC", symbol: "USDC.e", tags: ["stablecoin"] },
                { name: "Avalanche USDC", symbol: "USDC", tags: ["stablecoin", "avalanche-ecosystem"] }
            ];

            wrappedVariants.forEach(asset => {
                const result = classifier.classify({ asset });
                expect(result.assetCategory).toBe('Stablecoin');
                expect(result.peggedAsset).toBe('USD');
            });
        });
    });

    describe('Multi-Language and Special Character Names', () => {
        test('should handle assets with special characters in names', () => {
            const specialCharAssets = [
                { name: "€URO Token", symbol: "EURO", tags: ["stablecoin"] },
                { name: "¥EN Stablecoin", symbol: "YEN", tags: ["stablecoin"] },
                { name: "£GBP Coin", symbol: "GBP", tags: ["stablecoin"] },
                { name: "Tether – Euro", symbol: "EUR€", tags: ["stablecoin"] }
            ];

            specialCharAssets.forEach(asset => {
                const result = classifier.classify({ asset });
                expect(result.assetCategory).toBe('Stablecoin');
                // Should detect currency despite special characters
                expect(result.peggedAsset).not.toBeNull();
            });
        });

        test('should handle extremely long asset names', () => {
            const longNameAsset = {
                name: "World Liberty Financial USD Dollar Stablecoin Token Backed by United States Treasury Bills and Commercial Paper",
                symbol: "WLFI-USD-LONG",
                tags: ["stablecoin", "usd-stablecoin"],
                slug: "world-liberty-financial-usd-long"
            };

            const result = classifier.classify({ asset: longNameAsset });
            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('USD');
        });
    });

    describe('Tag Explosion and Performance Edge Cases', () => {
        test('should handle assets with many tags efficiently', () => {
            // Simulating Bitcoin's tag structure but with stablecoin
            const manyTagsAsset = {
                name: "Multi-Portfolio USD",
                symbol: "MPUSD",
                tags: [
                    "stablecoin",
                    "usd-stablecoin",
                    "coinbase-ventures-portfolio",
                    "three-arrows-capital-portfolio",
                    "polychain-capital-portfolio",
                    "binance-labs-portfolio",
                    "blockchain-capital-portfolio",
                    "boostvc-portfolio",
                    "cms-holdings-portfolio",
                    "dcg-portfolio",
                    "dragonfly-capital-portfolio",
                    "electric-capital-portfolio",
                    "fabric-ventures-portfolio",
                    "framework-ventures-portfolio",
                    "galaxy-digital-portfolio",
                    "huobi-capital-portfolio",
                    "alameda-research-portfolio",
                    "a16z-portfolio",
                    "1confirmation-portfolio",
                    "winklevoss-capital-portfolio",
                    "usv-portfolio",
                    "placeholder-ventures-portfolio",
                    "pantera-capital-portfolio",
                    "multicoin-capital-portfolio",
                    "paradigm-portfolio",
                    "asset-backed-stablecoin",
                    "fiat-stablecoin",
                    "tron20-ecosystem",
                    "made-in-america",
                    "binance-ecosystem",
                    "binance-listing",
                    "ethereum-ecosystem",
                    "polygon-ecosystem",
                    "avalanche-ecosystem",
                    "arbitrum-ecosystem",
                    "optimism-ecosystem",
                    "defi",
                    "lending-borrowing",
                    "yield-farming",
                    "store-of-value",
                    "medium-of-exchange"
                ],
                slug: "multi-portfolio-usd"
            };

            const startTime = Date.now();
            const result = classifier.classify({ asset: manyTagsAsset });
            const endTime = Date.now();

            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('USD');
            expect(endTime - startTime).toBeLessThan(10); // Should be fast even with many tags
        });
    });

    describe('Malformed and Invalid Data Edge Cases', () => {
        test('should handle malformed tag arrays gracefully', () => {
            const malformedAssets = [
                { name: "Test Coin", symbol: "TEST", tags: null },
                { name: "Test Coin", symbol: "TEST", tags: "stablecoin" }, // String instead of array
                { name: "Test Coin", symbol: "TEST", tags: [null, undefined, ""] },
                { name: "Test Coin", symbol: "TEST", tags: [123, true, {}, []] },
                { name: "Test Coin", symbol: "TEST", tags: ["stablecoin", "stablecoin", "stablecoin"] } // Duplicates
            ];

            malformedAssets.forEach(asset => {
                expect(() => {
                    const result = classifier.classify({ asset });
                    expect(result).toHaveProperty('assetCategory');
                    expect(result).toHaveProperty('peggedAsset');
                }).not.toThrow();
            });
        });

        test('should handle missing required fields', () => {
            const incompleteAssets = [
                { tags: ["stablecoin"] }, // Missing name, symbol
                { name: "USD Coin" }, // Missing tags, symbol
                { symbol: "USDC" }, // Missing name, tags
                {}, // Empty object
                null, // Null object
                undefined // Undefined object
            ];

            incompleteAssets.forEach(asset => {
                expect(() => {
                    const result = classifier.classify({ asset: asset || {} });
                    expect(result).toHaveProperty('assetCategory');
                    expect(result).toHaveProperty('peggedAsset');
                }).not.toThrow();
            });
        });

        test('should handle non-string name/symbol/slug values', () => {
            const nonStringAssets = [
                { name: 123, symbol: true, slug: [], tags: ["stablecoin"] },
                { name: {}, symbol: null, slug: undefined, tags: ["stablecoin"] },
                { name: "", symbol: "", slug: "", tags: ["stablecoin"] }
            ];

            nonStringAssets.forEach(asset => {
                expect(() => {
                    const result = classifier.classify({ asset });
                    expect(result).toHaveProperty('assetCategory');
                    expect(result).toHaveProperty('peggedAsset');
                }).not.toThrow();
            });
        });
    });

    describe('Real DeFiLlama pegType Variations', () => {
        test('should handle all pegType formats from DeFiLlama', () => {
            const defiLlamaAssets = [
                { name: "Tether", symbol: "USDT", pegType: "peggedUSD", pegMechanism: "fiat-backed" },
                { name: "Euro Tether", symbol: "EURT", pegType: "peggedEUR", pegMechanism: "fiat-backed" },
                { name: "Celo Euro", symbol: "CEUR", pegType: "peggedEUR", pegMechanism: "algorithmic" },
                { name: "sEUR", symbol: "SEUR", pegType: "peggedEUR", pegMechanism: "crypto-backed" }
            ];

            defiLlamaAssets.forEach(asset => {
                const result = classifier.classify({ asset });
                expect(result.assetCategory).toBe('Stablecoin');
                
                if (asset.pegType === "peggedUSD") {
                    expect(result.peggedAsset).toBe('USD');
                } else if (asset.pegType === "peggedEUR") {
                    expect(result.peggedAsset).toBe('EUR');
                }
            });
        });
    });

    describe('Case Sensitivity and Normalization Edge Cases', () => {
        test('should handle various case combinations in real data', () => {
            const caseSensitivityTests = [
                // CoinGecko format (all lowercase)
                { name: "tether", symbol: "usdt", id: "tether" },
                // CMC format (mixed case)
                { name: "Tether USDt", symbol: "USDT", tags: ["STABLECOIN", "USD-STABLECOIN"] },
                // Inconsistent casing
                { name: "USD coin", symbol: "usdc", tags: ["StAbLeCoin", "Usd-StAbLeCoin"] }
            ];

            caseSensitivityTests.forEach(asset => {
                const result = classifier.classify({ asset });
                expect(result.assetCategory).toBe('Stablecoin');
                expect(result.peggedAsset).toBe('USD');
            });
        });
    });

    describe('Performance with Real Dataset Size', () => {
        test('should efficiently process multiple assets in batch', () => {
            // Simulating processing a subset of the 9,515 assets from CMC
            const batchAssets = Array.from({ length: 100 }, (_, i) => ({
                name: `Stablecoin ${i}`,
                symbol: `USD${i}`,
                tags: ["stablecoin", "usd-stablecoin"],
                slug: `stablecoin-${i}`
            }));

            const startTime = Date.now();
            const results = batchAssets.map(asset => classifier.classify({ asset }));
            const endTime = Date.now();

            expect(results).toHaveLength(100);
            expect(results.every(r => r.assetCategory === 'Stablecoin')).toBe(true);
            expect(endTime - startTime).toBeLessThan(100); // Should process 100 assets quickly
        });
    });
});
