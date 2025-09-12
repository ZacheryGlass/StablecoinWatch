const DataFormatter = require('./DataFormatter');

/**
 * Specialized class for handling source-specific data population and image URL generation.
 * Manages the creation of source-specific data containers (CMC, CoinGecko, etc.) and 
 * handles image URL generation with appropriate fallback logic.
 * 
 * @class SourceDataPopulator
 */
class SourceDataPopulator {
    /**
     * Gets the appropriate image URL for a stablecoin.
     * Updated to work with new aggregated data structure. Prioritizes existing imageUrl,
     * then falls back to CoinMarketCap URLs if CMC ID is available, then Messari URLs.
     * 
     * @param {Object} hybrid - Hybrid stablecoin data object (aggregated data structure)
     * @param {string} [hybrid.imageUrl] - Direct image URL from aggregated data
     * @param {string} [hybrid.id] - CoinMarketCap ID for generating CMC image URL
     * @param {Object} [hybrid._messari] - Messari-specific data container
     * @param {Object} [hybrid._messari.profile.images] - Messari profile images
     * @param {string} [hybrid._messari.profile.images.logo] - Messari logo URL
     * @returns {string|null} Image URL or null if no image available
     * @memberof SourceDataPopulator
     */
    getCoinImageUrl(hybrid) {
        // First check for direct imageUrl from aggregated data structure
        if (hybrid.imageUrl && typeof hybrid.imageUrl === 'string') {
            return hybrid.imageUrl;
        }
        
        // Prefer Messari-style embedded logo if present
        if (hybrid._messari?.profile?.images?.logo) {
            return hybrid._messari.profile.images.logo;
        }

        // Fall back to legacy CMC ID-based URL generation only if ID is numeric
        if (hybrid.id && /^\d+$/.test(String(hybrid.id))) {
            return `https://s2.coinmarketcap.com/static/img/coins/64x64/${hybrid.id}.png`;
        }
        
        return null;
    }

    /**
     * Generates a descriptive text for a stablecoin based on its data sources and tags.
     * Creates a standardized description indicating the stablecoin's data sources and associated tags.
     * 
     * @param {Object} hybrid - Hybrid stablecoin data object
     * @param {string} [hybrid.name] - Stablecoin name
     * @param {Array} [hybrid.tags] - Array of tags associated with the stablecoin
     * @param {string} [hybrid.source] - Data source indicator ('hybrid', 'cmc-only', etc.)
     * @returns {string} Generated description text
     * @memberof SourceDataPopulator
     */
    generateDescription(hybrid) {
        const tags = hybrid.tags ? hybrid.tags.join(', ') : '';
        const source = hybrid.source === 'hybrid' ? 'CMC + Messari' : 
                       hybrid.source === 'cmc-only' ? 'CoinMarketCap' : 'Messari';
        return `${hybrid.name} is a stablecoin tracked by ${source}. ${tags ? `Tags: ${tags}` : ''}`.trim();
    }

    /**
     * Populates CoinMarketCap-specific data container with formatted values.
     * Creates a complete CMC data object with price, market cap, supply, and volume data
     * formatted consistently with other containers in the system.
     * Updated to work with new aggregated data structure.
     * 
     * @param {Object} hybrid - Hybrid stablecoin data object (aggregated data structure)
     * @returns {Object} Populated CMC container with formatted data
     * @memberof SourceDataPopulator
     */
    populateCMCContainer(hybrid) {
        const cmcData = hybrid._cmc || {};
        // Handle both legacy and new data structures
        const price = hybrid.marketData?.price ?? hybrid.price;
        const marketCap = hybrid.marketData?.marketCap ?? hybrid.market_cap;
        const totalSupply = hybrid.supplyData?.total ?? hybrid.total_supply;
        const circSupply = hybrid.supplyData?.circulating ?? hybrid.circulating_supply;
        const volume = hybrid.marketData?.volume24h ?? hybrid.volume_24h;
        
        return {
            price: price,
            circulating_mcap_s: DataFormatter.formatNumber(marketCap),
            total_supply_s: DataFormatter.formatNumber(totalSupply, false),
            circulating_supply_s: DataFormatter.formatNumber(circSupply, false),
            volume_s: DataFormatter.formatNumber(volume),
            desc: cmcData.description || null,
            platform: cmcData.platform || null
        };
    }

    /**
     * Populates CoinGecko-specific data container with formatted values.
     * Creates a complete CoinGecko data object with price, market cap, supply, and volume data
     * formatted consistently with other containers in the system.
     * Updated to work with new aggregated data structure.
     * 
     * @param {Object} hybrid - Hybrid stablecoin data object (aggregated data structure)  
     * @returns {Object} Populated CoinGecko container with formatted data
     * @memberof SourceDataPopulator
     */
    populateCoinGeckoContainer(hybrid) {
        const cgkoData = hybrid._cgko || {};
        // Handle both legacy and new data structures
        const price = hybrid.marketData?.price ?? hybrid.price;
        const marketCap = hybrid.marketData?.marketCap ?? hybrid.market_cap;
        const totalSupply = hybrid.supplyData?.total ?? hybrid.total_supply;
        const circSupply = hybrid.supplyData?.circulating ?? hybrid.circulating_supply;
        const volume = hybrid.marketData?.volume24h ?? hybrid.volume_24h;
        
        return {
            price: price,
            circulating_mcap_s: DataFormatter.formatNumber(marketCap),
            total_supply_s: DataFormatter.formatNumber(totalSupply, false),
            circulating_supply_s: DataFormatter.formatNumber(circSupply, false),
            volume_s: DataFormatter.formatNumber(volume),
            desc: cgkoData.description || null
        };
    }

    /**
     * Populates common data fields shared across different containers.
     * Creates standardized data structure with formatted values for main, msri, and scw containers.
     * Updated to work with new aggregated data structure.
     * 
     * @param {Object} hybrid - Hybrid stablecoin data object (aggregated data structure)
     * @returns {Object} Object containing main, msri, and scw formatted data containers
     * @memberof SourceDataPopulator
     */
    populateCommonContainers(hybrid) {
        // Handle both legacy and new data structures
        const price = hybrid.marketData?.price ?? hybrid.price;
        const marketCap = hybrid.marketData?.marketCap ?? hybrid.market_cap;
        const totalSupply = hybrid.supplyData?.total ?? hybrid.total_supply;
        const circSupply = hybrid.supplyData?.circulating ?? hybrid.circulating_supply;
        const volume = hybrid.marketData?.volume24h ?? hybrid.volume_24h;
        
        const main = {
            price: price,
            circulating_mcap: marketCap,
            circulating_mcap_s: DataFormatter.formatNumber(marketCap),
            volume_24h: volume,
            volume_s: DataFormatter.formatNumber(volume),
        };

        const msri = {
            price: price,
            circulating_mcap_s: DataFormatter.formatNumber(marketCap),
            total_supply_s: DataFormatter.formatNumber(totalSupply, false),
            circulating_supply_s: DataFormatter.formatNumber(circSupply, false),
            volume_s: DataFormatter.formatNumber(volume),
            desc: this.generateDescription(hybrid),
        };

        const scw = {
            price: price,
            circulating_mcap_s: DataFormatter.formatNumber(marketCap),
            total_supply_s: DataFormatter.formatNumber(totalSupply, false),
            circulating_supply_s: DataFormatter.formatNumber(circSupply, false),
            volume_s: DataFormatter.formatNumber(volume),
            circulating_supply: circSupply,
        };

        return { main, msri, scw };
    }

    /**
     * Validates if hybrid data object has required fields for processing.
     * 
     * @param {Object} hybrid - Hybrid stablecoin data object to validate
     * @returns {boolean} True if hybrid data is valid for processing
     * @memberof SourceDataPopulator
     */
    isValidHybridData(hybrid) {
        if (!hybrid || !(hybrid.name || hybrid.symbol)) return false;
        const price = (typeof hybrid?.marketData?.price === 'number')
            ? hybrid.marketData.price
            : hybrid.price;
        return typeof price === 'number';
    }

    /**
     * Gets all source-specific containers for a hybrid data object.
     * 
     * @param {Object} hybrid - Hybrid stablecoin data object
     * @returns {Object} Object containing all populated source containers
     * @memberof SourceDataPopulator
     */
    getAllSourceContainers(hybrid) {
        return {
            cmc: this.populateCMCContainer(hybrid),
            cgko: this.populateCoinGeckoContainer(hybrid),
            ...this.populateCommonContainers(hybrid)
        };
    }
}

module.exports = SourceDataPopulator;
