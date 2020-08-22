const util = require('./util');
const Platform = require('./platform');
const eth = require('./api/eth');
const omni = require('./api/omni');
const tron = require('./api/tron');
const bnb = require('./api/bnb');
const slp = require('./api/bch');
const algo = require('./api/algo');
const eos = require('./api/eos');
const liquid = require('./api/liquid');

class Stablecoin {
    /*---------------------------------------------------------
    Function:
            constructor
    Description:
            Creates a blank Stablecoin object.
    ---------------------------------------------------------*/
    constructor() {
        /* basic properties */
        this.name = '';
        this.symbol = '';
        this.platforms = [];
        /* coin metrics per-data source */
        this.cmc = {};
        this.msri = {};
        this.scw = {};
        this.main = {};
    } // constructor()

    /*---------------------------------------------------------
    Function:
            updateStrings
    Description:
            Build dollar formated string for coin metrics
    ---------------------------------------------------------*/
    async updateStrings() {
        this.uri = this.symbol;

        this.cmc.mcap_s = util.toDollarString(this.cmc.mcap);
        this.cmc.total_supply_s = util.toDollarString(this.cmc.total_supply);
        this.cmc.volume_s = util.toDollarString(this.cmc.volume);
        this.cmc.circulating_supply_s = util.toDollarString(this.cmc.circulating_supply);

        this.msri.mcap_s = util.toDollarString(this.msri.mcap);
        this.msri.total_supply_s = util.toDollarString(this.cmc.total_supply);
        this.msri.volume_s = util.toDollarString(this.msri.volume);
        this.msri.circulating_supply_s = util.toDollarString(this.msri.circulating_supply);

        this.scw.mcap_s = util.toDollarString(this.scw.mcap);
        this.scw.total_supply_s = util.toDollarString(this.scw.total_supply);

        this.main.mcap_s = util.toDollarString(this.main.mcap);
        this.main.volume_s = util.toDollarString(this.main.volume);
    } // updateStrings()

    /*---------------------------------------------------------
    Function:
            updateDerivedMetrics
    Description:
            Update metric that require computation
            on prior set metrics
    Note:
            Many metrics for a Stablecoin are step from
            API return values. Derived metrics are
            computed from these base-metrics. 
    ---------------------------------------------------------*/
    async updateDerivedMetrics() {
        this.main = {};

        // set main price source
        this.main.price = Number(this.cmc.price ? this.cmc.price : this.msri.price ? this.msri.price : this.scw.price);

        // set main volume source
        this.main.volume = Number(this.cmc.volume ? this.cmc.volume : this.msri.volume);

        // set main Total Supply source, used by updatPlatformsSupply()
        this.main.total_supply = Number(this.cmc.total_supply ? this.cmc.total_supply : this.msri.total_supply);

        // set supply data
        await this.updatePlatformsSupply();

        // set scw total supply
        this.scw.total_supply = 0;
        this.platforms.forEach((p) => {
            if (p && p.supply) this.scw.total_supply += p.supply;
        });

        // set scw market cap
        this.scw.mcap = this.main.price * this.scw.total_supply;

        // always use scw total supply as main
        this.main.total_supply = this.scw.total_supply;

        // set main Market Cap source
        if (this.scw.mcap) this.main.mcap = this.scw.mcap;
        else if (this.cmc.mcap) this.main.mcap = this.cmc.mcap;
        else if (this.msri.mcap) this.main.mcap = this.msri.mcap;
        this.main.mcap = Number(this.main.mcap);

        if (this.cmc.mcap > this.main.mcap) {
            console.warn('CMC Market Cap is larger than main');
            this.main.mcap = this.cmc.mcap;
        }

        // set strings
        this.updateStrings();
    }

    /*---------------------------------------------------------
    Function:
            updatePlatformsSupply
    Description:
            Update the total-supply on this coin for
            each platform this coin is issued on.
    Note:
            Main price and supply must be set before calling
            this function.
    ---------------------------------------------------------*/
    async updatePlatformsSupply() {
        // if (!this.name) return;
        if (!this.platforms || this.platforms.length == 0) {
            console.warn('No platforms for', this.name);
            return;
        }
        let PLATFORM_API = {};
        PLATFORM_API['Ethereum'] = eth;
        PLATFORM_API['Bitcoin'] = omni;
        PLATFORM_API['Tron'] = tron;
        PLATFORM_API['BNB Chain'] = bnb;
        PLATFORM_API['Bitcoin Cash'] = slp;
        PLATFORM_API['EOS'] = eos;
        PLATFORM_API['Algorand'] = algo;
        PLATFORM_API['Bitcoin (Liquid)'] = liquid;

        // if there's only 1 platform and we have the total supply
        // from another source just use that
        if (this.platforms.length == 1 && this.main.total_supply) {
            this.platforms[0].supply = this.main.total_supply;
            this.scw.total_supply = this.main.total_supply;
        } else {
            await Promise.all(
                this.platforms.map(async (platform) => {
                    try {
                        if (!PLATFORM_API[platform.name]) {
                            throw `No API available for ${platform.name} platform.`;
                        } else if (!PLATFORM_API[platform.name].getTokenSupply) {
                            throw `API for ${platform.name} platform does not support function 'getTokenSupply()'.`;
                        } else {
                            platform.supply = await PLATFORM_API[platform.name].getTokenSupply(
                                platform.contract_address
                            );
                        }
                    } catch (e) {
                        if (this.platforms.length == 1) {
                            console.warn(
                                `Using Total Supply as platform supply for ${this.name} on ${platform.name} due to API error: ${e}`
                            );
                            this.platforms[0].supply = this.main.total_supply;
                        } else {
                            console.error(`Could not get ${this.name} supply on ${platform.name}: ${e}`);
                        }
                    } //catch
                })
            ); // await Promise.all

            // sort platforms by supply
            this.platforms.sort((a, b) => b.supply - a.supply);
        } // if else
    } // updatePlatformsSupply()
}

module.exports = Stablecoin;
