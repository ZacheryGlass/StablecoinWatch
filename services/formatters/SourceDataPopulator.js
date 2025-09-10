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
     * Prioritizes CoinMarketCap image URLs if CMC ID is available, falls back to Messari logo URLs.
     * 
     * @param {Object} hybrid - Hybrid stablecoin data object
     * @param {string} [hybrid.id] - CoinMarketCap ID for generating CMC image URL
     * @param {Object} [hybrid._messari] - Messari-specific data container
     * @param {Object} [hybrid._messari.profile.images] - Messari profile images
     * @param {string} [hybrid._messari.profile.images.logo] - Messari logo URL
     * @returns {string|null} Image URL or null if no image available
     * @memberof SourceDataPopulator
     */
    getCoinImageUrl(hybrid) {
        if (hybrid.id) {
            return `https://s2.coinmarketcap.com/static/img/coins/64x64/${hybrid.id}.png`;
        }
        if (hybrid._messari?.profile?.images?.logo) {
            return hybrid._messari.profile.images.logo;
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
     * 
     * @param {Object} hybrid - Hybrid stablecoin data object
     * @returns {Object} Populated CMC container with formatted data
     * @memberof SourceDataPopulator
     */
    populateCMCContainer(hybrid) {
        const cmcData = hybrid._cmc || {};
        return {
            price: hybrid.price,
            circulating_mcap_s: DataFormatter.formatNumber(hybrid.market_cap),
            total_supply_s: DataFormatter.formatNumber(hybrid.total_supply, false),
            circulating_supply_s: DataFormatter.formatNumber(hybrid.circulating_supply, false),
            volume_s: DataFormatter.formatNumber(hybrid.volume_24h),
            desc: cmcData.description || null,
            platform: cmcData.platform || null
        };
    }

    /**
     * Populates CoinGecko-specific data container with formatted values.
     * Creates a complete CoinGecko data object with price, market cap, supply, and volume data
     * formatted consistently with other containers in the system.
     * 
     * @param {Object} hybrid - Hybrid stablecoin data object  
     * @returns {Object} Populated CoinGecko container with formatted data
     * @memberof SourceDataPopulator
     */
    populateCoinGeckoContainer(hybrid) {
        const cgkoData = hybrid._cgko || {};
        return {
            price: hybrid.price,
            circulating_mcap_s: DataFormatter.formatNumber(hybrid.market_cap),
            total_supply_s: DataFormatter.formatNumber(hybrid.total_supply, false),
            circulating_supply_s: DataFormatter.formatNumber(hybrid.circulating_supply, false),
            volume_s: DataFormatter.formatNumber(hybrid.volume_24h),
            desc: cgkoData.description || null
        };
    }

    /**
     * Populates common data fields shared across different containers.
     * Creates standardized data structure with formatted values for main, msri, and scw containers.
     * 
     * @param {Object} hybrid - Hybrid stablecoin data object
     * @returns {Object} Object containing main, msri, and scw formatted data containers
     * @memberof SourceDataPopulator
     */
    populateCommonContainers(hybrid) {
        const main = {
            price: hybrid.price,
            circulating_mcap: hybrid.market_cap,
            circulating_mcap_s: DataFormatter.formatNumber(hybrid.market_cap),
            volume_24h: hybrid.volume_24h,
            volume_s: DataFormatter.formatNumber(hybrid.volume_24h),
        };

        const msri = {
            price: hybrid.price,
            circulating_mcap_s: DataFormatter.formatNumber(hybrid.market_cap),
            total_supply_s: DataFormatter.formatNumber(hybrid.total_supply, false),
            circulating_supply_s: DataFormatter.formatNumber(hybrid.circulating_supply, false),
            volume_s: DataFormatter.formatNumber(hybrid.volume_24h),
            desc: this.generateDescription(hybrid),
        };

        const scw = {
            price: hybrid.price,
            circulating_mcap_s: DataFormatter.formatNumber(hybrid.market_cap),
            total_supply_s: DataFormatter.formatNumber(hybrid.total_supply, false),
            circulating_supply_s: DataFormatter.formatNumber(hybrid.circulating_supply, false),
            volume_s: DataFormatter.formatNumber(hybrid.volume_24h),
            circulating_supply: hybrid.circulating_supply,
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
        return hybrid && 
               (hybrid.name || hybrid.symbol) && 
               typeof hybrid.price === 'number';
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