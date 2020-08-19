class Platform {
    constructor(name = '', contract_address = '', supply = 0) {
        this.name = name;
        this.contract_address = contract_address;
        this.supply = supply;
    }
}

module.exports = Platform;
