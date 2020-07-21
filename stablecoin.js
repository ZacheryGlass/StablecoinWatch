const util = require('./utils/cmn');
const Platform = require('./platform');
const eth = require('./utils/eth');
const omni = require('./utils/omni');

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
        price = null
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
    } // constructor

    async updatePlatformsSupply() {
        if (this.platforms.length == 0) {
            console.log(this);
            console.log(typeof this.platforms);
        }
        const PLATFORM_API = {
            Ethereum: { name: 'Ethereum', api: eth },
            Bitcoin: { name: 'Bitcoin', api: omni },
            // EOS: { name: 'EOS', api: null },
            // Tron: { name: 'Tron', api: null },
        };
        // console.log(this.platforms);
        await Promise.all(
            this.platforms.map(async (platform) => {
                try {
                    platform.supply = await PLATFORM_API[
                        platform.name
                    ].api.getTokenSupply(platform.contract_address);
                } catch {
                    /* intentionally empty */
                    // consider a throw, or console log here
                }
            })
        );

        this.platforms = this.platforms.sort(function (a, b) {
            return b.supply - a.supply;
        });
    } // updatePlatformsSupply()
}

module.exports = Stablecoin;
