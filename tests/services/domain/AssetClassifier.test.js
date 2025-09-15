/**
 * Unit tests for AssetClassifier
 * Tests classification logic, configuration handling, and performance
 */
const AssetClassifier = require('../../../services/domain/AssetClassifier');

describe('AssetClassifier', () => {
    let classifier;
    let defaultConfig;

    beforeEach(() => {
        // Default configuration matching current CMC fetcher logic
        defaultConfig = {
            taxonomy: {
                stablecoinTags: ['stablecoin'],
                tokenizedAssetTags: ['tokenized-assets'],
                tokenizedSubtypes: {
                    'tokenized-gold': 'Gold',
                    'tokenized-silver': 'Silver',
                    'tokenized-etfs': 'ETF',
                    'tokenized-stock': 'Stocks',
                    'tokenized-real-estate': 'Real Estate',
                    'tokenized-treasury-bills': 'Treasury Bills',
                    'tokenized-commodities': 'Commodities'
                },
                assetBackedTags: ['asset-backed-stablecoin'],
                patterns: {
                    goldSymbols: 'xau|paxg|xaut',
                    goldNames: 'gold',
                    silverSymbols: 'xag',
                    silverNames: 'silver',
                    etf: 'etf',
                    treasury: 'treasury',
                    stock: 'stock',
                    realEstate: 'real estate|real-estate|estate'
                }
            }
        };
        
        classifier = new AssetClassifier(defaultConfig);
    });

    afterEach(() => {
        // Clean up environment variables
        delete process.env.ASSET_CLASSIFICATION_ENABLED;
        delete process.env.CUSTOM_STABLECOIN_TAGS;
        delete process.env.CUSTOM_TOKENIZED_TAGS;
    });

    describe('Constructor and Initialization', () => {
        test('should initialize with default configuration', () => {
            const emptyClassifier = new AssetClassifier();
            expect(emptyClassifier.getAssetCategories()).toEqual({
                STABLECOIN: 'Stablecoin',
                TOKENIZED_ASSET: 'Tokenized Asset',
                OTHER: 'Other'
            });
        });

        test('should initialize with custom configuration', () => {
            const customConfig = {
                taxonomy: {
                    stablecoinTags: ['stablecoin', 'stable'],
                    tokenizedAssetTags: ['tokenized-assets', 'rwa']
                }
            };
            const customClassifier = new AssetClassifier(customConfig);
            expect(customClassifier).toBeDefined();
        });

        test('should handle environment variable overrides', () => {
            process.env.CUSTOM_STABLECOIN_TAGS = 'stable,fiat-backed';
            process.env.CUSTOM_TOKENIZED_TAGS = 'rwa,real-world-assets';
            
            const envClassifier = new AssetClassifier(defaultConfig);
            const config = envClassifier.getConfigSummary();
            
            expect(config.stablecoinTagCount).toBeGreaterThan(1);
            expect(config.tokenizedAssetTagCount).toBeGreaterThan(1);
        });
    });

    describe('Stablecoin Classification', () => {
        test('should classify stablecoin by tag', () => {
            const result = classifier.classify({
                tags: ['stablecoin'],
                name: 'USD Coin',
                symbol: 'USDC',
                slug: 'usd-coin'
            });

            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBeNull();
        });

        test('should handle case-insensitive tags', () => {
            const result = classifier.classify({
                tags: ['STABLECOIN', 'StAbLeCoin'],
                name: 'Tether',
                symbol: 'USDT',
                slug: 'tether'
            });

            expect(result.assetCategory).toBe('Stablecoin');
        });

        test('should handle empty or invalid tags', () => {
            const result1 = classifier.classify({
                tags: [],
                name: 'Some Token',
                symbol: 'TOKEN',
                slug: 'some-token'
            });

            const result2 = classifier.classify({
                tags: null,
                name: 'Another Token',
                symbol: 'ANOTHER',
                slug: 'another-token'
            });

            expect(result1.assetCategory).toBe('Other');
            expect(result2.assetCategory).toBe('Other');
        });
    });

    describe('Tokenized Asset Classification', () => {
        test('should classify tokenized assets by tag', () => {
            const result = classifier.classify({
                tags: ['tokenized-assets'],
                name: 'Some Tokenized Asset',
                symbol: 'RWA',
                slug: 'rwa-token'
            });

            expect(result.assetCategory).toBe('Tokenized Asset');
            expect(result.peggedAsset).toBe('Tokenized Asset');
        });

        test('should classify specific tokenized gold by tag', () => {
            const result = classifier.classify({
                tags: ['tokenized-gold'],
                name: 'PAX Gold',
                symbol: 'PAXG',
                slug: 'pax-gold'
            });

            expect(result.assetCategory).toBe('Tokenized Asset');
            expect(result.peggedAsset).toBe('Gold');
        });

        test('should classify specific tokenized silver by tag', () => {
            const result = classifier.classify({
                tags: ['tokenized-silver'],
                name: 'Silver Token',
                symbol: 'SLVR',
                slug: 'silver-token'
            });

            expect(result.assetCategory).toBe('Tokenized Asset');
            expect(result.peggedAsset).toBe('Silver');
        });

        test('should classify ETF by tag', () => {
            const result = classifier.classify({
                tags: ['tokenized-etfs'],
                name: 'ETF Token',
                symbol: 'ETF',
                slug: 'etf-token'
            });

            expect(result.assetCategory).toBe('Tokenized Asset');
            expect(result.peggedAsset).toBe('ETF');
        });

        test('should classify stocks by tag', () => {
            const result = classifier.classify({
                tags: ['tokenized-stock'],
                name: 'Apple Stock Token',
                symbol: 'AAPL',
                slug: 'apple-stock'
            });

            expect(result.assetCategory).toBe('Tokenized Asset');
            expect(result.peggedAsset).toBe('Stocks');
        });

        test('should classify real estate by tag', () => {
            const result = classifier.classify({
                tags: ['tokenized-real-estate'],
                name: 'Real Estate Token',
                symbol: 'RET',
                slug: 'real-estate-token'
            });

            expect(result.assetCategory).toBe('Tokenized Asset');
            expect(result.peggedAsset).toBe('Real Estate');
        });

        test('should classify treasury bills by tag', () => {
            const result = classifier.classify({
                tags: ['tokenized-treasury-bills'],
                name: 'Treasury Token',
                symbol: 'TBILL',
                slug: 'treasury-token'
            });

            expect(result.assetCategory).toBe('Tokenized Asset');
            expect(result.peggedAsset).toBe('Treasury Bills');
        });

        test('should classify commodities by tag', () => {
            const result = classifier.classify({
                tags: ['tokenized-commodities'],
                name: 'Commodity Token',
                symbol: 'COMD',
                slug: 'commodity-token'
            });

            expect(result.assetCategory).toBe('Tokenized Asset');
            expect(result.peggedAsset).toBe('Commodities');
        });
    });

    describe('Symbol and Name Pattern Matching', () => {
        test('should detect gold by symbol patterns', () => {
            const testCases = [
                { symbol: 'PAXG', expected: 'Gold' },
                { symbol: 'XAUT', expected: 'Gold' },
                { symbol: 'XAU', expected: 'Gold' },
                { symbol: 'xau', expected: 'Gold' }
            ];

            testCases.forEach(({ symbol, expected }) => {
                const result = classifier.classify({
                    tags: ['tokenized-assets'],
                    name: 'Token',
                    symbol,
                    slug: 'token'
                });
                expect(result.peggedAsset).toBe(expected);
            });
        });

        test('should detect silver by symbol patterns', () => {
            const result = classifier.classify({
                tags: ['tokenized-assets'],
                name: 'Silver Token',
                symbol: 'XAG',
                slug: 'silver'
            });

            expect(result.peggedAsset).toBe('Silver');
        });

        test('should detect gold by name patterns', () => {
            const testCases = [
                { name: 'Gold Token', expected: 'Gold' },
                { name: 'PAX GOLD', expected: 'Gold' },
                { slug: 'gold-token', expected: 'Gold' },
                { slug: 'pax-gold', expected: 'Gold' }
            ];

            testCases.forEach(({ name = '', slug = '', expected }) => {
                const result = classifier.classify({
                    tags: ['tokenized-assets'],
                    name,
                    symbol: 'TOKEN',
                    slug
                });
                expect(result.peggedAsset).toBe(expected);
            });
        });

        test('should detect silver by name patterns', () => {
            const result = classifier.classify({
                tags: ['tokenized-assets'],
                name: 'Silver Backed Token',
                symbol: 'TOKEN',
                slug: 'silver-token'
            });

            expect(result.peggedAsset).toBe('Silver');
        });

        test('should detect ETF by name patterns', () => {
            const result = classifier.classify({
                tags: ['tokenized-assets'],
                name: 'ETF Fund Token',
                symbol: 'TOKEN',
                slug: 'etf-fund'
            });

            expect(result.peggedAsset).toBe('ETF');
        });

        test('should detect treasury by name patterns', () => {
            const result = classifier.classify({
                tags: ['tokenized-assets'],
                name: 'Treasury Bill Token',
                symbol: 'TOKEN',
                slug: 'treasury-bill'
            });

            expect(result.peggedAsset).toBe('Treasury Bills');
        });

        test('should detect stocks by name patterns', () => {
            const result = classifier.classify({
                tags: ['tokenized-assets'],
                name: 'Stock Token',
                symbol: 'TOKEN',
                slug: 'stock-token'
            });

            expect(result.peggedAsset).toBe('Stocks');
        });

        test('should detect real estate by name patterns', () => {
            const testCases = [
                { name: 'Real Estate Token' },
                { name: 'Real-Estate Fund' },
                { slug: 'real-estate-token' },
                { slug: 'estate-fund' }
            ];

            testCases.forEach(({ name = '', slug = '' }) => {
                const result = classifier.classify({
                    tags: ['tokenized-assets'],
                    name,
                    symbol: 'TOKEN',
                    slug
                });
                expect(result.peggedAsset).toBe('Real Estate');
            });
        });
    });

    describe('Asset-Backed Stablecoins', () => {
        test('should classify asset-backed stablecoins', () => {
            const result = classifier.classify({
                tags: ['asset-backed-stablecoin'],
                name: 'Gold Backed Stablecoin',
                symbol: 'GOLD',
                slug: 'gold-stable'
            });

            expect(result.assetCategory).toBe('Other'); // asset-backed-stablecoin tag doesn't trigger stablecoin category
            expect(result.peggedAsset).toBe('Gold'); // but pattern matching should work
        });
    });

    describe('Priority and Fallback Logic', () => {
        test('should prioritize specific tags over generic patterns', () => {
            const result = classifier.classify({
                tags: ['tokenized-silver'],
                name: 'Gold Token', // name suggests gold
                symbol: 'GOLD',
                slug: 'gold-token'
            });

            expect(result.peggedAsset).toBe('Silver'); // tag takes priority
        });

        test('should fall back to generic tokenized asset when no patterns match', () => {
            const result = classifier.classify({
                tags: ['tokenized-assets'],
                name: 'Unknown Asset',
                symbol: 'UNK',
                slug: 'unknown'
            });

            expect(result.assetCategory).toBe('Tokenized Asset');
            expect(result.peggedAsset).toBe('Tokenized Asset');
        });

        test('should handle conflicting tags gracefully', () => {
            const result = classifier.classify({
                tags: ['stablecoin', 'tokenized-assets'],
                name: 'Conflicted Token',
                symbol: 'CONF',
                slug: 'conflicted'
            });

            // Stablecoin should take priority (first check)
            expect(result.assetCategory).toBe('Stablecoin');
        });
    });

    describe('Edge Cases and Error Handling', () => {
        test('should handle missing or null inputs', () => {
            const testCases = [
                {},
                { tags: null },
                { name: null },
                { symbol: null },
                { slug: null },
                { tags: undefined, name: undefined, symbol: undefined, slug: undefined }
            ];

            testCases.forEach(input => {
                const result = classifier.classify(input);
                expect(result.assetCategory).toBe('Other');
                expect(result.peggedAsset).toBeNull();
            });
        });

        test('should handle non-array tags', () => {
            const result = classifier.classify({
                tags: 'stablecoin', // string instead of array
                name: 'Token',
                symbol: 'TOKEN',
                slug: 'token'
            });

            expect(result.assetCategory).toBe('Other');
        });

        test('should handle non-string name/symbol/slug', () => {
            const result = classifier.classify({
                tags: ['tokenized-assets'],
                name: 123,
                symbol: true,
                slug: {}
            });

            expect(result.assetCategory).toBe('Tokenized Asset');
            expect(result.peggedAsset).toBe('Tokenized Asset');
        });
    });

    describe('Configuration and Environment Variables', () => {
        test('should respect ASSET_CLASSIFICATION_ENABLED environment variable', () => {
            process.env.ASSET_CLASSIFICATION_ENABLED = 'false';
            expect(classifier.isEnabled()).toBe(false);

            process.env.ASSET_CLASSIFICATION_ENABLED = 'true';
            expect(classifier.isEnabled()).toBe(true);

            delete process.env.ASSET_CLASSIFICATION_ENABLED;
            expect(classifier.isEnabled()).toBe(true); // default
        });

        test('should provide configuration summary', () => {
            const summary = classifier.getConfigSummary();
            
            expect(summary).toHaveProperty('enabled');
            expect(summary).toHaveProperty('stablecoinTagCount');
            expect(summary).toHaveProperty('tokenizedAssetTagCount');
            expect(summary).toHaveProperty('tokenizedSubtypeCount');
            expect(summary).toHaveProperty('assetBackedTagCount');
            
            expect(typeof summary.stablecoinTagCount).toBe('number');
            expect(summary.stablecoinTagCount).toBeGreaterThan(0);
        });
    });

    describe('Performance Tests', () => {
        test('should handle large datasets efficiently', () => {
            const startTime = Date.now();
            const iterations = 1000;
            
            for (let i = 0; i < iterations; i++) {
                classifier.classify({
                    tags: ['tokenized-assets'],
                    name: `Test Token ${i}`,
                    symbol: `TEST${i}`,
                    slug: `test-token-${i}`
                });
            }
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            // Should complete 1000 classifications in under 100ms
            expect(duration).toBeLessThan(100);
        });

        test('should have consistent performance across different input sizes', () => {
            const testCases = [
                { tags: ['stablecoin'] },
                { tags: ['stablecoin', 'tokenized-assets', 'other-tag'] },
                { tags: Array(10).fill().map((_, i) => `tag-${i}`) },
                { tags: Array(100).fill().map((_, i) => `tag-${i}`) }
            ];

            testCases.forEach(testCase => {
                const startTime = Date.now();
                
                for (let i = 0; i < 100; i++) {
                    classifier.classify({
                        ...testCase,
                        name: `Test ${i}`,
                        symbol: `TEST${i}`,
                        slug: `test-${i}`
                    });
                }
                
                const endTime = Date.now();
                const duration = endTime - startTime;
                
                // Should be consistently fast regardless of tag count
                expect(duration).toBeLessThan(50);
            });
        });
    });
});