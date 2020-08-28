class Platform {
    constructor(name = '', contract_address = '', total_supply = 0) {
        this.name = name;
        this.contract_address = contract_address;
        this.total_supply = total_supply;
    }
}

module.exports = Platform;
