class Platform {
    constructor(name = null, contract_address = null, supply = 0) {
        this.name = name;
        this.contract_address = contract_address;
        this.supply = supply;
    }
}

module.exports = Platform;
