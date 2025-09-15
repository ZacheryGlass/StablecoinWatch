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
    /** @type {string|null} The asset category classification (e.g., 'Stablecoin' or 'Tokenized Asset') */
    this.assetCategory = null;
        /** @type {Array<Platform>} Array of platforms where this stablecoin exists */
        this.platforms = [];
        /** @type {string|null} The asset this stablecoin is pegged to (e.g., USD, EUR, Gold) */
        this.pegged_asset = null;
        /** @type {Object} Main market data (price, market cap, volume, etc.) */
        this.main = {};
        /** @type {Object} Messari-specific data */
        this.msri = {};
        /** @type {Object} StablecoinWatch-specific calculated data */
        this.scw = {};
        /** @type {Object} CoinMarketCap-specific data */
        this.cmc = {};
        /** @type {Object} CoinGecko-specific data */
        this.cgko = {};
        
        /** @type {Object} Enhanced cross-chain supply breakdown */
        this.chainSupplyBreakdown = {};
        /** @type {number|null} Total supply across all chains */
        this.totalCrossChainSupply = null;
        /** @type {string|null} Chain with highest supply percentage */
        this.dominantChain = null;
        /** @type {Object} DeFiLlama-specific raw data for platform distribution */
        this.defillamaData = {};
    }
}

/*---------------------------------------------------------
    EXPORTS
---------------------------------------------------------*/
module.exports = Stablecoin;
