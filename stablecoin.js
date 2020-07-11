const util = require('./utils/cmn');
const Platform = require('./platform');

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
    }
}

module.exports = Stablecoin;
