const Platform = require('../../models/platform');

/**
 * Specialized class for normalizing and extracting platform/blockchain information.
 * Handles platform name standardization, platform extraction from various data sources,
 * and provides consistent platform naming across the application.
 * 
 * @class PlatformNormalizer
 */
class PlatformNormalizer {
    constructor() {
        this.platformMap = {
            'ethereum-pow-ecosystem': 'Ethereum',
            'ethereum': 'Ethereum',
            'eth': 'Ethereum',
            'tron20-ecosystem': 'Tron',
            'tron': 'Tron',
            'trx': 'Tron',
            'binance-smart-chain': 'BSC',
            'bsc': 'BSC',
            'bnb': 'BSC',
            'binance': 'BSC',
            'polygon': 'Polygon',
            'matic': 'Polygon',
            'solana': 'Solana',
            'sol': 'Solana',
            'avalanche': 'Avalanche',
            'avax': 'Avalanche',
            'arbitrum': 'Arbitrum',
            'optimism': 'Optimism',
            'base': 'Base',
            'bitcoin': 'Bitcoin',
            'btc': 'Bitcoin',
            'omni': 'Bitcoin (Omni)',
            'stellar': 'Stellar',
            'xlm': 'Stellar',
            'algorand': 'Algorand',
            'algo': 'Algorand',
            'cardano': 'Cardano',
            'ada': 'Cardano',
            'near': 'NEAR',
            'flow': 'Flow',
            'hedera': 'Hedera',
            'sui': 'Sui',
            'aptos': 'Aptos',
            // DeFiLlama-specific chain mappings
            'manta': 'Manta',
            'thundercore': 'ThunderCore',
            'ton': 'TON',
            'cronos': 'Cronos',
            'mantle': 'Mantle',
            'linea': 'Linea',
            'scroll': 'Scroll',
            'blast': 'Blast',
            'zkSync': 'zkSync Era',
            'zksync': 'zkSync Era',
            'fantom': 'Fantom',
            'ftm': 'Fantom',
            'celo': 'Celo',
            'harmony': 'Harmony',
            'moonbeam': 'Moonbeam',
            'moonriver': 'Moonriver',
            'kava': 'Kava',
            'osmosis': 'Osmosis',
            'terra': 'Terra',
            'injective': 'Injective',
            'cosmos': 'Cosmos Hub',
            'juno': 'Juno',
            'evmos': 'Evmos'
        };

        this.platformTags = ['ethereum', 'binance', 'solana', 'tron', 'polygon', 'avalanche'];
    }

    /**
     * Normalizes platform/blockchain names to standardized display names.
     * Maps various platform name variations to consistent, user-friendly names.
     * Handles common variations and aliases for major blockchain platforms.
     * 
     * @param {string} rawName - Raw platform name from API sources
     * @returns {string} Normalized platform name for display
     * @memberof PlatformNormalizer
     */
    normalizePlatformName(rawName) {
        if (!rawName || typeof rawName !== 'string') return 'Unknown';
        const name = rawName.toLowerCase().trim();
        
        // Direct mapping
        if (this.platformMap[name]) return this.platformMap[name];
        
        // Partial string matching for complex names
        if (name.includes('ethereum')) return 'Ethereum';
        if (name.includes('tron')) return 'Tron';
        if (name.includes('binance') || name.includes('bsc')) return 'BSC';
        if (name.includes('polygon') || name.includes('matic')) return 'Polygon';
        if (name.includes('solana')) return 'Solana';
        if (name.includes('avalanche') || name.includes('avax')) return 'Avalanche';
        if (name.includes('arbitrum')) return 'Arbitrum';
        if (name.includes('optimism')) return 'Optimism';
        if (name.includes('bitcoin') || name.includes('btc')) return 'Bitcoin';
        if (name.includes('fantom') || name.includes('ftm')) return 'Fantom';
        if (name.includes('zksync')) return 'zkSync Era';
        if (name.includes('cosmos')) return 'Cosmos Hub';
        
        // Default capitalization
        return rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
    }

    /**
     * Extracts and normalizes platform information from hybrid stablecoin data.
     * PRIORITY OVERRIDE: Always prioritizes DeFiLlama chainCirculating data when available.
     * Falls back to network breakdown, CMC platform data, or tags in that order.
     * Returns array of Platform instances with enhanced supply data and percentages.
     * 
     * @param {Object} hybrid - Hybrid stablecoin data object
     * @param {Object} [hybrid.defillamaData] - DeFiLlama-specific data with chainCirculating
     * @param {Array} [hybrid.networkBreakdown] - Network breakdown data with platform details
     * @param {Object} [hybrid._cmc] - CoinMarketCap-specific data
     * @param {Object} [hybrid._cmc.platform] - CMC platform information
     * @param {Array} [hybrid.tags] - Tag array that may contain platform indicators
     * @returns {Array<Platform>} Array of Platform instances with enhanced supply breakdown
     * @memberof PlatformNormalizer
     */
    extractPlatformsFromHybrid(hybrid) {
        const platforms = [];
        const seen = new Set();
        
        try {
            // PRIORITY OVERRIDE: DeFiLlama chainCirculating data (always first priority)
            if (this._processDeFiLlamaChainData(hybrid, platforms, seen)) {
                return platforms; // Return early with rich DeFiLlama data
            }

            // Priority 2: Network breakdown data
            if (Array.isArray(hybrid.networkBreakdown) && hybrid.networkBreakdown.length > 0) {
                hybrid.networkBreakdown.forEach(network => {
                    const raw = network.network || network.name;
                    if (raw) {
                        const normalized = this.normalizePlatformName(raw);
                        if (!seen.has(normalized)) {
                            seen.add(normalized);
                            platforms.push(new Platform(
                                normalized, 
                                network.contractAddress || '', 
                                [], 
                                network.supply || null, 
                                network.supply || null,
                                network.percentage || null,
                                {}
                            ));
                        }
                    }
                });
            } 
            // Priority 3: CMC platform data
            else if (hybrid._cmc?.platform?.name) {
                const normalized = this.normalizePlatformName(hybrid._cmc.platform.name);
                if (!seen.has(normalized)) {
                    seen.add(normalized);
                    platforms.push(new Platform(normalized, hybrid._cmc.platform.token_address || ''));
                }
            } 
            // Priority 4: Platform tags
            else if (Array.isArray(hybrid.tags) && hybrid.tags.length > 0) {
                const platformTags = hybrid.tags.filter(tag => 
                    this.platformTags.some(platformTag => tag.includes(platformTag))
                );
                platformTags.forEach(tag => {
                    const normalized = this.normalizePlatformName(tag);
                    if (!seen.has(normalized)) {
                        seen.add(normalized);
                        platforms.push(new Platform(normalized));
                    }
                });
            }
        } catch (_) { 
            // Ignore extraction errors
        }

        // Fallback to 'Unknown' if no platforms found
        if (platforms.length === 0) {
            platforms.push(new Platform('Unknown'));
        }
        
        return platforms;
    }

    /**
     * Processes DeFiLlama chainCirculating data to create enhanced Platform instances.
     * Extracts detailed supply data, percentages, and historical information.
     * 
     * @param {Object} hybrid - Hybrid stablecoin data object
     * @param {Array} platforms - Platforms array to populate
     * @param {Set} seen - Set to track processed platform names
     * @returns {boolean} True if DeFiLlama data was processed successfully
     * @private
     * @memberof PlatformNormalizer
     */
    _processDeFiLlamaChainData(hybrid, platforms, seen) {
        const defillamaData = hybrid.defillamaData || hybrid.metadata?.defillamaData;
        if (!defillamaData?.rawChainCirculating) {
            return false;
        }

        const chainCirculating = defillamaData.rawChainCirculating;
        const totalSupply = defillamaData.rawCirculating?.peggedUSD || 
                           defillamaData.rawCirculating?.peggedEUR || 
                           Object.values(defillamaData.rawCirculating || {})[0] || 
                           null;

        if (!chainCirculating || typeof chainCirculating !== 'object') {
            return false;
        }

        let processedCount = 0;
        for (const [chainName, chainData] of Object.entries(chainCirculating)) {
            if (!chainData?.current) continue;

            const chainSupply = chainData.current.peggedUSD || 
                              chainData.current.peggedEUR || 
                              Object.values(chainData.current)[0] || 
                              null;
            
            if (!chainSupply || chainSupply <= 0) continue;

            const normalized = this.normalizePlatformName(chainName);
            if (!seen.has(normalized)) {
                seen.add(normalized);
                
                const percentage = totalSupply ? (chainSupply / totalSupply) * 100 : null;
                const historicalData = {
                    prevDay: chainData.circulatingPrevDay || null,
                    prevWeek: chainData.circulatingPrevWeek || null,
                    prevMonth: chainData.circulatingPrevMonth || null
                };

                platforms.push(new Platform(
                    normalized,
                    null, // DeFiLlama doesn't provide contract addresses
                    [],
                    chainSupply, // total_supply
                    chainSupply, // circulating_supply (same for stablecoins)
                    percentage,
                    historicalData
                ));
                processedCount++;
            }
        }

        return processedCount > 0;
    }

    /**
     * Validates if a platform name is recognized.
     * 
     * @param {string} platformName - Platform name to validate
     * @returns {boolean} True if platform is recognized
     * @memberof PlatformNormalizer
     */
    isKnownPlatform(platformName) {
        if (!platformName || typeof platformName !== 'string') return false;
        const normalized = this.normalizePlatformName(platformName);
        return normalized !== 'Unknown' && Object.values(this.platformMap).includes(normalized);
    }

    /**
     * Gets all supported platform names.
     * 
     * @returns {Array<string>} Array of all supported platform names
     * @memberof PlatformNormalizer
     */
    getSupportedPlatforms() {
        return [...new Set(Object.values(this.platformMap))].sort();
    }
}

module.exports = PlatformNormalizer;