class Platform {
    constructor(
        name = '',
        contract_address = '',
        exclude_addresses = [],
        total_supply = null,
        circulating_supply = null
    ) {
        this.name = name;
        this.contract_address = contract_address;
        this.exclude_addresses = exclude_addresses;
        this.total_supply = total_supply;
        this.circulating_supply = circulating_supply;
    }
}

module.exports = Platform;
