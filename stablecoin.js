const util = require('./utils/cmn');
const etherscan = require('./utils/etherscan');
const Platform = require('./platform');

class MessariCoin {
    constructor(
        name = null,
        symbol = null,
        platforms = [new Platform()],
        desc = 'No description available.',
        mcap = null,
        volume = null
    ) {
        this.name = name;
        this.symbol = symbol;
        if (!Array.isArray(platforms)) {
            this.platforms = [platforms];
        } else {
            this.platforms = platforms;
        }
        this.desc = util.stripHTML(desc);
        this.mcap = mcap;
        this.mcap_s = util.toDollarString(mcap);
        this.volume = volume;
        this.volume_s = util.toDollarString(volume);
    }
}

class CMCCoin {
    constructor(
        name = null,
        symbol = null,
        platforms = [new Platform()],
        desc = 'No description available.',
        mcap = null,
        volume = null,
        img_url = null,
        circulating_supply = null,
        total_supply = null
    ) {
        this.name = name;
        this.symbol = symbol;
        if (!Array.isArray(platforms)) {
            this.platforms = [platforms];
        } else {
            this.platforms = platforms;
        }
        this.desc = util.stripHTML(desc);
        this.mcap = mcap;
        this.mcap_s = util.toDollarString(mcap);
        this.volume = volume;
        this.volume_s = util.toDollarString(volume);
        this.img_url = img_url;
        this.circulating_supply = circulating_supply;
        this.total_supply = total_supply;
    }
}

class Stablecoin {
    constructor(cmcData = null, msriData = null) {
        this.cmcData = cmcData;
        this.msriData = msriData;
        this.name = msriData ? msriData.name : cmcData.name;
        this.symbol = msriData ? msriData.symbol : cmcData.symbol;
    }
}

module.exports.MessariCoin = MessariCoin;
module.exports.CMCCoin = CMCCoin;
module.exports.Stablecoin = Stablecoin;
