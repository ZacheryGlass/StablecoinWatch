/**
 * Data Transfer Object for defining the contract of hybrid stablecoin input data.
 * Provides validation and documentation for the expected structure of data 
 * passed to the HybridTransformer for processing.
 * 
 * @class HybridStablecoinDTO
 */
class HybridStablecoinDTO {
    /**
     * Creates an instance of HybridStablecoinDTO.
     * @param {Object} data - Raw hybrid stablecoin data object
     * @memberof HybridStablecoinDTO
     */
    constructor(data = {}) {
        this.validateInputData(data);
        
        // Core identification fields
        this.id = data.id || null;
        this.name = data.name || '';
        this.symbol = data.symbol || '';
        this.slug = data.slug || data.symbol || '';
        
        // Market data
        this.price = data.price || null;
        this.market_cap = data.market_cap || null;
        this.volume_24h = data.volume_24h || null;
        this.percent_change_24h = data.percent_change_24h || null;
        this.cmc_rank = data.cmc_rank || null;
        
        // Supply data
        this.circulating_supply = data.circulating_supply || null;
        this.total_supply = data.total_supply || null;
        
        // Platform/network data
        this.networkBreakdown = data.networkBreakdown || [];
        this.tags = data.tags || [];
        
        // Source metadata
        this.source = data.source || 'unknown';
        
        // Source-specific data containers
        this._cmc = data._cmc || null;
        this._messari = data._messari || null;
        this._cgko = data._cgko || null;
        this._defillama = data._defillama || null;
    }

    /**
     * Validates the input data structure and required fields.
     * Throws error if critical validation fails.
     * 
     * @param {Object} data - Data object to validate
     * @throws {Error} When validation fails for critical fields
     * @memberof HybridStablecoinDTO
     */
    validateInputData(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('HybridStablecoinDTO: Input data must be an object');
        }
        
        if (!data.name && !data.symbol) {
            throw new Error('HybridStablecoinDTO: Either name or symbol must be provided');
        }
        
        if (data.price !== null && data.price !== undefined && typeof data.price !== 'number') {
            throw new Error('HybridStablecoinDTO: Price must be a number or null');
        }
    }

    /**
     * Checks if the DTO contains valid market data.
     * 
     * @returns {boolean} True if market data is present and valid
     * @memberof HybridStablecoinDTO
     */
    hasValidMarketData() {
        return typeof this.price === 'number' && 
               typeof this.market_cap === 'number' &&
               this.price > 0 && 
               this.market_cap > 0;
    }

    /**
     * Checks if the DTO contains valid supply data.
     * 
     * @returns {boolean} True if supply data is present and valid
     * @memberof HybridStablecoinDTO
     */
    hasValidSupplyData() {
        return typeof this.circulating_supply === 'number' && this.circulating_supply > 0;
    }

    /**
     * Checks if the DTO contains platform breakdown data.
     * 
     * @returns {boolean} True if network breakdown data is available
     * @memberof HybridStablecoinDTO
     */
    hasPlatformData() {
        return Array.isArray(this.networkBreakdown) && this.networkBreakdown.length > 0;
    }

    /**
     * Gets the primary identifier for the stablecoin.
     * 
     * @returns {string} Primary identifier (slug, symbol, or name)
     * @memberof HybridStablecoinDTO
     */
    getPrimaryId() {
        return this.slug || this.symbol || this.name || 'unknown';
    }

    /**
     * Gets all available source identifiers for this stablecoin.
     * 
     * @returns {Array<string>} Array of source identifiers
     * @memberof HybridStablecoinDTO
     */
    getAvailableSources() {
        const sources = [];
        if (this._cmc) sources.push('cmc');
        if (this._messari) sources.push('messari');
        if (this._cgko) sources.push('coingecko');
        if (this._defillama) sources.push('defillama');
        return sources;
    }

    /**
     * Converts the DTO back to a plain object.
     * 
     * @returns {Object} Plain object representation of the DTO
     * @memberof HybridStablecoinDTO
     */
    toPlainObject() {
        return {
            id: this.id,
            name: this.name,
            symbol: this.symbol,
            slug: this.slug,
            price: this.price,
            market_cap: this.market_cap,
            volume_24h: this.volume_24h,
            percent_change_24h: this.percent_change_24h,
            cmc_rank: this.cmc_rank,
            circulating_supply: this.circulating_supply,
            total_supply: this.total_supply,
            networkBreakdown: this.networkBreakdown,
            tags: this.tags,
            source: this.source,
            _cmc: this._cmc,
            _messari: this._messari,
            _cgko: this._cgko,
            _defillama: this._defillama
        };
    }

    /**
     * Creates a HybridStablecoinDTO from a plain object with validation.
     * 
     * @param {Object} data - Plain object data
     * @returns {HybridStablecoinDTO} New DTO instance
     * @static
     * @memberof HybridStablecoinDTO
     */
    static fromPlainObject(data) {
        return new HybridStablecoinDTO(data);
    }

    /**
     * Creates DTOs from an array of plain objects.
     * 
     * @param {Array<Object>} dataArray - Array of plain objects
     * @returns {Array<HybridStablecoinDTO>} Array of DTO instances
     * @static
     * @memberof HybridStablecoinDTO
     */
    static fromArray(dataArray) {
        if (!Array.isArray(dataArray)) {
            throw new Error('Input must be an array');
        }
        return dataArray.map(data => new HybridStablecoinDTO(data));
    }
}

module.exports = HybridStablecoinDTO;