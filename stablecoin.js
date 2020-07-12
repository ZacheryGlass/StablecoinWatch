const util = require('./utils/cmn');
const Platform = require('./platform');
const eth = require('./utils/eth');
const omni = require('./utils/omni');

class Stablecoin {
    constructor(
        name = null,
        symbol = null,
        platforms = [new Platform()],
        desc = 'No description available.',
        mcap = null,
        volume = null,
        img_url = null
    ) {
        this.name = name;
        this.symbol = symbol;
        if (!Array.isArray(platforms)) {
            // passing in a single Platform object
            // make it an array for consistancy
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
    } // constructor

    async updatePlatformsSupply() {
        const PLATFORM_API = {
            Ethereum: { name: 'Ethereum', api: eth },
            Bitcoin: { name: 'Bitcoin', api: omni },
            // EOS: { name: 'EOS', api: null },
            // Tron: { name: 'Tron', api: null },
        };
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
    } // updatePlatformsSupply()
}

module.exports = Stablecoin;
