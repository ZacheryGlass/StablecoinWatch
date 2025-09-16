/**
 * Complex Symbol Patterns Test Suite for AssetClassifier
 * 
 * Tests for unusual, complex, and edge-case symbol patterns found in real-world
 * stablecoin data. Based on actual symbols from production APIs.
 */
const AssetClassifier = require('../../../services/domain/AssetClassifier');
const ApiConfig = require('../../../config/ApiConfig');

describe('AssetClassifier - Complex Symbol Patterns', () => {
    let classifier;

    beforeEach(() => {
        classifier = new AssetClassifier(ApiConfig.getAssetClassificationConfig());
    });

    describe('Multi-Character Currency Prefixes and Suffixes', () => {
        test('should detect currency from symbols with multiple character extensions', () => {
            const multiCharExtensions = [
                { symbol: 'USDe', name: 'Ethena USDe', expected: 'USD' },
                { symbol: 'USDD', name: 'USDD Stablecoin', expected: 'USD' },
                { symbol: 'USDf', name: 'Falcon USD', expected: 'USD' },
                { symbol: 'USDY', name: 'Ondo US Dollar Yield', expected: 'USD' },
                { symbol: 'USD0', name: 'Usual USD', expected: 'USD' },
                { symbol: 'USD1', name: 'World Liberty Financial USD', expected: 'USD' },
                { symbol: 'USDG', name: 'Global Dollar', expected: 'USD' },
                { symbol: 'USDN', name: 'Noble Dollar', expected: 'USD' },
                { symbol: 'USDL', name: 'Lift Dollar', expected: 'USD' },
                { symbol: 'USDB', name: 'USDB', expected: 'USD' },
                { symbol: 'EURt', name: 'Tether EURt', expected: 'EUR' },
                { symbol: 'EURC', name: 'EURC', expected: 'EUR' },
                { symbol: 'EURS', name: 'STASIS EURO', expected: 'EUR' },
                { symbol: 'EURI', name: 'Eurite', expected: 'EUR' },
                { symbol: 'EURR', name: 'StablR Euro', expected: 'EUR' },
                { symbol: 'EURA', name: 'EURA', expected: 'EUR' }
            ];

            multiCharExtensions.forEach(({ symbol, name, expected }) => {
                const result = classifier.classify({ asset: {
                    symbol,
                    name,
                    tags: ['stablecoin'],
                    slug: name.toLowerCase().replace(/\s+/g, '-')
                }});
                expect(result.assetCategory).toBe('Stablecoin');
                expect(result.peggedAsset).toBe(expected);
            });
        });
    });

    describe('Symbols with Embedded Words and Descriptors', () => {
        test('should handle symbols with embedded descriptive text', () => {
            const embeddedWordSymbols = [
                { symbol: 'lisUSD', name: 'lisUSD', expected: 'USD' },
                { symbol: 'deUSD', name: 'Elixir deUSD', expected: 'USD' },
                { symbol: 'FRXUSD', name: 'Frax USD', expected: 'USD' },
                { symbol: 'AUSD', name: 'AUSD', expected: 'USD' },
                { symbol: 'YUSD', name: 'Aegis YUSD', expected: 'USD' },
                { symbol: 'ZUSD', name: 'ZUSD', expected: 'USD' },
                { symbol: 'DUSD', name: 'DeFiDollar', expected: 'USD' },
                { symbol: 'LUSD', name: 'Liquity USD', expected: 'USD' },
                { symbol: 'SUSD', name: 'Synthetix USD', expected: 'USD' },
                { symbol: 'CUSD', name: 'Celo Dollar', expected: 'USD' },
                { symbol: 'GUSD', name: 'Gemini Dollar', expected: 'USD' }
            ];

            embeddedWordSymbols.forEach(({ symbol, name, expected }) => {
                const result = classifier.classify({ asset: {
                    symbol,
                    name,
                    tags: ['stablecoin'],
                    slug: name.toLowerCase().replace(/\s+/g, '-')
                }});
                expect(result.assetCategory).toBe('Stablecoin');
                expect(result.peggedAsset).toBe(expected);
            });
        });
    });

    describe('Prefixed Symbols (Non-Currency Prefixes)', () => {
        test('should handle symbols with non-currency prefixes', () => {
            const prefixedSymbols = [
                { symbol: 'vBUSD', name: 'Venus BUSD', expected: 'USD' },
                { symbol: 'yvUSDC', name: 'Yearn Vault USDC', expected: 'USD' },
                { symbol: 'aUSDT', name: 'Aave USDT', expected: 'USD' },
                { symbol: 'cUSDC', name: 'Compound USDC', expected: 'USD' },
                { symbol: 'xUSD', name: 'Wrapped USD', expected: 'USD' },
                { symbol: 'wUSDC', name: 'Wrapped USDC', expected: 'USD' },
                { symbol: 'iUSD', name: 'Interest Bearing USD', expected: 'USD' },
                { symbol: 'sUSD', name: 'Synthetix USD', expected: 'USD' },
                { symbol: 'yUSD', name: 'Yearn USD', expected: 'USD' },
                { symbol: 'bUSD', name: 'Bancor USD', expected: 'USD' }
            ];

            prefixedSymbols.forEach(({ symbol, name, expected }) => {
                const result = classifier.classify({ asset: {
                    symbol,
                    name,
                    tags: ['stablecoin'],
                    slug: name.toLowerCase().replace(/\s+/g, '-')
                }});
                expect(result.assetCategory).toBe('Stablecoin');
                expect(result.peggedAsset).toBe(expected);
            });
        });
    });

    describe('Mixed Case and Special Character Symbols', () => {
        test('should handle symbols with mixed casing', () => {
            const mixedCaseSymbols = [
                { symbol: 'UsdC', name: 'USD Coin Mixed', expected: 'USD' },
                { symbol: 'uSDT', name: 'Tether Mixed', expected: 'USD' },
                { symbol: 'EuRt', name: 'Euro Tether Mixed', expected: 'EUR' },
                { symbol: 'eURC', name: 'Euro Coin Mixed', expected: 'EUR' },
                { symbol: 'UsD', name: 'Simple USD', expected: 'USD' },
                { symbol: 'eUr', name: 'Simple EUR', expected: 'EUR' }
            ];

            mixedCaseSymbols.forEach(({ symbol, name, expected }) => {
                const result = classifier.classify({ asset: {
                    symbol,
                    name,
                    tags: ['stablecoin'],
                    slug: name.toLowerCase().replace(/\s+/g, '-')
                }});
                expect(result.assetCategory).toBe('Stablecoin');
                expect(result.peggedAsset).toBe(expected);
            });
        });

        test('should handle symbols with special characters', () => {
            const specialCharSymbols = [
                { symbol: 'USD-T', name: 'USD Dash Token', expected: 'USD' },
                { symbol: 'USD_C', name: 'USD Underscore Coin', expected: 'USD' },
                { symbol: 'USD.e', name: 'USD Dot E', expected: 'USD' },
                { symbol: 'EUR-T', name: 'EUR Dash Token', expected: 'EUR' },
                { symbol: 'EUR_C', name: 'EUR Underscore Coin', expected: 'EUR' },
                { symbol: 'USD@', name: 'USD At Symbol', expected: 'USD' },
                { symbol: 'USD#', name: 'USD Hash Token', expected: 'USD' },
                { symbol: 'USD!', name: 'USD Exclamation', expected: 'USD' }
            ];

            specialCharSymbols.forEach(({ symbol, name, expected }) => {
                const result = classifier.classify({ asset: {
                    symbol,
                    name,
                    tags: ['stablecoin'],
                    slug: name.toLowerCase().replace(/\s+/g, '-')
                }});
                expect(result.assetCategory).toBe('Stablecoin');
                expect(result.peggedAsset).toBe(expected);
            });
        });
    });

    describe('Numbers in Symbols', () => {
        test('should handle symbols with embedded numbers', () => {
            const numberedSymbols = [
                { symbol: 'USD1', name: 'World Liberty Financial USD', expected: 'USD' },
                { symbol: 'USD0', name: 'Usual USD', expected: 'USD' },
                { symbol: 'USD2', name: 'USD Version 2', expected: 'USD' },
                { symbol: '2USD', name: 'Second USD', expected: 'USD' },
                { symbol: 'U2SD', name: 'USD 2.0', expected: 'USD' },
                { symbol: 'US2D', name: 'US Dollar 2', expected: 'USD' },
                { symbol: 'EUR1', name: 'Euro Version 1', expected: 'EUR' },
                { symbol: '1EUR', name: 'First Euro', expected: 'EUR' },
                { symbol: 'E1UR', name: 'Euro 1.0', expected: 'EUR' }
            ];

            numberedSymbols.forEach(({ symbol, name, expected }) => {
                const result = classifier.classify({ asset: {
                    symbol,
                    name,
                    tags: ['stablecoin'],
                    slug: name.toLowerCase().replace(/\s+/g, '-')
                }});
                expect(result.assetCategory).toBe('Stablecoin');
                expect(result.peggedAsset).toBe(expected);
            });
        });
    });

    describe('Extremely Long Symbols', () => {
        test('should handle very long symbol names', () => {
            const longSymbols = [
                { 
                    symbol: 'USDVERYLONGTOKEN',
                    name: 'USD Very Long Token Name',
                    expected: 'USD'
                },
                {
                    symbol: 'SUPERLONGEUROSTABLECOIN',
                    name: 'Super Long Euro Stablecoin',
                    expected: 'EUR'
                },
                {
                    symbol: 'USD-EXTREMELY-LONG-SYMBOL-WITH-DASHES',
                    name: 'Extremely Long USD Symbol',
                    expected: 'USD'
                }
            ];

            longSymbols.forEach(({ symbol, name, expected }) => {
                const result = classifier.classify({ asset: {
                    symbol,
                    name,
                    tags: ['stablecoin'],
                    slug: name.toLowerCase().replace(/\s+/g, '-')
                }});
                expect(result.assetCategory).toBe('Stablecoin');
                expect(result.peggedAsset).toBe(expected);
            });
        });
    });

    describe('Single Character and Very Short Symbols', () => {
        test('should handle very short symbols', () => {
            const shortSymbols = [
                { symbol: 'U', name: 'USD Coin Short', expected: null }, // Too ambiguous
                { symbol: 'E', name: 'EUR Coin Short', expected: null }, // Too ambiguous
                { symbol: 'US', name: 'US Dollar Short', expected: 'USD' },
                { symbol: 'EU', name: 'Euro Short', expected: 'EUR' },
                { symbol: '$', name: 'Dollar Symbol', expected: 'USD' },
                { symbol: '€', name: 'Euro Symbol', expected: 'EUR' },
                { symbol: '£', name: 'Pound Symbol', expected: 'GBP' },
                { symbol: '¥', name: 'Yen Symbol', expected: 'JPY' }
            ];

            shortSymbols.forEach(({ symbol, name, expected }) => {
                const result = classifier.classify({ asset: {
                    symbol,
                    name,
                    tags: ['stablecoin'],
                    slug: name.toLowerCase().replace(/\s+/g, '-')
                }});
                expect(result.assetCategory).toBe('Stablecoin');
                expect(result.peggedAsset).toBe(expected);
            });
        });
    });

    describe('Symbols with Repeated Characters', () => {
        test('should handle symbols with character repetition', () => {
            const repeatedCharSymbols = [
                { symbol: 'UUSD', name: 'Double U USD', expected: 'USD' },
                { symbol: 'USDD', name: 'USDD Stablecoin', expected: 'USD' },
                { symbol: 'EUUR', name: 'Double U EUR', expected: 'EUR' },
                { symbol: 'EURR', name: 'StablR Euro', expected: 'EUR' },
                { symbol: 'USSS', name: 'Triple S USD', expected: null }, // Too ambiguous
                { symbol: 'UUUU', name: 'Quad U Token', expected: null } // Too ambiguous
            ];

            repeatedCharSymbols.forEach(({ symbol, name, expected }) => {
                const result = classifier.classify({ asset: {
                    symbol,
                    name,
                    tags: ['stablecoin'],
                    slug: name.toLowerCase().replace(/\s+/g, '-')
                }});
                expect(result.assetCategory).toBe('Stablecoin');
                expect(result.peggedAsset).toBe(expected);
            });
        });
    });

    describe('Currency Codes in Non-Standard Positions', () => {
        test('should detect currency codes in middle of symbols', () => {
            const middlePositionSymbols = [
                { symbol: 'aUSDt', name: 'Advanced USD Token', expected: 'USD' },
                { symbol: 'xEURy', name: 'Cross EUR Yield', expected: 'EUR' },
                { symbol: 'bGBPc', name: 'British GBP Coin', expected: 'GBP' },
                { symbol: 'iJPYe', name: 'Interest JPY Enhanced', expected: 'JPY' },
                { symbol: 'sCHFr', name: 'Swiss CHF Reserve', expected: 'CHF' },
                { symbol: 'mCADx', name: 'Managed CAD Extended', expected: 'CAD' }
            ];

            middlePositionSymbols.forEach(({ symbol, name, expected }) => {
                const result = classifier.classify({ asset: {
                    symbol,
                    name,
                    tags: ['stablecoin'],
                    slug: name.toLowerCase().replace(/\s+/g, '-')
                }});
                expect(result.assetCategory).toBe('Stablecoin');
                expect(result.peggedAsset).toBe(expected);
            });
        });
    });

    describe('Ambiguous Symbols (Should Not Detect Currency)', () => {
        test('should not detect currency in genuinely ambiguous symbols', () => {
            const ambiguousSymbols = [
                { symbol: 'MNEE', name: 'MNEE', expected: null }, // Real CMC asset
                { symbol: 'TEST', name: 'Test Token', expected: null },
                { symbol: 'ABCD', name: 'Alphabet Token', expected: null },
                { symbol: 'WXYZ', name: 'Random Letters', expected: null },
                { symbol: '1234', name: 'Number Token', expected: null },
                { symbol: 'STABLE', name: 'Generic Stable', expected: null },
                { symbol: 'COIN', name: 'Generic Coin', expected: null },
                { symbol: 'TOKEN', name: 'Generic Token', expected: null }
            ];

            ambiguousSymbols.forEach(({ symbol, name, expected }) => {
                const result = classifier.classify({ asset: {
                    symbol,
                    name,
                    tags: ['stablecoin'],
                    slug: name.toLowerCase().replace(/\s+/g, '-')
                }});
                expect(result.assetCategory).toBe('Stablecoin');
                expect(result.peggedAsset).toBe(expected);
            });
        });
    });

    describe('Symbols with Platform/Chain Indicators', () => {
        test('should handle symbols with platform suffixes', () => {
            const platformSymbols = [
                { symbol: 'USDC.e', name: 'USDC Ethereum', expected: 'USD' },
                { symbol: 'USDT.sol', name: 'USDT Solana', expected: 'USD' },
                { symbol: 'USDC.poly', name: 'USDC Polygon', expected: 'USD' },
                { symbol: 'USDT.bsc', name: 'USDT BSC', expected: 'USD' },
                { symbol: 'EURC.arb', name: 'EURC Arbitrum', expected: 'EUR' },
                { symbol: 'USDC-eth', name: 'USDC Ethereum', expected: 'USD' },
                { symbol: 'USDT_tron', name: 'USDT Tron', expected: 'USD' }
            ];

            platformSymbols.forEach(({ symbol, name, expected }) => {
                const result = classifier.classify({ asset: {
                    symbol,
                    name,
                    tags: ['stablecoin'],
                    slug: name.toLowerCase().replace(/\s+/g, '-')
                }});
                expect(result.assetCategory).toBe('Stablecoin');
                expect(result.peggedAsset).toBe(expected);
            });
        });
    });

    describe('Unicode and International Character Symbols', () => {
        test('should handle symbols with unicode characters', () => {
            const unicodeSymbols = [
                { symbol: 'USD₮', name: 'USD Unicode Token', expected: 'USD' },
                { symbol: '€UR', name: 'Euro Unicode', expected: 'EUR' },
                { symbol: '£GBP', name: 'Pound Unicode', expected: 'GBP' },
                { symbol: '¥JPY', name: 'Yen Unicode', expected: 'JPY' },
                { symbol: 'USD✓', name: 'USD Checkmark', expected: 'USD' },
                { symbol: 'EUR★', name: 'EUR Star', expected: 'EUR' }
            ];

            unicodeSymbols.forEach(({ symbol, name, expected }) => {
                const result = classifier.classify({ asset: {
                    symbol,
                    name,
                    tags: ['stablecoin'],
                    slug: name.toLowerCase().replace(/\s+/g, '-')
                }});
                expect(result.assetCategory).toBe('Stablecoin');
                expect(result.peggedAsset).toBe(expected);
            });
        });
    });

    describe('Performance with Complex Symbols', () => {
        test('should efficiently process symbols with complex patterns', () => {
            const complexSymbols = Array.from({ length: 100 }, (_, i) => ({
                symbol: `COMPLEX-USD-TOKEN-${i}-WITH-DASHES-AND-NUMBERS`,
                name: `Complex USD Token ${i}`,
                tags: ['stablecoin'],
                slug: `complex-usd-token-${i}`
            }));

            const startTime = Date.now();
            const results = complexSymbols.map(asset => classifier.classify({ asset }));
            const endTime = Date.now();

            expect(results).toHaveLength(100);
            expect(results.every(r => r.assetCategory === 'Stablecoin')).toBe(true);
            expect(results.every(r => r.peggedAsset === 'USD')).toBe(true);
            expect(endTime - startTime).toBeLessThan(100); // Should be fast
        });
    });

    describe('Empty and Null Symbol Handling', () => {
        test('should handle missing or invalid symbols gracefully', () => {
            const invalidSymbols = [
                { symbol: '', name: 'Empty Symbol USD', tags: ['stablecoin'] },
                { symbol: null, name: 'Null Symbol USD', tags: ['stablecoin'] },
                { symbol: undefined, name: 'Undefined Symbol USD', tags: ['stablecoin'] },
                { symbol: '   ', name: 'Whitespace Symbol USD', tags: ['stablecoin'] },
                { symbol: '\t\n\r', name: 'Tab Newline Symbol USD', tags: ['stablecoin'] }
            ];

            invalidSymbols.forEach(asset => {
                expect(() => {
                    const result = classifier.classify({ asset });
                    expect(result).toHaveProperty('assetCategory');
                    expect(result).toHaveProperty('peggedAsset');
                }).not.toThrow();
            });
        });
    });
});
