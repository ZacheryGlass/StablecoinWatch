/**
 * Data Transfer Object for defining the contract of view model output data.
 * Provides validation and documentation for the expected structure of data 
 * returned by the HybridTransformer for template consumption.
 * 
 * @class ViewModelDTO
 */
class ViewModelDTO {
    /**
     * Creates an instance of ViewModelDTO.
     * @param {Object} options - Configuration options for the view model
     * @param {Array} options.stablecoins - Array of processed stablecoin objects
     * @param {Object} options.metrics - Market metrics object
     * @param {Array} options.platform_data - Platform aggregation data
     * @memberof ViewModelDTO
     */
    constructor({ stablecoins = [], metrics = {}, platform_data = [] } = {}) {
        this.validateInputData({ stablecoins, metrics, platform_data });
        
        this.stablecoins = stablecoins;
        this.metrics = metrics;
        this.platform_data = platform_data;
        this.lastGenerated = Date.now();
    }

    /**
     * Validates the input data structure for the view model.
     * 
     * @param {Object} data - Data object to validate
     * @param {Array} data.stablecoins - Stablecoins array
     * @param {Object} data.metrics - Metrics object
     * @param {Array} data.platform_data - Platform data array
     * @throws {Error} When validation fails
     * @memberof ViewModelDTO
     */
    validateInputData({ stablecoins, metrics, platform_data }) {
        if (!Array.isArray(stablecoins)) {
            throw new Error('ViewModelDTO: stablecoins must be an array');
        }
        
        if (!metrics || typeof metrics !== 'object') {
            throw new Error('ViewModelDTO: metrics must be an object');
        }
        
        if (!Array.isArray(platform_data)) {
            throw new Error('ViewModelDTO: platform_data must be an array');
        }
    }

    /**
     * Gets a stablecoin by its URI/identifier.
     * 
     * @param {string} uri - The stablecoin URI to search for
     * @returns {Object|null} The matching stablecoin or null if not found
     * @memberof ViewModelDTO
     */
    getStablecoinByUri(uri) {
        return this.stablecoins.find(sc => sc.uri === uri) || null;
    }

    /**
     * Gets stablecoins by platform name.
     * 
     * @param {string} platformName - The platform name to filter by
     * @returns {Array} Array of stablecoins on the specified platform
     * @memberof ViewModelDTO
     */
    getStablecoinsByPlatform(platformName) {
        return this.stablecoins.filter(sc => 
            sc.platforms && sc.platforms.some(p => p.name === platformName)
        );
    }

    /**
     * Gets the top N stablecoins by market cap.
     * 
     * @param {number} [limit=10] - Number of top stablecoins to return
     * @returns {Array} Array of top stablecoins by market cap
     * @memberof ViewModelDTO
     */
    getTopStablecoins(limit = 10) {
        return this.stablecoins
            .filter(sc => sc.main && typeof sc.main.circulating_mcap === 'number')
            .sort((a, b) => (b.main.circulating_mcap || 0) - (a.main.circulating_mcap || 0))
            .slice(0, limit);
    }

    /**
     * Gets platform data sorted by market cap.
     * 
     * @returns {Array} Platform data sorted by total market cap descending
     * @memberof ViewModelDTO
     */
    getPlatformDataSorted() {
        return [...this.platform_data].sort((a, b) => (b.mcap_sum || 0) - (a.mcap_sum || 0));
    }

    /**
     * Gets summary statistics for the view model.
     * 
     * @returns {Object} Summary statistics object
     * @memberof ViewModelDTO
     */
    getSummaryStats() {
        const totalStablecoins = this.stablecoins.length;
        const totalPlatforms = this.platform_data.length;
        const validMarketCaps = this.stablecoins.filter(sc => 
            sc.main && typeof sc.main.circulating_mcap === 'number'
        ).length;
        
        return {
            totalStablecoins,
            totalPlatforms,
            validMarketCaps,
            dataCompleteness: totalStablecoins > 0 ? (validMarketCaps / totalStablecoins) : 0,
            lastGenerated: this.lastGenerated
        };
    }

    /**
     * Validates that the view model contains the required structure for templates.
     * 
     * @returns {Object} Validation result with success flag and any issues
     * @memberof ViewModelDTO
     */
    validateForTemplate() {
        const issues = [];
        
        // Check metrics structure
        if (!this.metrics.totalMCap_s && !this.metrics.totalMCap) {
            issues.push('Missing formatted total market cap in metrics');
        }
        
        if (!this.metrics.lastUpdated) {
            issues.push('Missing lastUpdated timestamp in metrics');
        }
        
        // Check stablecoin structure
        const invalidStablecoins = this.stablecoins.filter(sc => 
            !sc.name || !sc.symbol || !sc.main
        );
        
        if (invalidStablecoins.length > 0) {
            issues.push(`${invalidStablecoins.length} stablecoins missing required fields`);
        }
        
        // Check platform data structure
        const invalidPlatforms = this.platform_data.filter(pd => 
            !pd.name || typeof pd.mcap_sum !== 'number'
        );
        
        if (invalidPlatforms.length > 0) {
            issues.push(`${invalidPlatforms.length} platforms missing required fields`);
        }
        
        return {
            valid: issues.length === 0,
            issues
        };
    }

    /**
     * Converts the view model to a plain object for JSON serialization.
     * 
     * @returns {Object} Plain object representation
     * @memberof ViewModelDTO
     */
    toPlainObject() {
        return {
            stablecoins: this.stablecoins,
            metrics: this.metrics,
            platform_data: this.platform_data,
            lastGenerated: this.lastGenerated
        };
    }

    /**
     * Creates a ViewModelDTO from a plain object.
     * 
     * @param {Object} data - Plain object data
     * @returns {ViewModelDTO} New ViewModelDTO instance
     * @static
     * @memberof ViewModelDTO
     */
    static fromPlainObject(data) {
        return new ViewModelDTO(data);
    }

    /**
     * Creates an empty ViewModelDTO with default structure.
     * 
     * @returns {ViewModelDTO} Empty ViewModelDTO instance
     * @static
     * @memberof ViewModelDTO
     */
    static createEmpty() {
        return new ViewModelDTO({
            stablecoins: [],
            metrics: {
                totalMCap: 0,
                totalMCap_s: '$0',
                totalVolume: 0,
                totalVolume_s: '$0',
                lastUpdated: new Date().toISOString()
            },
            platform_data: []
        });
    }
}

module.exports = ViewModelDTO;