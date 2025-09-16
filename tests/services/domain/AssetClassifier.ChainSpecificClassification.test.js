/**
 * Chain-Specific Classification Test Suite for AssetClassifier
 * 
 * Tests for assets that exist across multiple blockchain networks with
 * chain-specific variations, based on real DeFiLlama multi-chain data.
 */
const AssetClassifier = require('../../../services/domain/AssetClassifier');
const ApiConfig = require('../../../config/ApiConfig');

describe('AssetClassifier - Chain-Specific Classification', () => {
    let classifier;

    beforeEach(() => {
        classifier = new AssetClassifier(ApiConfig.getAssetClassificationConfig());
    });

    describe('USDC Cross-Chain Variations', () => {
        test('should classify USDC consistently across all major chains', () => {
            // Based on real DeFiLlama data showing USDC on multiple chains
            const usdcChainVariants = [
                {
                    name: "USD Coin",
                    symbol: "USDC",
                    chain: "Ethereum",
                    tags: ["stablecoin", "ethereum-ecosystem", "usd-stablecoin"],
                    chainCirculating: { current: { peggedUSD: 40000000000 } }
                },
                {
                    name: "USD Coin (PoS)",
                    symbol: "USDC",
                    chain: "Polygon",
                    tags: ["stablecoin", "polygon-ecosystem", "usd-stablecoin"],
                    chainCirculating: { current: { peggedUSD: 120000000 } }
                },
                {
                    name: "USD Coin",
                    symbol: "USDC.e",
                    chain: "Avalanche",
                    tags: ["stablecoin", "avalanche-ecosystem", "usd-stablecoin"],
                    chainCirculating: { current: { peggedUSD: 6070026.75 } }
                },
                {
                    name: "USD Coin",
                    symbol: "USDC",
                    chain: "Solana",
                    tags: ["stablecoin", "solana-ecosystem", "usd-stablecoin"],
                    chainCirculating: { current: { peggedUSD: 36075026000 } }
                },
                {
                    name: "USD Coin",
                    symbol: "USDC",
                    chain: "Base",
                    tags: ["stablecoin", "base-ecosystem", "usd-stablecoin"],
                    chainCirculating: { current: { peggedUSD: 40341071990 } }
                },
                {
                    name: "USD Coin",
                    symbol: "USDC",
                    chain: "Arbitrum",
                    tags: ["stablecoin", "arbitrum-ecosystem", "usd-stablecoin"],
                    chainCirculating: { current: { peggedUSD: 25000000000 } }
                },
                {
                    name: "USD Coin",
                    symbol: "USDC",
                    chain: "OP Mainnet",
                    tags: ["stablecoin", "optimism-ecosystem", "usd-stablecoin"],
                    chainCirculating: { current: { peggedUSD: 8000000000 } }
                }
            ];

            usdcChainVariants.forEach(variant => {
                const result = classifier.classify({
                    ...variant,
                    slug: `usd-coin-${variant.chain.toLowerCase()}`
                });
                expect(result.assetCategory).toBe('Stablecoin');
                expect(result.peggedAsset).toBe('USD');
            });
        });
    });

    describe('EURC Cross-Chain Variations', () => {
        test('should classify EURC consistently across different chains', () => {
            // Based on real DeFiLlama data for EURC
            const eurcChainVariants = [
                {
                    name: "EURC",
                    symbol: "EURC",
                    chain: "Ethereum",
                    pegType: "peggedEUR",
                    chainCirculating: { current: { peggedEUR: 119968998.077 } }
                },
                {
                    name: "EURC",
                    symbol: "EURC",
                    chain: "Solana",
                    pegType: "peggedEUR",
                    chainCirculating: { current: { peggedEUR: 36075026.28 } }
                },
                {
                    name: "EURC",
                    symbol: "EURC",
                    chain: "Base",
                    pegType: "peggedEUR",
                    chainCirculating: { current: { peggedEUR: 40341071.99 } }
                },
                {
                    name: "EURC",
                    symbol: "EURC",
                    chain: "Avalanche",
                    pegType: "peggedEUR",
                    chainCirculating: { current: { peggedEUR: 6070026.75 } }
                },
                {
                    name: "EURC",
                    symbol: "EURC",
                    chain: "Stellar",
                    pegType: "peggedEUR",
                    chainCirculating: { current: { peggedEUR: 1783015 } }
                },
                {
                    name: "EURC",
                    symbol: "EURC",
                    chain: "Cardano",
                    pegType: "peggedEUR",
                    chainCirculating: { current: { peggedEUR: 175.272679 } }
                }
            ];

            eurcChainVariants.forEach(variant => {
                const result = classifier.classify({
                    ...variant,
                    slug: `eurc-${variant.chain.toLowerCase()}`
                });
                expect(result.assetCategory).toBe('Stablecoin');
                expect(result.peggedAsset).toBe('EUR');
            });
        });
    });

    describe('Chain-Specific Symbol Variations', () => {
        test('should handle chain-specific symbol suffixes', () => {
            const chainSymbolVariants = [
                {
                    name: "USDC Ethereum",
                    symbol: "USDC.e",
                    chain: "Avalanche",
                    tags: ["stablecoin", "usd-stablecoin"]
                },
                {
                    name: "USDT Solana",
                    symbol: "USDT.sol",
                    chain: "Solana", 
                    tags: ["stablecoin", "usd-stablecoin"]
                },
                {
                    name: "USDC Polygon",
                    symbol: "USDC.poly",
                    chain: "Polygon",
                    tags: ["stablecoin", "usd-stablecoin"]
                },
                {
                    name: "USDT BSC",
                    symbol: "USDT.bsc",
                    chain: "BSC",
                    tags: ["stablecoin", "usd-stablecoin"]
                }
            ];

            chainSymbolVariants.forEach(variant => {
                const result = classifier.classify({
                    ...variant,
                    slug: variant.name.toLowerCase().replace(/\s+/g, '-')
                });
                expect(result.assetCategory).toBe('Stablecoin');
                expect(result.peggedAsset).toBe('USD');
            });
        });

        test('should handle bridged token naming conventions', () => {
            const bridgedTokens = [
                {
                    name: "Wrapped USDC",
                    symbol: "WUSDC",
                    chain: "Polygon",
                    tags: ["stablecoin", "wrapped", "usd-stablecoin"]
                },
                {
                    name: "Bridged USDT",
                    symbol: "bUSDT",
                    chain: "Arbitrum",
                    tags: ["stablecoin", "bridged", "usd-stablecoin"]
                },
                {
                    name: "Portal USDC",
                    symbol: "portalUSDC",
                    chain: "Solana",
                    tags: ["stablecoin", "portal", "usd-stablecoin"]
                },
                {
                    name: "Synapse USDC",
                    symbol: "synUSDC",
                    chain: "Avalanche",
                    tags: ["stablecoin", "synapse", "usd-stablecoin"]
                }
            ];

            bridgedTokens.forEach(token => {
                const result = classifier.classify({
                    ...token,
                    slug: token.name.toLowerCase().replace(/\s+/g, '-')
                });
                expect(result.assetCategory).toBe('Stablecoin');
                expect(result.peggedAsset).toBe('USD');
            });
        });
    });

    describe('DeFiLlama Chain Circulation Data', () => {
        test('should classify assets with complex chain circulation structures', () => {
            // Real structure from DeFiLlama EURA data
            const complexChainAsset = {
                name: "EURA",
                symbol: "EURA",
                gecko_id: "ageur",
                pegType: "peggedEUR",
                pegMechanism: "crypto-backed",
                chainCirculating: {
                    "OP Mainnet": {
                        current: { peggedEUR: 79419.23358457036 },
                        circulatingPrevDay: { peggedEUR: 79457.86450546228 },
                        circulatingPrevWeek: { peggedEUR: 79553.43335417376 },
                        circulatingPrevMonth: { peggedEUR: 67367.20448895209 }
                    },
                    "Ethereum": {
                        current: { peggedEUR: 17018190.49420138 },
                        circulatingPrevDay: { peggedEUR: 17040181.225278277 },
                        circulatingPrevWeek: { peggedEUR: 17251746.400367532 },
                        circulatingPrevMonth: { peggedEUR: 16971922.681825314 }
                    },
                    "Arbitrum": {
                        current: { peggedEUR: 517470.7580276918 },
                        circulatingPrevDay: { peggedEUR: 517448.9183733248 },
                        circulatingPrevWeek: { peggedEUR: 495798.97036701976 },
                        circulatingPrevMonth: { peggedEUR: 454246.31505435647 }
                    },
                    "Polygon": {
                        current: { peggedEUR: 180050.91576013248 },
                        circulatingPrevDay: { peggedEUR: 180050.91576013248 },
                        circulatingPrevWeek: { peggedEUR: 179961.29942270767 },
                        circulatingPrevMonth: { peggedEUR: 185082.87474073208 }
                    }
                }
            };

            const result = classifier.classify(complexChainAsset);
            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('EUR');
        });

        test('should handle assets with many chain deployments', () => {
            // Simulating USDT which appears on 20+ chains in real data
            const multiChainAsset = {
                name: "Tether",
                symbol: "USDT",
                pegType: "peggedUSD",
                pegMechanism: "fiat-backed",
                chainCirculating: {
                    "Ethereum": { current: { peggedUSD: 50000000000 } },
                    "Tron": { current: { peggedUSD: 60000000000 } },
                    "BSC": { current: { peggedUSD: 5000000000 } },
                    "Polygon": { current: { peggedUSD: 1000000000 } },
                    "Avalanche": { current: { peggedUSD: 800000000 } },
                    "Arbitrum": { current: { peggedUSD: 2500000000 } },
                    "OP Mainnet": { current: { peggedUSD: 500000000 } },
                    "Solana": { current: { peggedUSD: 1500000000 } },
                    "Fantom": { current: { peggedUSD: 100000000 } },
                    "Harmony": { current: { peggedUSD: 50000000 } },
                    "Moonbeam": { current: { peggedUSD: 25000000 } },
                    "Cronos": { current: { peggedUSD: 75000000 } },
                    "Celo": { current: { peggedUSD: 40000000 } },
                    "Near": { current: { peggedUSD: 30000000 } },
                    "Aurora": { current: { peggedUSD: 20000000 } },
                    "Heco": { current: { peggedUSD: 15000000 } },
                    "xDAI": { current: { peggedUSD: 10000000 } },
                    "Kava": { current: { peggedUSD: 8000000 } },
                    "Milkomeda": { current: { peggedUSD: 5000000 } },
                    "Evmos": { current: { peggedUSD: 3000000 } }
                }
            };

            const result = classifier.classify(multiChainAsset);
            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('USD');
        });
    });

    describe('Chain-Specific Ecosystem Tags', () => {
        test('should classify despite overwhelming ecosystem tags', () => {
            const ecosystemHeavyAsset = {
                name: "Multi-Chain USD",
                symbol: "MCUSD",
                tags: [
                    "stablecoin",
                    "usd-stablecoin",
                    // Overwhelming ecosystem tags
                    "ethereum-ecosystem",
                    "polygon-ecosystem", 
                    "avalanche-ecosystem",
                    "arbitrum-ecosystem",
                    "optimism-ecosystem",
                    "base-ecosystem",
                    "solana-ecosystem",
                    "bsc-ecosystem",
                    "fantom-ecosystem",
                    "harmony-ecosystem",
                    "moonbeam-ecosystem",
                    "cronos-ecosystem",
                    "celo-ecosystem",
                    "near-ecosystem",
                    "aurora-ecosystem",
                    "cosmos-ecosystem",
                    "osmosis-ecosystem",
                    "juno-ecosystem",
                    "kava-ecosystem"
                ],
                slug: "multi-chain-usd"
            };

            const result = classifier.classify(ecosystemHeavyAsset);
            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('USD');
        });
    });

    describe('Layer 2 and Sidechain Variations', () => {
        test('should classify L2 stablecoin variants correctly', () => {
            const l2Variants = [
                {
                    name: "Arbitrum USD Coin",
                    symbol: "USDC",
                    tags: ["stablecoin", "arbitrum-ecosystem", "layer-2"],
                    chain: "Arbitrum One"
                },
                {
                    name: "Optimism USD Coin", 
                    symbol: "USDC",
                    tags: ["stablecoin", "optimism-ecosystem", "layer-2"],
                    chain: "OP Mainnet"
                },
                {
                    name: "Polygon USD Coin",
                    symbol: "USDC",
                    tags: ["stablecoin", "polygon-ecosystem", "sidechain"],
                    chain: "Polygon"
                },
                {
                    name: "Base USD Coin",
                    symbol: "USDC", 
                    tags: ["stablecoin", "base-ecosystem", "layer-2"],
                    chain: "Base"
                },
                {
                    name: "zkSync USD Coin",
                    symbol: "USDC",
                    tags: ["stablecoin", "zksync-ecosystem", "layer-2"],
                    chain: "zkSync Era"
                }
            ];

            l2Variants.forEach(variant => {
                const result = classifier.classify({
                    ...variant,
                    slug: variant.name.toLowerCase().replace(/\s+/g, '-')
                });
                expect(result.assetCategory).toBe('Stablecoin');
                expect(result.peggedAsset).toBe('USD');
            });
        });
    });

    describe('Cross-Chain Bridge Asset Classification', () => {
        test('should classify bridged assets consistently', () => {
            const bridgedAssets = [
                {
                    name: "Multichain USDC",
                    symbol: "anyUSDC",
                    tags: ["stablecoin", "multichain", "bridge"],
                    bridge: "Multichain"
                },
                {
                    name: "Wormhole USDC",
                    symbol: "USDC(Wormhole)",
                    tags: ["stablecoin", "wormhole", "bridge"],
                    bridge: "Wormhole"
                },
                {
                    name: "Celer USDC",
                    symbol: "ceUSDC",
                    tags: ["stablecoin", "celer", "bridge"],
                    bridge: "Celer"
                },
                {
                    name: "Hop USDC",
                    symbol: "hUSDC",
                    tags: ["stablecoin", "hop", "bridge"],
                    bridge: "Hop"
                }
            ];

            bridgedAssets.forEach(asset => {
                const result = classifier.classify({
                    ...asset,
                    slug: asset.name.toLowerCase().replace(/\s+/g, '-')
                });
                expect(result.assetCategory).toBe('Stablecoin');
                expect(result.peggedAsset).toBe('USD');
            });
        });
    });

    describe('Performance with Multi-Chain Data', () => {
        test('should efficiently process assets with complex chain data', () => {
            const multiChainAssets = Array.from({ length: 100 }, (_, i) => ({
                name: `Multi-Chain Asset ${i}`,
                symbol: `MCA${i}`,
                tags: ["stablecoin", "usd-stablecoin"],
                pegType: "peggedUSD",
                chainCirculating: {
                    "Ethereum": { current: { peggedUSD: Math.random() * 1000000000 } },
                    "Polygon": { current: { peggedUSD: Math.random() * 100000000 } },
                    "Arbitrum": { current: { peggedUSD: Math.random() * 500000000 } },
                    "Optimism": { current: { peggedUSD: Math.random() * 200000000 } },
                    "Base": { current: { peggedUSD: Math.random() * 300000000 } },
                    "Avalanche": { current: { peggedUSD: Math.random() * 150000000 } },
                    "Solana": { current: { peggedUSD: Math.random() * 800000000 } },
                    "BSC": { current: { peggedUSD: Math.random() * 400000000 } }
                },
                slug: `multi-chain-asset-${i}`
            }));

            const startTime = Date.now();
            const results = multiChainAssets.map(asset => classifier.classify({ asset }));
            const endTime = Date.now();

            expect(results).toHaveLength(100);
            expect(results.every(r => r.assetCategory === 'Stablecoin')).toBe(true);
            expect(results.every(r => r.peggedAsset === 'USD')).toBe(true);
            expect(endTime - startTime).toBeLessThan(100);
        });
    });

    describe('Chain Migration and Upgrades', () => {
        test('should handle assets that migrated between chains', () => {
            const migratedAssets = [
                {
                    name: "Legacy Ethereum USDC",
                    symbol: "USDC_OLD",
                    tags: ["stablecoin", "legacy", "ethereum-ecosystem"],
                    status: "deprecated"
                },
                {
                    name: "New Polygon USDC",
                    symbol: "USDC_NEW",
                    tags: ["stablecoin", "current", "polygon-ecosystem"],
                    status: "active"
                },
                {
                    name: "Terra Classic USD",
                    symbol: "USTC",
                    tags: ["stablecoin", "terra-classic", "legacy"],
                    status: "deprecated"
                },
                {
                    name: "Terra 2.0 USD",
                    symbol: "USDT2",
                    tags: ["stablecoin", "terra-2.0", "current"],
                    status: "active"
                }
            ];

            migratedAssets.forEach(asset => {
                const result = classifier.classify({
                    ...asset,
                    slug: asset.name.toLowerCase().replace(/\s+/g, '-')
                });
                expect(result.assetCategory).toBe('Stablecoin');
                expect(result.peggedAsset).toBe('USD');
            });
        });
    });

    describe('Chain-Specific Risk and Compliance', () => {
        test('should classify assets with chain-specific regulatory issues', () => {
            const regulatoryVariants = [
                {
                    name: "USDC Ethereum (Regulated)",
                    symbol: "USDC",
                    tags: ["stablecoin", "regulated", "compliant"],
                    chain: "Ethereum",
                    regulatory_status: "compliant"
                },
                {
                    name: "USDC Tornado (Sanctioned)",
                    symbol: "USDC",
                    tags: ["stablecoin", "sanctioned", "blocked"],
                    chain: "Ethereum",
                    regulatory_status: "sanctioned"
                },
                {
                    name: "USDC BSC (Unregulated)",
                    symbol: "USDC",
                    tags: ["stablecoin", "unregulated"],
                    chain: "BSC",
                    regulatory_status: "unregulated"
                }
            ];

            regulatoryVariants.forEach(variant => {
                const result = classifier.classify({
                    ...variant,
                    slug: variant.name.toLowerCase().replace(/\s+/g, '-')
                });
                expect(result.assetCategory).toBe('Stablecoin');
                expect(result.peggedAsset).toBe('USD');
            });
        });
    });

    describe('Interoperability and Cross-Chain Protocols', () => {
        test('should classify IBC and cross-chain protocol assets', () => {
            const crossChainAssets = [
                {
                    name: "IBC USDC",
                    symbol: "ibc/USDC",
                    tags: ["stablecoin", "ibc", "cosmos-ecosystem"],
                    protocol: "IBC"
                },
                {
                    name: "Axelar USDC",
                    symbol: "axlUSDC",
                    tags: ["stablecoin", "axelar", "interchain"],
                    protocol: "Axelar"
                },
                {
                    name: "LayerZero USDC",
                    symbol: "lzUSDC",
                    tags: ["stablecoin", "layerzero", "omnichain"],
                    protocol: "LayerZero"
                },
                {
                    name: "Hyperlane USDC",
                    symbol: "hlUSDC",
                    tags: ["stablecoin", "hyperlane", "interchain"],
                    protocol: "Hyperlane"
                }
            ];

            crossChainAssets.forEach(asset => {
                const result = classifier.classify({
                    ...asset,
                    slug: asset.name.toLowerCase().replace(/\s+/g, '-')
                });
                expect(result.assetCategory).toBe('Stablecoin');
                expect(result.peggedAsset).toBe('USD');
            });
        });
    });
});});
});