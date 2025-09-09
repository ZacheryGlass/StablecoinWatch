/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
const Platform = require('./platform');

/**
 * Represents a stablecoin with market data and platform information
 */
class Stablecoin {
    /**
     * Creates a blank Stablecoin object
     */
    constructor() {
        /** @type {string} The name of the stablecoin */
        this.name = '';
        /** @type {string} The symbol/ticker of the stablecoin */
        this.symbol = '';
        /** @type {string} The URI/identifier for the stablecoin */
        this.uri = '';
        /** @type {string|null} The URL to the stablecoin's logo image */
        this.img_url = null;
        /** @type {Array<Platform>} Array of platforms where this stablecoin exists */
        this.platforms = [];
        /** @type {Object} Main market data (price, market cap, volume, etc.) */
        this.main = {};
        /** @type {Object} Messari-specific data */
        this.msri = {};
        /** @type {Object} StablecoinWatch-specific calculated data */
        this.scw = {};
    }
}

/*---------------------------------------------------------
    EXPORTS
---------------------------------------------------------*/
module.exports = Stablecoin;
