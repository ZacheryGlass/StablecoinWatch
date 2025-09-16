/**
 * Depegged Asset Handling Test Suite for AssetClassifier
 * 
 * Tests for stablecoins that have lost their peg, collapsed, or are trading
 * significantly off their intended value. Based on real-world incidents.
 */
const AssetClassifier = require('../../../services/domain/AssetClassifier');
const ApiConfig = require('../../../config/ApiConfig');

describe('AssetClassifier - Depegged Asset Handling', () => {
    let classifier;

    beforeEach(() => {
        classifier = new AssetClassifier(ApiConfig.getAssetClassificationConfig());
    });

    describe('Terra Ecosystem Collapse (May 2022)', () => {
        test('should classify TerraClassicUSD despite complete depeg', () => {
            const terraClassicUSD = {
                name: "TerraClassicUSD",
                symbol: "USTC",
                gecko_id: "terrausd",
                pegType: "peggedUSD",
                pegMechanism: "algorithmic",
                tags: ["stablecoin", "algorithmic-stablecoin"],
                current_price: 0.025, // Massive depeg from $1 target
                market_cap: 1500000000, // Down from $18B+ at peak
                circulating_supply: 60000000000 // Massive hyperinflation
            };

            const result = classifier.classify({ asset: terraClassicUSD });
            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('USD');
        });

        test('should classify TerraUSD (original) if still found in data', () => {
            const originalTerraUSD = {
                name: "TerraUSD",
                symbol: "UST",
                tags: ["stablecoin", "algorithmic-stablecoin"],
                current_price: 0.045,
                pegMechanism: "algorithmic"
            };

            const result = classifier.classify({ asset: originalTerraUSD });
            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('USD');
        });
    });

    describe('Binance USD (BUSD) Sunset', () => {
        test('should classify BUSD despite being discontinued', () => {
            const busd = {
                id: 4687,
                name: "BUSD",
                symbol: "BUSD",
                slug: "binance-usd",
                tags: [
                    "stablecoin",
                    "asset-backed-stablecoin",
                    "binance-chain",
                    "usd-stablecoin",
                    "alleged-sec-securities", // Real tag from CMC data
                    "fiat-stablecoin"
                ],
                current_price: 0.9985, // Still close to peg but being wound down
                infinite_supply: true,
                self_reported_circulating_supply: null // Decreasing supply
            };

            const result = classifier.classify({ asset: busd });
            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('USD');
        });

        test('should classify Venus BUSD (vBUSD) despite extreme depeg', () => {
            // Real asset from CMC data - price $0.022
            const venusBUSD = {
                id: 7959,
                name: "Venus BUSD",
                symbol: "vBUSD",
                slug: "venus-busd",
                tags: ["stablecoin"],
                current_price: 0.02231431262938752, // 97.7% depegged
                volume_24h: 0,
                market_cap_change_24h: 0
            };

            const result = classifier.classify({ asset: venusBUSD });
            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('USD');
        });
    });

    describe('Iron Finance TITAN/IRON Collapse (June 2021)', () => {
        test('should classify IRON despite algorithmic failure', () => {
            const ironUSD = {
                name: "Iron Finance USD",
                symbol: "IRON",
                tags: ["stablecoin", "algorithmic-stablecoin"],
                current_price: 0.00001, // Essentially worthless
                pegMechanism: "algorithmic",
                circulating_supply: 0 // No longer minted
            };

            const result = classifier.classify({ asset: ironUSD });
            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('USD');
        });

        test('should handle TITAN (not a stablecoin but related to IRON)', () => {
            const titan = {
                name: "TITAN",
                symbol: "TITAN",
                tags: ["defi"], // No stablecoin tag
                current_price: 0.0000000001,
                pegMechanism: "none"
            };

            const result = classifier.classify({ asset: titan });
            expect(result.assetCategory).toBe('Other'); // Should not classify as stablecoin
            expect(result.peggedAsset).toBeNull();
        });
    });

    describe('Temporary Depegging Events', () => {
        test('should classify USDC during March 2023 Silicon Valley Bank depeg', () => {
            const usdcDuringDepeg = {
                name: "USD Coin",
                symbol: "USDC",
                tags: ["stablecoin", "fiat-stablecoin", "usd-stablecoin"],
                current_price: 0.877, // Temporary depeg to $0.877 during SVB crisis
                pegMechanism: "fiat-backed"
            };

            const result = classifier.classify({ asset: usdcDuringDepeg });
            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('USD');
        });

        test('should classify FRAX during various depegging events', () => {
            const fraxDepeg = {
                name: "Frax",
                symbol: "FRAX",
                tags: ["stablecoin", "algorithmic-stablecoin", "usd-stablecoin"],
                current_price: 0.92, // Temporary depeg
                pegMechanism: "algorithmic"
            };

            const result = classifier.classify({ asset: fraxDepeg });
            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('USD');
        });

        test('should classify DAI during Black Thursday (March 2020)', () => {
            const daiBlackThursday = {
                name: "Dai",
                symbol: "DAI",
                tags: ["stablecoin", "defi", "usd-stablecoin"],
                current_price: 1.10, // Spiked above peg during crisis
                pegMechanism: "crypto-backed"
            };

            const result = classifier.classify({ asset: daiBlackThursday });
            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('USD');
        });
    });

    describe('Regional Stablecoin Depegs', () => {
        test('should classify Turkish Lira stablecoins during currency crisis', () => {
            const tryStablecoin = {
                name: "Turkish Lira Token",
                symbol: "TRYT",
                tags: ["stablecoin", "try-stablecoin"],
                current_price: 0.85, // Reflecting TRY weakness vs intended peg
                pegMechanism: "fiat-backed"
            };

            const result = classifier.classify({ asset: tryStablecoin });
            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('TRY');
        });

        test('should classify Argentine Peso stablecoins during hyperinflation', () => {
            const arsStablecoin = {
                name: "Argentine Peso Token",
                symbol: "ARST",
                tags: ["stablecoin", "ars-stablecoin"],
                current_price: 0.70, // Massive depeg due to peso devaluation
                pegMechanism: "fiat-backed"
            };

            const result = classifier.classify({ asset: arsStablecoin });
            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('ARS');
        });
    });

    describe('Extreme Price Edge Cases', () => {
        test('should handle stablecoins with near-zero prices', () => {
            const nearZeroStablecoin = {
                name: "Failed Stablecoin",
                symbol: "FAIL",
                tags: ["stablecoin"],
                current_price: 0.0000001,
                market_cap: 100,
                volume_24h: 0
            };

            const result = classifier.classify({ asset: nearZeroStablecoin });
            expect(result.assetCategory).toBe('Stablecoin');
            // Should not assume currency if unclear
            expect(result.peggedAsset).toBeNull();
        });

        test('should handle stablecoins trading above peg', () => {
            const abovePegStablecoin = {
                name: "Premium USD",
                symbol: "PUSD",
                tags: ["stablecoin", "usd-stablecoin"],
                current_price: 1.50, // Trading 50% above peg
                market_cap: 1000000
            };

            const result = classifier.classify({ asset: abovePegStablecoin });
            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('USD');
        });

        test('should handle missing price data', () => {
            const noPriceStablecoin = {
                name: "USD Coin",
                symbol: "USDC",
                tags: ["stablecoin", "usd-stablecoin"],
                current_price: null,
                market_cap: null
            };

            const result = classifier.classify({ asset: noPriceStablecoin });
            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('USD');
        });
    });

    describe('Rebranded Post-Collapse Assets', () => {
        test('should classify assets that rebranded after collapse', () => {
            const rebrandedAsset = {
                name: "Terra Classic USD (Legacy)",
                symbol: "USTC",
                tags: ["stablecoin", "legacy"],
                current_price: 0.025,
                pegType: "peggedUSD"
            };

            const result = classifier.classify({ asset: rebrandedAsset });
            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('USD');
        });

        test('should classify successor stablecoins', () => {
            const successorAsset = {
                name: "Terra USD 2.0",
                symbol: "USDT2",
                tags: ["stablecoin", "usd-stablecoin", "algorithmic-stablecoin"],
                current_price: 0.99,
                pegMechanism: "algorithmic"
            };

            const result = classifier.classify({ asset: successorAsset });
            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('USD');
        });
    });

    describe('Stablecoins with Complex Backing During Crisis', () => {
        test('should classify multi-collateral stablecoins during crisis', () => {
            const multiCollateralStablecoin = {
                name: "Multi Collateral Dai",
                symbol: "DAI",
                tags: ["stablecoin", "defi", "multi-collateral"],
                current_price: 1.05, // Slight depeg during crisis
                pegMechanism: "crypto-backed"
            };

            const result = classifier.classify({ asset: multiCollateralStablecoin });
            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('USD');
        });

        test('should classify algorithmic stablecoins with partial backing', () => {
            const partiallyBackedStablecoin = {
                name: "Fractional USD",
                symbol: "FRAX",
                tags: ["stablecoin", "algorithmic-stablecoin", "fractional-reserve"],
                current_price: 0.95, // Depeg during market stress
                pegMechanism: "algorithmic"
            };

            const result = classifier.classify({ asset: partiallyBackedStablecoin });
            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('USD');
        });
    });

    describe('Performance During Market Stress', () => {
        test('should efficiently classify many depegged assets', () => {
            const depeggedAssets = Array.from({ length: 50 }, (_, i) => ({
                name: `Depegged Stablecoin ${i}`,
                symbol: `DEPEG${i}`,
                tags: ["stablecoin", "usd-stablecoin"],
                current_price: Math.random() * 0.5 + 0.25, // Random prices between $0.25-$0.75
                market_cap: Math.random() * 1000000
            }));

            const startTime = Date.now();
            const results = depeggedAssets.map(asset => classifier.classify({ asset }));
            const endTime = Date.now();

            expect(results).toHaveLength(50);
            expect(results.every(r => r.assetCategory === 'Stablecoin')).toBe(true);
            expect(results.every(r => r.peggedAsset === 'USD')).toBe(true);
            expect(endTime - startTime).toBeLessThan(50); // Should be fast
        });
    });

    describe('Regulatory Impact on Stablecoins', () => {
        test('should classify stablecoins affected by regulatory action', () => {
            const regulatoryAffectedStablecoin = {
                name: "Binance USD",
                symbol: "BUSD",
                tags: [
                    "stablecoin",
                    "usd-stablecoin",
                    "alleged-sec-securities", // Real tag indicating regulatory issues
                    "discontinued"
                ],
                current_price: 0.998, // Still maintaining peg during wind-down
                market_cap: 2000000000, // Decreasing as users exit
                regulatory_status: "discontinued"
            };

            const result = classifier.classify({ asset: regulatoryAffectedStablecoin });
            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('USD');
        });
    });

    describe('Stablecoins with Governance Issues', () => {
        test('should classify stablecoins with governance problems', () => {
            const governanceIssueStablecoin = {
                name: "Governance Crisis USD",
                symbol: "GCUSD",
                tags: ["stablecoin", "usd-stablecoin", "governance-token"],
                current_price: 0.88, // Depeg due to governance uncertainty
                governance_active: false,
                last_governance_action: "2022-01-01"
            };

            const result = classifier.classify({ asset: governanceIssueStablecoin });
            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('USD');
        });
    });

    describe('Oracle and Price Feed Issues', () => {
        test('should handle stablecoins with oracle manipulation', () => {
            const oracleManipulatedStablecoin = {
                name: "Oracle USD",
                symbol: "OUSD",
                tags: ["stablecoin", "oracle-dependent"],
                current_price: 1.25, // Price manipulation via oracle
                oracle_status: "compromised"
            };

            const result = classifier.classify({ asset: oracleManipulatedStablecoin });
            expect(result.assetCategory).toBe('Stablecoin');
            expect(result.peggedAsset).toBe('USD');
        });
    });
});
