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
            'ethereum-pow-ecosystem': 'Ethereum', 'ethereum': 'Ethereum', 'eth': 'Ethereum',
            'tron20-ecosystem': 'Tron', 'tron': 'Tron', 'trx': 'Tron',
            'binance-smart-chain': 'BSC', 'bsc': 'BSC', 'bnb': 'BSC',
            'polygon': 'Polygon', 'matic': 'Polygon', 'solana': 'Solana', 'sol': 'Solana',
            'avalanche': 'Avalanche', 'avax': 'Avalanche', 'arbitrum': 'Arbitrum',
            'optimism': 'Optimism', 'base': 'Base', 'bitcoin': 'Bitcoin', 'btc': 'Bitcoin',
            'omni': 'Bitcoin (Omni)', 'stellar': 'Stellar', 'xlm': 'Stellar', 'algorand': 'Algorand',
            'algo': 'Algorand', 'cardano': 'Cardano', 'ada': 'Cardano', 'near': 'NEAR',
            'flow': 'Flow', 'hedera': 'Hedera', 'sui': 'Sui', 'aptos': 'Aptos'
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
        
        // Default capitalization
        return rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
    }

    /**
     * Extracts and normalizes platform information from hybrid stablecoin data.
     * Prioritizes network breakdown data, falls back to CMC platform data or tags.
     * Returns array of Platform instances with deduplicated, normalized names.
     * 
     * @param {Object} hybrid - Hybrid stablecoin data object
     * @param {Array} [hybrid.networkBreakdown] - Network breakdown data with platform details
     * @param {Object} [hybrid._cmc] - CoinMarketCap-specific data
     * @param {Object} [hybrid._cmc.platform] - CMC platform information
     * @param {Array} [hybrid.tags] - Tag array that may contain platform indicators
     * @returns {Array<Platform>} Array of Platform instances, with 'Unknown' fallback
     * @memberof PlatformNormalizer
     */
    extractPlatformsFromHybrid(hybrid) {
        const platforms = [];
        const seen = new Set();
        
        try {
            // Priority 1: Network breakdown data
            if (Array.isArray(hybrid.networkBreakdown) && hybrid.networkBreakdown.length > 0) {
                hybrid.networkBreakdown.forEach(network => {
                    const raw = network.network || network.name;
                    if (raw) {
                        const normalized = this.normalizePlatformName(raw);
                        if (!seen.has(normalized)) {
                            seen.add(normalized);
                            platforms.push(new Platform(normalized));
                        }
                    }
                });
            } 
            // Priority 2: CMC platform data
            else if (hybrid._cmc?.platform?.name) {
                const normalized = this.normalizePlatformName(hybrid._cmc.platform.name);
                if (!seen.has(normalized)) {
                    seen.add(normalized);
                    platforms.push(new Platform(normalized));
                }
            } 
            // Priority 3: Platform tags
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