/**
 * Test for the specific scenario mentioned by the user:
 * A new stablecoin pegged to the Zimbabwean Dollar (ZWD) that appears
 * in data sources without requiring code updates.
 */
const AssetClassifier = require('../../../services/domain/AssetClassifier');
const ApiConfig = require('../../../config/ApiConfig');

describe('AssetClassifier - Zimbabwean Dollar (ZWD) Stablecoin Detection', () => {
    let classifier;

    beforeEach(() => {
        classifier = new AssetClassifier(ApiConfig.getAssetClassificationConfig());
    });

    describe('User Scenario: New ZWD Stablecoin appears in data source', () => {
        test('should detect ZWD stablecoin with explicit zwd-stablecoin tag', () => {
            const result = classifier.classify({ asset: {
                tags: ['stablecoin', 'zwd-stablecoin'],
                name: 'Zimbabwe Dollar Token',
                symbol: 'ZWDt',
                slug: 'zimbabwe-dollar-token'
            }});

            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('ZWD');
        });

        test('should detect ZWD stablecoin with peggedZWD tag', () => {
            const result = classifier.classify({ asset: {
                tags: ['stablecoin', 'peggedZWD'],
                name: 'Pegged Zimbabwe Token',
                symbol: 'PZWD',
                slug: 'pegged-zimbabwe-token'
            }});

            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('ZWD');
        });

        test('should detect ZWD stablecoin from symbol pattern when no specific currency tag', () => {
            const result = classifier.classify({ asset: {
                tags: ['stablecoin'], // Only generic stablecoin tag
                name: 'Zimbabwe Stable Currency',
                symbol: 'ZWD',
                slug: 'zimbabwe-stable-currency'
            }});

            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('ZWD');
        });

        test('should detect ZWD stablecoin from symbol variations', () => {
            const testCases = [
                'ZWDt',     // Common t suffix
                'ZWDc',     // Common c suffix
                'ZWD',      // Exact match
                'zwd',      // Lowercase
                'ZWDT'      // Common T suffix
            ];

            testCases.forEach(symbol => {
                const result = classifier.classify({ asset: {
                    tags: ['stablecoin'],
                    name: 'Zimbabwe Currency',
                    symbol,
                    slug: 'zimbabwe-currency'
                }});

                expect(result.assetCategory).toBe('Stablecoin');
                expect(result.peggedAsset).toBe('ZWD');
            });
        });

        test('should detect ZWD from embedded currency codes in names', () => {
            const testCases = [
                'ZWD Backed Stablecoin',
                'Zimbabwe ZWD Token',
                'Digital ZWD Currency',
                'ZWD Pegged Asset'
            ];

            testCases.forEach(name => {
                const result = classifier.classify({ asset: {
                    tags: ['stablecoin'],
                    name,
                    symbol: 'TOKEN',
                    slug: name.toLowerCase().replace(/\s+/g, '-')
                }});

                expect(result.assetCategory).toBe('Stablecoin');
                expect(result.peggedAsset).toBe('ZWD');
            });
        });

        test('should handle ZWD stablecoin mixed with other tags', () => {
            const result = classifier.classify({ asset: {
                tags: ['stablecoin', 'zwd-stablecoin', 'digital-currency', 'african-currency'],
                name: 'Zimbabwe Digital Dollar',
                symbol: 'ZDD',
                slug: 'zimbabwe-digital-dollar'
            }});

            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('ZWD');
        });
    });

    describe('Data Source Compatibility - Common API formats', () => {
        test('should work with CoinMarketCap-style data', () => {
            const cmcStyleAsset = {
                tags: ['stablecoin', 'zwd-stablecoin'],
                name: 'Zimbabwe Dollar Tether',
                symbol: 'ZWDT',
                slug: 'zimbabwe-dollar-tether'
            };

            const result = classifier.classify({ asset: cmcStyleAsset });
            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('ZWD');
        });

        test('should work with Messari-style data', () => {
            const messariStyleAsset = {
                tags: ['peggedZWD'],
                name: 'Zimbabwe Stable Token',
                symbol: 'ZST',
                slug: 'zimbabwe-stable-token'
            };

            const result = classifier.classify({ asset: messariStyleAsset });
            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('ZWD');
        });

        test('should work with CoinGecko-style data', () => {
            const coinGeckoStyleAsset = {
                tags: ['stablecoin'],
                name: 'ZWD Coin',
                symbol: 'ZWDC',
                slug: 'zwd-coin'
            };

            const result = classifier.classify({ asset: coinGeckoStyleAsset });
            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('ZWD');
        });

        test('should work with DeFiLlama-style data', () => {
            const defiLlamaStyleAsset = {
                tags: ['stablecoin'],
                name: 'Zimbabwe Dollar',
                symbol: 'ZWD',
                slug: 'zimbabwe-dollar'
            };

            const result = classifier.classify({ asset: defiLlamaStyleAsset });
            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('ZWD');
        });
    });

    describe('Environment Variable Support for ZWD', () => {
        test('should support custom ZWD alias via environment variable', () => {
            process.env.CUSTOM_CURRENCIES = 'ZWD:Zimbabwean Dollar,ZWL:Zimbabwe Dollar Legacy';
            
            const envClassifier = new AssetClassifier(ApiConfig.getAssetClassificationConfig());
            
            const result = envClassifier.classify({ asset: {
                tags: ['zwd-stablecoin'],
                name: 'Zimbabwe Token',
                symbol: 'ZT',
                slug: 'zimbabwe-token'
            }});

            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('Zimbabwean Dollar');

            delete process.env.CUSTOM_CURRENCIES;
        });
    });

    describe('Edge Cases for ZWD Detection', () => {
        test('should not detect false positives', () => {
            const falsePositiveCases = [
                { 
                    tags: ['tokenized-assets'],
                    name: 'Random Token',
                    symbol: 'RND',
                    slug: 'random-token'
                },
                {
                    tags: ['stablecoin'],
                    name: 'Generic Stable',
                    symbol: 'GST',
                    slug: 'generic-stable'
                }
            ];

            falsePositiveCases.forEach(testCase => {
                const result = classifier.classify({ asset: testCase });
                expect(result.peggedAsset).not.toBe('ZWD');
            });
        });

        test('should handle malformed ZWD data gracefully', () => {
            const malformedCases = [
                { tags: null, name: 'ZWD Token', symbol: 'ZWD' },
                { tags: ['stablecoin'], name: null, symbol: 'ZWD' },
                { tags: ['stablecoin'], name: 'ZWD Token', symbol: null },
                { tags: [], name: '', symbol: '', slug: '' }
            ];

            malformedCases.forEach(testCase => {
                expect(() => {
                    const result = classifier.classify({ asset: testCase });
                    // Should not throw, and should return valid classification
                    expect(result).toHaveProperty('assetCategory');
                    expect(result).toHaveProperty('peggedAsset');
                }).not.toThrow();
            });
        });
    });

    describe('Performance with ZWD Detection', () => {
        test('should maintain fast performance with ZWD detection', () => {
            const startTime = Date.now();
            const iterations = 1000;

            for (let i = 0; i < iterations; i++) {
                classifier.classify({ asset: {
                    tags: ['stablecoin'],
                    name: `ZWD Token ${i}`,
                    symbol: `ZWD${i}`,
                    slug: `zwd-token-${i}`
                }});
            }

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Should complete 1000 ZWD classifications quickly
            expect(duration).toBeLessThan(100);
        });
    });

    describe('Backward Compatibility with ZWD Support', () => {
        test('should not break existing USD/EUR detection while supporting ZWD', () => {
            const legacyTests = [
                { 
                    input: { tags: ['stablecoin'], name: 'Dollar Token', symbol: 'USDT' },
                    expected: 'USD'
                },
                {
                    input: { tags: ['stablecoin'], name: 'Euro Token', symbol: 'EURT' },
                    expected: 'EUR'
                },
                {
                    input: { tags: ['stablecoin'], name: 'Zimbabwe Token', symbol: 'ZWDT' },
                    expected: 'ZWD'
                }
            ];

            legacyTests.forEach(({ input, expected }) => {
                const result = classifier.classify({ asset: {
                    ...input,
                    slug: input.name.toLowerCase().replace(' ', '-')
                }});
                expect(result.assetCategory).toBe('Stablecoin');
                expect(result.peggedAsset).toBe(expected);
            });
        });
    });
});
