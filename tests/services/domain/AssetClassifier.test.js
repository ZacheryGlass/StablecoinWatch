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
                currencyAliases: {
                    'XAU': 'Gold',
                    'XAG': 'Silver',
                    'XAUT': 'Gold',
                    'PAXG': 'Gold',
                    'USDT': 'USD',
                    'USDC': 'USD',
                    'EURC': 'EUR',
                    'EURS': 'EUR'
                },
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
            const result = classifier.classify({ asset: {
                tags: ['stablecoin'],
                name: 'USD Coin',
                symbol: 'USDC',
                slug: 'usd-coin'
            }});

            expect(result.assetCategory).toBe('Stablecoin');
            // Enhanced detection now correctly identifies USD from symbol 'USDC'
            expect(result.peggedAsset).toBe('USD');
        });

        test('should handle case-insensitive tags', () => {
            const result = classifier.classify({ asset: {
                tags: ['STABLECOIN', 'StAbLeCoin'],
                name: 'Tether',
                symbol: 'USDT',
                slug: 'tether'
            }});

            expect(result.assetCategory).toBe('Stablecoin');
        });

        test('should handle empty or invalid tags', () => {
            const result1 = classifier.classify({ asset: {
                tags: [],
                name: 'Some Token',
                symbol: 'TOKEN',
                slug: 'some-token'
            }});

            const result2 = classifier.classify({ asset: {
                tags: null,
                name: 'Another Token',
                symbol: 'ANOTHER',
                slug: 'another-token'
            }});

            expect(result1.assetCategory).toBe('Other');
            expect(result2.assetCategory).toBe('Other');
        });
    });

    describe('Tokenized Asset Classification', () => {
        test('should classify tokenized assets by tag', () => {
            const result = classifier.classify({ asset: {
                tags: ['tokenized-assets'],
                name: 'Some Tokenized Asset',
                symbol: 'RWA',
                slug: 'rwa-token'
            }});

            expect(result.assetCategory).toBe('Tokenized Asset');
            expect(result.peggedAsset).toBe('Tokenized Asset');
        });

        test('should classify specific tokenized gold by tag', () => {
            const result = classifier.classify({ asset: {
                tags: ['tokenized-gold'],
                name: 'PAX Gold',
                symbol: 'PAXG',
                slug: 'pax-gold'
            }});

            expect(result.assetCategory).toBe('Tokenized Asset');
            expect(result.peggedAsset).toBe('Gold');
        });

        test('should classify specific tokenized silver by tag', () => {
            const result = classifier.classify({ asset: {
                tags: ['tokenized-silver'],
                name: 'Silver Token',
                symbol: 'SLVR',
                slug: 'silver-token'
            }});

            expect(result.assetCategory).toBe('Tokenized Asset');
            expect(result.peggedAsset).toBe('Silver');
        });

        test('should classify ETF by tag', () => {
            const result = classifier.classify({ asset: {
                tags: ['tokenized-etfs'],
                name: 'ETF Token',
                symbol: 'ETF',
                slug: 'etf-token'
            }});

            expect(result.assetCategory).toBe('Tokenized Asset');
            expect(result.peggedAsset).toBe('ETF');
        });

        test('should classify stocks by tag', () => {
            const result = classifier.classify({ asset: {
                tags: ['tokenized-stock'],
                name: 'Apple Stock Token',
                symbol: 'AAPL',
                slug: 'apple-stock'
            }});

            expect(result.assetCategory).toBe('Tokenized Asset');
            expect(result.peggedAsset).toBe('Stocks');
        });

        test('should classify real estate by tag', () => {
            const result = classifier.classify({ asset: {
                tags: ['tokenized-real-estate'],
                name: 'Real Estate Token',
                symbol: 'RET',
                slug: 'real-estate-token'
            }});

            expect(result.assetCategory).toBe('Tokenized Asset');
            expect(result.peggedAsset).toBe('Real Estate');
        });

        test('should classify treasury bills by tag', () => {
            const result = classifier.classify({ asset: {
                tags: ['tokenized-treasury-bills'],
                name: 'Treasury Token',
                symbol: 'TBILL',
                slug: 'treasury-token'
            }});

            expect(result.assetCategory).toBe('Tokenized Asset');
            expect(result.peggedAsset).toBe('Treasury Bills');
        });

        test('should classify commodities by tag', () => {
            const result = classifier.classify({ asset: {
                tags: ['tokenized-commodities'],
                name: 'Commodity Token',
                symbol: 'COMD',
                slug: 'commodity-token'
            }});

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
                const result = classifier.classify({ asset: {
                    tags: ['tokenized-assets'],
                    name: 'Token',
                    symbol,
                    slug: 'token'
                }});
                expect(result.peggedAsset).toBe(expected);
            });
        });

        test('should detect silver by symbol patterns', () => {
            const result = classifier.classify({ asset: {
                tags: ['tokenized-assets'],
                name: 'Silver Token',
                symbol: 'XAG',
                slug: 'silver'
            }});

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
                const result = classifier.classify({ asset: {
                    tags: ['tokenized-assets'],
                    name,
                    symbol: 'TOKEN',
                    slug
                }});
                expect(result.peggedAsset).toBe(expected);
            });
        });

        test('should detect silver by name patterns', () => {
            const result = classifier.classify({ asset: {
                tags: ['tokenized-assets'],
                name: 'Silver Backed Token',
                symbol: 'TOKEN',
                slug: 'silver-token'
            }});

            expect(result.peggedAsset).toBe('Silver');
        });

        test('should detect ETF by name patterns', () => {
            const result = classifier.classify({ asset: {
                tags: ['tokenized-assets'],
                name: 'ETF Fund Token',
                symbol: 'TOKEN',
                slug: 'etf-fund'
            }});

            expect(result.peggedAsset).toBe('ETF');
        });

        test('should detect treasury by name patterns', () => {
            const result = classifier.classify({ asset: {
                tags: ['tokenized-assets'],
                name: 'Treasury Bill Token',
                symbol: 'TOKEN',
                slug: 'treasury-bill'
            }});

            expect(result.peggedAsset).toBe('Treasury Bills');
        });

        test('should detect stocks by name patterns', () => {
            const result = classifier.classify({ asset: {
                tags: ['tokenized-assets'],
                name: 'Stock Token',
                symbol: 'TOKEN',
                slug: 'stock-token'
            }});

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
                const result = classifier.classify({ asset: {
                    tags: ['tokenized-assets'],
                    name,
                    symbol: 'TOKEN',
                    slug
                }});
                expect(result.peggedAsset).toBe('Real Estate');
            });
        });
    });

    describe('Asset-Backed Stablecoins', () => {
        test('should classify asset-backed stablecoins', () => {
            const result = classifier.classify({ asset: {
                tags: ['asset-backed-stablecoin'],
                name: 'Gold Backed Stablecoin',
                symbol: 'GOLD',
                slug: 'gold-stable'
            }});

            expect(result.assetCategory).toBe('Other'); // asset-backed-stablecoin tag doesn't trigger stablecoin category
            expect(result.peggedAsset).toBe('Gold'); // but pattern matching should work
        });
    });

    describe('Priority and Fallback Logic', () => {
        test('should prioritize specific tags over generic patterns', () => {
            const result = classifier.classify({ asset: {
                tags: ['tokenized-silver'],
                name: 'Gold Token', // name suggests gold
                symbol: 'GOLD',
                slug: 'gold-token'
            }});

            expect(result.peggedAsset).toBe('Silver'); // tag takes priority
        });

        test('should fall back to generic tokenized asset when no patterns match', () => {
            const result = classifier.classify({ asset: {
                tags: ['tokenized-assets'],
                name: 'Unknown Asset',
                symbol: 'UNK',
                slug: 'unknown'
            }});

            expect(result.assetCategory).toBe('Tokenized Asset');
            expect(result.peggedAsset).toBe('Tokenized Asset');
        });

        test('should handle conflicting tags gracefully', () => {
            const result = classifier.classify({ asset: {
                tags: ['stablecoin', 'tokenized-assets'],
                name: 'Conflicted Token',
                symbol: 'CONF',
                slug: 'conflicted'
            }});

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
                const result = classifier.classify({ asset: input });
                expect(result.assetCategory).toBe('Other');
                expect(result.peggedAsset).toBeNull();
            });
        });

        test('should handle non-array tags', () => {
            const result = classifier.classify({ asset: {
                tags: 'stablecoin', // string instead of array
                name: 'Token',
                symbol: 'TOKEN',
                slug: 'token'
            }});

            expect(result.assetCategory).toBe('Other');
        });

        test('should handle non-string name/symbol/slug', () => {
            const result = classifier.classify({ asset: {
                tags: ['tokenized-assets'],
                name: 123,
                symbol: true,
                slug: {}
            }});

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
                classifier.classify({ asset: {
                    tags: ['tokenized-assets'],
                    name: `Test Token ${i}`,
                    symbol: `TEST${i}`,
                    slug: `test-token-${i}`
                }});
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
                    classifier.classify({ asset: {
                        ...testCase,
                        name: `Test ${i}`,
                        symbol: `TEST${i}`,
                        slug: `test-${i}`
                    }});
                }
                
                const endTime = Date.now();
                const duration = endTime - startTime;
                
                // Should be consistently fast regardless of tag count
                expect(duration).toBeLessThan(50);
            });
        });
    });

    describe('Enhanced Currency Detection', () => {
        describe('ISO 4217 Currency Code Detection', () => {
            test('should detect major currency codes from tags', () => {
                const testCases = [
                    { tags: ['usd-stablecoin'], expected: 'USD' },
                    { tags: ['eur-stablecoin'], expected: 'EUR' },
                    { tags: ['gbp-stablecoin'], expected: 'GBP' },
                    { tags: ['jpy-stablecoin'], expected: 'JPY' },
                    { tags: ['cny-stablecoin'], expected: 'CNY' },
                    { tags: ['inr-stablecoin'], expected: 'INR' },
                    { tags: ['brl-stablecoin'], expected: 'BRL' },
                    { tags: ['krw-stablecoin'], expected: 'KRW' },
                    { tags: ['zar-stablecoin'], expected: 'ZAR' },
                    { tags: ['rub-stablecoin'], expected: 'RUB' }
                ];

                testCases.forEach(({ tags, expected }) => {
                    const result = classifier.classify({ asset: {
                        tags,
                        name: `${expected} Token`,
                        symbol: `${expected}T`,
                        slug: `${expected.toLowerCase()}-token`
                    }});
                    expect(result.assetCategory).toBe('Stablecoin');
                    expect(result.peggedAsset).toBe(expected);
                });
            });

            test('should detect currency codes from peggedXXX tags', () => {
                const testCases = [
                    { tags: ['peggedUSD'], expected: 'USD' },
                    { tags: ['peggedEUR'], expected: 'EUR' },
                    { tags: ['peggedGBP'], expected: 'GBP' },
                    { tags: ['peggedCAD'], expected: 'CAD' },
                    { tags: ['peggedAUD'], expected: 'AUD' },
                    { tags: ['peggedCHF'], expected: 'CHF' },
                    { tags: ['peggedSEK'], expected: 'SEK' },
                    { tags: ['peggedNOK'], expected: 'NOK' }
                ];

                testCases.forEach(({ tags, expected }) => {
                    const result = classifier.classify({ asset: {
                        tags,
                        name: `Pegged ${expected} Token`,
                        symbol: `P${expected}`,
                        slug: `pegged-${expected.toLowerCase()}`
                    }});
                    expect(result.assetCategory).toBe('Stablecoin');
                    expect(result.peggedAsset).toBe(expected);
                });
            });

            test('should handle rare and exotic currency codes', () => {
                const testCases = [
                    { tags: ['zwd-stablecoin'], expected: 'ZWD' }, // Zimbabwean Dollar (your example)
                    { tags: ['ves-stablecoin'], expected: 'VES' }, // Venezuelan Bolívar
                    { tags: ['sos-stablecoin'], expected: 'SOS' }, // Somali Shilling
                    { tags: ['mmk-stablecoin'], expected: 'MMK' }, // Myanmar Kyat
                    { tags: ['lak-stablecoin'], expected: 'LAK' }, // Lao Kip
                    { tags: ['npr-stablecoin'], expected: 'NPR' }, // Nepalese Rupee
                    { tags: ['afn-stablecoin'], expected: 'AFN' }, // Afghan Afghani
                    { tags: ['xof-stablecoin'], expected: 'XOF' }, // West African CFA Franc
                    { tags: ['xaf-stablecoin'], expected: 'XAF' }  // Central African CFA Franc
                ];

                testCases.forEach(({ tags, expected }) => {
                    const result = classifier.classify({ asset: {
                        tags,
                        name: `${expected} Stablecoin`,
                        symbol: `${expected}S`,
                        slug: `${expected.toLowerCase()}-stable`
                    }});
                    expect(result.assetCategory).toBe('Stablecoin');
                    expect(result.peggedAsset).toBe(expected);
                });
            });
        });

        describe('Symbol-based Currency Detection', () => {
            test('should detect currencies from symbol patterns', () => {
                const testCases = [
                    // Common stablecoin symbol patterns
                    { symbol: 'USDt', expected: 'USD' },
                    { symbol: 'USDC', expected: 'USD' },
                    { symbol: 'EURt', expected: 'EUR' },
                    { symbol: 'EURC', expected: 'EUR' },
                    { symbol: 'GBPt', expected: 'GBP' },
                    { symbol: 'CADc', expected: 'CAD' },
                    { symbol: 'AUDx', expected: 'AUD' },
                    { symbol: 'JPYc', expected: 'JPY' },
                    { symbol: 'INRt', expected: 'INR' },
                    { symbol: 'BRLt', expected: 'BRL' },
                    { symbol: 'KRWt', expected: 'KRW' },
                    
                    // Symbol with token/coin suffixes
                    { symbol: 'USD-TOKEN', expected: 'USD' },
                    { symbol: 'EUR_COIN', expected: 'EUR' },
                    { symbol: 'GBP-STABLE', expected: 'GBP' },
                    
                    // Exotic currencies
                    { symbol: 'ZWDt', expected: 'ZWD' },
                    { symbol: 'VESc', expected: 'VES' },
                    { symbol: 'MMKtoken', expected: 'MMK' }
                ];

                testCases.forEach(({ symbol, expected }) => {
                    const result = classifier.classify({ asset: {
                        tags: ['stablecoin'],
                        name: `${expected} Token`,
                        symbol,
                        slug: `${expected.toLowerCase()}-token`
                    }});
                    expect(result.assetCategory).toBe('Stablecoin');
                    expect(result.peggedAsset).toBe(expected);
                });
            });

            test('should detect currencies when no explicit currency tags provided', () => {
                const testCases = [
                    { symbol: 'USDt', name: 'Dollar Token', expected: 'USD' },
                    { symbol: 'EURt', name: 'Euro Token', expected: 'EUR' },
                    { symbol: 'GBPt', name: 'Pound Token', expected: 'GBP' },
                    { symbol: 'ZWD', name: 'Zimbabwe Token', expected: 'ZWD' },
                    { symbol: 'VESt', name: 'Venezuelan Token', expected: 'VES' }
                ];

                testCases.forEach(({ symbol, name, expected }) => {
                    const result = classifier.classify({ asset: {
                        tags: ['stablecoin'], // Only generic stablecoin tag
                        name,
                        symbol,
                        slug: name.toLowerCase().replace(' ', '-')
                    }});
                    expect(result.assetCategory).toBe('Stablecoin');
                    expect(result.peggedAsset).toBe(expected);
                });
            });
        });

        describe('Name-based Currency Detection', () => {
            test('should detect currencies from common currency names', () => {
                const testCases = [
                    { name: 'Dollar Stablecoin', expected: 'USD' },
                    { name: 'Euro Digital Currency', expected: 'EUR' },
                    { name: 'British Pound Token', expected: 'GBP' },
                    { name: 'Japanese Yen Coin', expected: 'JPY' },
                    { name: 'Chinese Yuan Stable', expected: 'CNY' },
                    { name: 'Swiss Franc Token', expected: 'CHF' },
                    { name: 'Indian Rupee Digital', expected: 'INR' },
                    { name: 'Brazilian Real Token', expected: 'BRL' },
                    { name: 'Korean Won Coin', expected: 'KRW' },
                    { name: 'South African Rand Token', expected: 'ZAR' },
                    { name: 'Russian Ruble Stable', expected: 'RUB' },
                    { name: 'Turkish Lira Token', expected: 'TRY' },
                    { name: 'Mexican Peso Coin', expected: 'MXN' }
                ];

                testCases.forEach(({ name, expected }) => {
                    const result = classifier.classify({ asset: {
                        tags: ['stablecoin'],
                        name,
                        symbol: 'TOKEN',
                        slug: name.toLowerCase().replace(/\\s+/g, '-')
                    }});
                    expect(result.assetCategory).toBe('Stablecoin');
                    expect(result.peggedAsset).toBe(expected);
                });
            });

            test('should detect embedded currency codes in names', () => {
                const testCases = [
                    { name: 'ZWD Backed Stablecoin', expected: 'ZWD' },
                    { name: 'VES Digital Token', expected: 'VES' },
                    { name: 'MMK Stable Currency', expected: 'MMK' },
                    { name: 'LAK Pegged Token', expected: 'LAK' },
                    { name: 'NPR Digital Money', expected: 'NPR' }
                ];

                testCases.forEach(({ name, expected }) => {
                    const result = classifier.classify({ asset: {
                        tags: ['stablecoin'],
                        name,
                        symbol: 'TOKEN',
                        slug: name.toLowerCase().replace(/\\s+/g, '-')
                    }});
                    expect(result.assetCategory).toBe('Stablecoin');
                    expect(result.peggedAsset).toBe(expected);
                });
            });
        });

        describe('Currency Alias System', () => {
            test('should apply currency aliases from configuration', () => {
                const testCases = [
                    { tags: ['peggedXAU'], expected: 'Gold' },
                    { tags: ['peggedXAG'], expected: 'Silver' },
                    { tags: ['peggedPAXG'], expected: 'Gold' },
                    { tags: ['peggedXAUT'], expected: 'Gold' },
                    { symbol: 'USDT', expected: 'USD' },
                    { symbol: 'USDC', expected: 'USD' },
                    { symbol: 'EURC', expected: 'EUR' },
                    { symbol: 'EURS', expected: 'EUR' }
                ];

                testCases.forEach(({ tags = ['stablecoin'], symbol = 'TOKEN', expected }, index) => {
                    const result = classifier.classify({ asset: {
                        tags,
                        name: 'Test Token',
                        symbol,
                        slug: 'test-token'
                    }});
                    
                    if (result.peggedAsset !== expected) {
                        console.log(`Test case ${index} failed:`, { tags, symbol, expected, actual: result.peggedAsset });
                    }
                    
                    expect(result.assetCategory).toBe('Stablecoin');
                    expect(result.peggedAsset).toBe(expected);
                });
            });
        });

        describe('Environment Variable Currency Support', () => {
            test('should support custom currencies from environment variables', () => {
                // Simulate environment variable for custom currencies
                process.env.CUSTOM_CURRENCIES = 'ZWD:Zimbabwean Dollar,ABC:Test Currency';
                
                // Create a new classifier to load the environment variables
                const envClassifier = new AssetClassifier(defaultConfig);
                
                const testCases = [
                    { tags: ['zwd-stablecoin'], expected: 'Zimbabwean Dollar' },
                    { tags: ['abc-stablecoin'], expected: 'Test Currency' },
                    { symbol: 'ZWDt', expected: 'Zimbabwean Dollar' },
                    { symbol: 'ABCt', expected: 'Test Currency' }
                ];

                testCases.forEach(({ tags = ['stablecoin'], symbol = 'TOKEN', expected }) => {
                    const result = envClassifier.classify({ asset: {
                        tags,
                        name: 'Test Token',
                        symbol,
                        slug: 'test-token'
                    }});
                    expect(result.assetCategory).toBe('Stablecoin');
                    expect(result.peggedAsset).toBe(expected);
                });

                // Clean up
                delete process.env.CUSTOM_CURRENCIES;
            });

            test('should handle malformed CUSTOM_CURRENCIES environment variable', () => {
                process.env.CUSTOM_CURRENCIES = 'INVALID_FORMAT';
                
                // Should not throw error and should create classifier normally
                expect(() => {
                    new AssetClassifier(defaultConfig);
                }).not.toThrow();

                delete process.env.CUSTOM_CURRENCIES;
            });
        });

        describe('Enhanced Configuration Summary', () => {
            test('should include currency detection metrics in configuration summary', () => {
                const summary = classifier.getConfigSummary();
                
                expect(summary).toHaveProperty('supportedCurrencyCount');
                expect(summary).toHaveProperty('currencyNamePatternCount');
                expect(summary).toHaveProperty('currencySymbolPatternCount');
                
                expect(typeof summary.supportedCurrencyCount).toBe('number');
                expect(summary.supportedCurrencyCount).toBeGreaterThan(80); // Should support 80+ currencies
                
                expect(typeof summary.currencyNamePatternCount).toBe('number');
                expect(summary.currencyNamePatternCount).toBeGreaterThan(10); // Should have 10+ name patterns
                
                expect(typeof summary.currencySymbolPatternCount).toBe('number');
                expect(summary.currencySymbolPatternCount).toBeGreaterThan(80); // Should have 80+ symbol patterns
            });
        });

        describe('Public API Methods', () => {
            test('should provide getSupportedCurrencies method', () => {
                const currencies = classifier.getSupportedCurrencies();
                
                expect(Array.isArray(currencies)).toBe(true);
                expect(currencies.length).toBeGreaterThan(80);
                expect(currencies).toContain('USD');
                expect(currencies).toContain('EUR');
                expect(currencies).toContain('ZWD'); // Example exotic currency
                expect(currencies).toContain('VES'); // Example exotic currency
                
                // Should be sorted
                expect(currencies).toEqual([...currencies].sort());
            });

            test('should provide addCurrencyPatterns method', () => {
                // Test adding a custom currency pattern
                classifier.addCurrencyPatterns('TEST', {
                    symbol: /^test[tc]?\b/i,
                    name: /\btest\s+currency\b/i
                });

                const result = classifier.classify({ asset: {
                    tags: ['stablecoin'],
                    name: 'Test Currency Token',
                    symbol: 'TESTt',
                    slug: 'test-currency'
                }});

                expect(result.assetCategory).toBe('Stablecoin');
                expect(result.peggedAsset).toBe('TEST');
            });
        });

        describe('Backward Compatibility', () => {
            test('should maintain compatibility with existing USD detection', () => {
                const testCases = [
                    { symbol: 'USDT', name: 'Tether USD', expected: 'USD' },
                    { symbol: 'USDC', name: 'USD Coin', expected: 'USD' },
                    { name: 'Dollar Token', symbol: 'DOL', expected: 'USD' }
                ];

                testCases.forEach(({ symbol, name, expected }) => {
                    const result = classifier.classify({ asset: {
                        tags: ['stablecoin'],
                        name,
                        symbol,
                        slug: name.toLowerCase().replace(' ', '-')
                    }});
                    expect(result.assetCategory).toBe('Stablecoin');
                    expect(result.peggedAsset).toBe(expected);
                });
            });

            test('should maintain compatibility with existing EUR detection', () => {
                const testCases = [
                    { symbol: 'EURt', name: 'Euro Token', expected: 'EUR' },
                    { symbol: 'EURC', name: 'Euro Coin', expected: 'EUR' },
                    { name: 'Euro Digital Currency', symbol: 'EDC', expected: 'EUR' }
                ];

                testCases.forEach(({ symbol, name, expected }) => {
                    const result = classifier.classify({ asset: {
                        tags: ['stablecoin'],
                        name,
                        symbol,
                        slug: name.toLowerCase().replace(' ', '-')
                    }});
                    expect(result.assetCategory).toBe('Stablecoin');
                    expect(result.peggedAsset).toBe(expected);
                });
            });
        });
    });
});
