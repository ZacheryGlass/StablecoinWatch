/**
 * Tag Conflict Resolution Test Suite for AssetClassifier
 * 
 * Tests for assets with conflicting, ambiguous, or contradictory tags that
 * require intelligent priority resolution. Based on real-world complex tagging.
 */
const AssetClassifier = require('../../../services/domain/AssetClassifier');
const ApiConfig = require('../../../config/ApiConfig');

describe('AssetClassifier - Tag Conflict Resolution', () => {
    let classifier;

    beforeEach(() => {
        classifier = new AssetClassifier(ApiConfig.getAssetClassificationConfig());
    });

    describe('Stablecoin vs Tokenized Asset Conflicts', () => {
        test('should prioritize stablecoin tags over tokenized asset tags', () => {
            const conflictingAsset = {
                name: "Gold Backed USD",
                symbol: "GBUSD",
                tags: [
                    "stablecoin",           // Primary classification
                    "tokenized-assets",     // Conflicting classification
                    "usd-stablecoin",
                    "tokenized-gold",       // Specific tokenized type
                    "asset-backed-stablecoin"
                ],
                slug: "gold-backed-usd"
            };

            const result = classifier.classify({ asset: conflictingAsset });
            // Should classify as stablecoin, not tokenized asset
            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('USD');
        });

        test('should handle assets that could be both stablecoin and tokenized asset', () => {
            const dualNatureAsset = {
                name: "Tokenized Treasury USD",
                symbol: "TTUSD",
                tags: [
                    "stablecoin",
                    "tokenized-treasury-bills",
                    "usd-stablecoin", 
                    "tokenized-assets",
                    "asset-backed-stablecoin",
                    "treasury",
                    "government-backed"
                ],
                slug: "tokenized-treasury-usd"
            };

            const result = classifier.classify({ asset: dualNatureAsset });
            // Stablecoin should take priority
            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('USD');
        });
    });

    describe('Multiple Currency Indication Conflicts', () => {
        test('should resolve conflicting currency tags with priority hierarchy', () => {
            const multiCurrencyTags = {
                name: "Multi Currency Stable",
                symbol: "MCS",
                tags: [
                    "stablecoin",
                    "usd-stablecoin",      // First specific currency tag
                    "eur-stablecoin",      // Conflicting currency tag
                    "gbp-stablecoin",      // Another conflicting currency tag
                    "multi-currency"
                ],
                slug: "multi-currency-stable"
            };

            const result = classifier.classify({ asset: multiCurrencyTags });
            expect(result.assetCategory).toBe('Stablecoin');
            // Should pick one currency (likely the first found)
            expect(['USD', 'EUR', 'GBP']).toContain(result.peggedAsset);
        });

        test('should prioritize pegType over conflicting tags', () => {
            const pegTypeVsTags = {
                name: "Conflicting Currency Asset",
                symbol: "CCA",
                tags: [
                    "stablecoin",
                    "eur-stablecoin"       // Tag says EUR
                ],
                pegType: "peggedUSD",      // DeFiLlama says USD
                slug: "conflicting-currency-asset"
            };

            const result = classifier.classify({ asset: pegTypeVsTags });
            expect(result.assetCategory).toBe('Stablecoin');
            // Should prioritize pegType
            expect(result.peggedAsset).toBe('USD');
        });

        test('should handle symbol vs tag currency conflicts', () => {
            const symbolVsTagConflict = {
                name: "European Dollar Token",
                symbol: "EURT",            // Symbol suggests EUR
                tags: [
                    "stablecoin",
                    "usd-stablecoin"       // Tag suggests USD
                ],
                slug: "european-dollar-token"
            };

            const result = classifier.classify({ asset: symbolVsTagConflict });
            expect(result.assetCategory).toBe('Stablecoin');
            // Should prioritize explicit tags over symbol inference
            expect(result.peggedAsset).toBe('USD');
        });
    });

    describe('Algorithmic vs Fiat-Backed vs Asset-Backed Conflicts', () => {
        test('should handle assets with multiple backing mechanism tags', () => {
            const multipleBacking = {
                name: "Hybrid Backed USD",
                symbol: "HBUSD",
                tags: [
                    "stablecoin",
                    "algorithmic-stablecoin",    // Algorithmic backing
                    "asset-backed-stablecoin",   // Asset backing
                    "fiat-stablecoin",          // Fiat backing
                    "usd-stablecoin"
                ],
                slug: "hybrid-backed-usd"
            };

            const result = classifier.classify({ asset: multipleBacking });
            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('USD');
            // Classification should succeed regardless of backing mechanism conflicts
        });

        test('should prioritize DeFiLlama pegMechanism over conflicting tags', () => {
            const mechanismVsTags = {
                name: "Mechanism Conflict USD",
                symbol: "MCUSD",
                tags: [
                    "stablecoin",
                    "algorithmic-stablecoin"    // Tag says algorithmic
                ],
                pegMechanism: "fiat-backed",    // DeFiLlama says fiat-backed
                pegType: "peggedUSD",
                slug: "mechanism-conflict-usd"
            };

            const result = classifier.classify({ asset: mechanismVsTags });
            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('USD');
        });
    });

    describe('Ecosystem vs Classification Tag Conflicts', () => {
        test('should prioritize classification tags over ecosystem tags', () => {
            const ecosystemOverload = {
                name: "Multi Ecosystem USD",
                symbol: "MEUSD",
                tags: [
                    "stablecoin",              // Clear classification
                    "ethereum-ecosystem",      // Ecosystem tags
                    "polygon-ecosystem",
                    "avalanche-ecosystem", 
                    "arbitrum-ecosystem",
                    "optimism-ecosystem",
                    "binance-ecosystem",
                    "solana-ecosystem",
                    "cardano-ecosystem",
                    "polkadot-ecosystem",
                    "cosmos-ecosystem",
                    "near-ecosystem",
                    "defi",                    // Additional category tags
                    "yield-farming",
                    "lending-borrowing",
                    "usd-stablecoin"          // Currency classification
                ],
                slug: "multi-ecosystem-usd"
            };

            const result = classifier.classify({ asset: ecosystemOverload });
            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('USD');
        });

        test('should handle assets with conflicting ecosystem implications', () => {
            const conflictingEcosystems = {
                name: "Cross Chain Conflict USD",
                symbol: "CCCUSD",
                tags: [
                    "stablecoin",
                    "ethereum-ecosystem",      // Suggests ETH
                    "bitcoin-ecosystem",       // Suggests BTC
                    "usd-stablecoin"          // Explicit USD
                ],
                slug: "cross-chain-conflict-usd"
            };

            const result = classifier.classify({ asset: conflictingEcosystems });
            expect(result.assetCategory).toBe('Stablecoin');
            // Should prioritize explicit currency tag
            expect(result.peggedAsset).toBe('USD');
        });
    });

    describe('Investment Fund vs Classification Conflicts', () => {
        test('should classify despite overwhelming investment fund tags', () => {
            // Simulating Bitcoin's tag structure but with stablecoin classification
            const investmentHeavyAsset = {
                name: "Venture Backed USD",
                symbol: "VBUSD",
                tags: [
                    "stablecoin",                        // Key classification
                    "usd-stablecoin",                   // Currency
                    "coinbase-ventures-portfolio",       // Investment tags start here
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
                    "paradigm-portfolio"
                ],
                slug: "venture-backed-usd"
            };

            const result = classifier.classify({ asset: investmentHeavyAsset });
            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('USD');
        });
    });

    describe('Generic vs Specific Tag Conflicts', () => {
        test('should prioritize specific tags over generic ones', () => {
            const genericVsSpecific = {
                name: "Generic Specific Conflict",
                symbol: "GSC",
                tags: [
                    "cryptocurrency",          // Very generic
                    "digital-asset",          // Generic
                    "token",                  // Generic
                    "blockchain",             // Generic
                    "stablecoin",            // Specific classification
                    "asset-backed-stablecoin", // More specific
                    "usd-stablecoin",        // Very specific
                    "fiat-stablecoin"        // Specific backing type
                ],
                slug: "generic-specific-conflict"
            };

            const result = classifier.classify({ asset: genericVsSpecific });
            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('USD');
        });
    });

    describe('Regulatory and Compliance Tag Conflicts', () => {
        test('should classify despite regulatory conflict tags', () => {
            const regulatoryConflict = {
                name: "Regulatory Conflict USD",
                symbol: "RCUSD",
                tags: [
                    "stablecoin",
                    "usd-stablecoin",
                    "alleged-sec-securities",     // Regulatory conflict
                    "compliance-issues",          // Compliance conflict  
                    "discontinued",               // Status conflict
                    "deprecated",                 // Status conflict
                    "legacy"                      // Status conflict
                ],
                slug: "regulatory-conflict-usd"
            };

            const result = classifier.classify({ asset: regulatoryConflict });
            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('USD');
        });
    });

    describe('Version and Legacy Tag Conflicts', () => {
        test('should handle version conflicts appropriately', () => {
            const versionConflict = {
                name: "Version Conflict USD",
                symbol: "VCUSD",
                tags: [
                    "stablecoin",
                    "usd-stablecoin",
                    "version-1",              // Version tags
                    "version-2",
                    "legacy",
                    "deprecated",
                    "upgraded",
                    "new-version"
                ],
                slug: "version-conflict-usd"
            };

            const result = classifier.classify({ asset: versionConflict });
            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('USD');
        });

        test('should classify Terra Classic vs Terra 2.0 style conflicts', () => {
            const terraStyleConflict = {
                name: "Terra Classic USD",
                symbol: "USTC",
                tags: [
                    "stablecoin",
                    "legacy",                 // Legacy version
                    "terra-classic",          // Old ecosystem
                    "terra-2.0",             // New ecosystem (conflict)
                    "algorithmic-stablecoin",
                    "deprecated",
                    "migrated"
                ],
                slug: "terra-classic-usd"
            };

            const result = classifier.classify({ asset: terraStyleConflict });
            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('USD');
        });
    });

    describe('Complex Real-World Tag Combinations', () => {
        test('should handle Ethena USDe complex tag structure', () => {
            // Based on real CMC data for USDe
            const ethenaUSDe = {
                id: 29470,
                name: "Ethena USDe",
                symbol: "USDe",
                slug: "ethena-usde",
                tags: [
                    "stablecoin",
                    "asset-backed-stablecoin",    // Backing type
                    "binance-labs-portfolio",     // Investment
                    "dragonfly-capital-portfolio", // Investment
                    "usd-stablecoin",            // Currency
                    "eigenlayer-ecosystem",       // Ecosystem
                    "binance-ecosystem",          // Another ecosystem
                    "xlayer-ecosymstem"            // Third ecosystem
                ]
            };

            const result = classifier.classify({ asset: ethenaUSDe });
            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('USD');
        });

        test('should handle USDD complex algorithmic structure', () => {
            // Based on real CMC data for USDD
            const usdd = {
                id: 19891,
                name: "USDD",
                symbol: "USDD",
                slug: "usdd",
                tags: [
                    "stablecoin",
                    "algorithmic-stablecoin",     // Backing mechanism
                    "usd-stablecoin",            // Currency
                    "tron20-ecosystem"           // Ecosystem
                ]
            };

            const result = classifier.classify({ asset: usdd });
            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('USD');
        });
    });

    describe('Priority Resolution Performance', () => {
        test('should efficiently resolve tag conflicts in batch', () => {
            const conflictingAssets = Array.from({ length: 50 }, (_, i) => ({
                name: `Conflict Asset ${i}`,
                symbol: `CONF${i}`,
                tags: [
                    "stablecoin",
                    "tokenized-assets",           // Conflict 1
                    "usd-stablecoin", 
                    "eur-stablecoin",            // Conflict 2
                    "algorithmic-stablecoin",
                    "fiat-stablecoin",           // Conflict 3
                    "ethereum-ecosystem",
                    "bitcoin-ecosystem",          // Conflict 4
                    `portfolio-${i}`,
                    `ecosystem-${i}`
                ],
                slug: `conflict-asset-${i}`
            }));

            const startTime = Date.now();
            const results = conflictingAssets.map(asset => classifier.classify({ asset }));
            const endTime = Date.now();

            expect(results).toHaveLength(50);
            expect(results.every(r => r.assetCategory === 'Stablecoin')).toBe(true);
            expect(results.every(r => ['USD', 'EUR'].includes(r.peggedAsset))).toBe(true);
            expect(endTime - startTime).toBeLessThan(100);
        });
    });

    describe('Fallback Behavior for Unresolvable Conflicts', () => {
        test('should gracefully handle completely contradictory data', () => {
            const contradictoryAsset = {
                name: "Contradiction Token",
                symbol: "CONTR",
                tags: [
                    "stablecoin",
                    "volatility-token",           // Complete contradiction
                    "usd-stablecoin",
                    "non-pegged",                // Contradiction
                    "stable",
                    "volatile"                   // Contradiction
                ],
                pegType: "peggedUSD",
                pegMechanism: "non-pegged",      // Contradiction with pegType
                slug: "contradiction-token"
            };

            const result = classifier.classify({ asset: contradictoryAsset });
            expect(result.assetCategory).toBe('Stablecoin');
            // Should still resolve to a currency despite contradictions
            expect(result.peggedAsset).toBe('USD');
        });

        test('should handle assets with no clear classification signals', () => {
            const unclearAsset = {
                name: "Unclear Asset",
                symbol: "UNCLEAR",
                tags: [
                    "blockchain",
                    "cryptocurrency",
                    "token",
                    "digital-asset"
                    // No specific classification tags
                ],
                slug: "unclear-asset"
            };

            const result = classifier.classify({ asset: unclearAsset });
            expect(result.assetCategory).toBe('Other');
            expect(result.peggedAsset).toBeNull();
        });
    });
});
