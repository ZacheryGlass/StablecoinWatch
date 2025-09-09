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
     */
    constructor(
        name = '',
        contract_address = '',
        exclude_addresses = [],
        total_supply = null,
        circulating_supply = null
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
    }
}

module.exports = Platform;
