const util = require('./utils/cmn');
const Platform = require('./platform');
const eth = require('./utils/eth');
const omni = require('./utils/omni');
const tron = require('./utils/tron');
const bnb = require('./utils/bnb');
const slp = require('./utils/bch');

class Stablecoin {
    constructor(
        name = null,
        symbol = null,
        peg = null,
        platforms = [],
        desc = null,
        mcap = null,
        volume = null,
        img_url = null,
        price = null,
        cmc_total_supply = null,
        cmc_circulating_supply = null
    ) {
        this.name = name;
        this.symbol = symbol;
        this.peg = peg;
        this.platforms = platforms;
        this.desc = util.stripHTML(desc);
        this.mcap = mcap;
        this.mcap_s = util.toDollarString(mcap);
        this.volume = volume;
        this.volume_s = util.toDollarString(volume);
        this.img_url = img_url;
        this.price = price;
        this.cmc_total_supply = cmc_total_supply;
        this.cmc_circulating_supply = cmc_circulating_supply;
    } // constructor

    async updatePlatformsSupply() {
        let PLATFORM_API = {};
        PLATFORM_API['Ethereum'] = eth;
        PLATFORM_API['Bitcoin'] = omni;
        PLATFORM_API['Tron'] = tron;
        PLATFORM_API['BNB Chain'] = bnb;
        PLATFORM_API['Bitcoin Cash (SLP)'] = slp;
        // PLATFORM_API['EOS'] = null;

        if (this.platforms.length == 1) {
            this.platforms[0].supply = this.cmc_total_supply;
        } else {
            await Promise.all(
                this.platforms.map(async (platform) => {
                    try {
                        platform.supply = await PLATFORM_API[
                            platform.name
                        ].getTokenSupply(platform.contract_address);
                    } catch {
                        /* intentionally empty */
                        // consider a throw, or console log here
                    }
                })
            ); // await Promise.all
        }

        this.platforms = this.platforms.sort(function (a, b) {
            return b.supply - a.supply;
        });
    } // updatePlatformsSupply()
}

module.exports = Stablecoin;
