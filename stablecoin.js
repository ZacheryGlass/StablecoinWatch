const util = require('./utils/cmn')

class Stablecoin {
    constructor(
        name = null,
        symbol = null,
        platform = { name: null, contract_address: null },
        desc = null,
        mcap = null,
        volume = null,
        chain_supply = {},
        img_url = null,
    ) {
        this.name = name;
        this.symbol = symbol;
        this.platform = platform;
        this.desc = desc;
        this.mcap = mcap;
        this.mcap_s = util.toDollarString(mcap);
        this.volume = volume;
        this.volume_s = util.toDollarString(volume);
        this.chain_supply = chain_supply;
        this.img_url = img_url
    }
}

module.exports = Stablecoin;
