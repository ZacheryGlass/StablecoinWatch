/**
 * Represents a blockchain platform where a stablecoin exists
 */
class Platform {
    /**
     * Creates a new Platform instance
     * @param {string} [name=''] - The name of the blockchain platform
     * @param {string} [contract_address=''] - The contract address on this platform
     * @param {Array<string>} [exclude_addresses=[]] - Addresses to exclude from calculations
     * @param {number|null} [total_supply=null] - Total supply on this platform
     * @param {number|null} [circulating_supply=null] - Circulating supply on this platform
     * @param {number|null} [supply_percentage=null] - Percentage of total supply on this platform
     * @param {Object} [historical_data={}] - Historical supply data (prev day/week/month)
     */
    constructor(
        name = '',
        contract_address = '',
        exclude_addresses = [],
        total_supply = null,
        circulating_supply = null,
        supply_percentage = null,
        historical_data = {}
    ) {
        /** @type {string} The name of the blockchain platform */
        this.name = name;
        /** @type {string} The contract address on this platform */
        this.contract_address = contract_address;
        /** @type {Array<string>} Addresses to exclude from calculations */
        this.exclude_addresses = exclude_addresses;
        /** @type {number|null} Total supply on this platform */
        this.total_supply = total_supply;
        /** @type {number|null} Circulating supply on this platform */
        this.circulating_supply = circulating_supply;
        /** @type {number|null} Percentage of total supply on this platform */
        this.supply_percentage = supply_percentage;
        /** @type {Object} Historical supply data with prev day/week/month values */
        this.historical_data = historical_data;
    }
}

module.exports = Platform;
