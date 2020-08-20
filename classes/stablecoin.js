const util = require('../util');
const Platform = require('./platform');
const eth = require('../apis/platforms/eth');
const omni = require('../apis/platforms/omni');
const tron = require('../apis/platforms/tron');
const bnb = require('../apis/platforms/bnb');
const slp = require('../apis/platforms/bch');
const algo = require('../apis/platforms/algo');
const eos = require('../apis/platforms/eos');
const liquid = require('../apis/platforms/liquid');

class Coin {
    /*---------------------------------------------------------
    Function:
            constructor
    Description:
            Creates a blank Coin object.
    ------------------------------------------------*/
    constructor() {
        /* basic properties */
        this.name = null;
        this.symbol = null;
        this.platforms = [];
        /* coin metrics per-data source */
        this.cmc = {};
        this.msri = {};
        this.lcl = {};
        this.main = {};
    } // constructor()

    /*---------------------------------------------------------
    Function:
            updateStrings
    Description:
            Build dollar formated string for coin metrics
    ------------------------------------------------*/
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

        this.lcl.mcap_s = util.toDollarString(this.lcl.mcap);
        this.lcl.total_supply_s = util.toDollarString(this.lcl.total_supply);

        this.main.mcap_s = util.toDollarString(this.main.mcap);
        this.main.volume_s = util.toDollarString(this.main.volume);
    } // updateStrings()

    /*---------------------------------------------------------
    Function:
            setMainDataSrc
    Description:
            Set the values to be used as the main
            source of data for each metric
    ------------------------------------------------*/
    setMainDataSrc() {
        this.main = {};

        // set Market Cap and Total Supply
        if (this.cmc.total_supply && this.cmc.mcap) {
            this.main.total_supply = this.cmc.total_supply;
            this.main.mcap = this.cmc.mcap;
        } else if (this.msri.total_supply && this.msri.mcap) {
            this.main.total_supply = this.msri.total_supply;
            this.main.mcap = this.msri.mcap;
        } else if (this.lcl.total_supply) {
            this.main.total_supply = this.lcl.total_supply;
            if (this.lcl.mcap) this.main.mcap = this.lcl.mcap;
            else if (this.cmc.mcap) this.main.mcap = this.cmc.mcap;
            else if (this.msri.mcap) this.main.mcap = this.msri.mcap;
        }
        this.main.total_supply = Number(this.main.total_supply);
        this.main.mcap = Number(this.main.mcap);

        // set Price
        this.main.price = Number(this.cmc.price ? this.cmc.price : this.msri.price ? this.msri.price : this.lcl.price);

        // set Price
        this.main.volume = Number(this.cmc.volume ? this.cmc.volume : this.msri.volume);
    } // setMainDataSrc()

    /*---------------------------------------------------------
    Function:
            updateDerivedMetrics
    Description:
            Update metric that require computation
            on prior set metrics
    Note:
            Some metrics for a Coin are calculated from
            API return values. Derived metrics are
            computed from these base-metrics. 
    ---------------------------------------------------------*/
    async updateDerivedMetrics() {
        this.setMainDataSrc();
        await this.updatePlatformsSupply();
        this.setMainDataSrc();
        this.updateStrings();
        return;
    }

    /*---------------------------------------------------------
    Function:
            updatePlatformsSupply
    Description:
            Update the total-supply on this coin for
            each platform this coin is issued on.
    ------------------------------------------------*/
    async updatePlatformsSupply() {
        if (!this.name) return;
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

        if (this.platforms.length == 1) {
            this.platforms[0].supply = this.main.total_supply;
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
                        console.error(`Could not get ${this.name} supply on ${platform.name}. Assuming zero: ${e}`);
                        platform.supply = 0;
                    } //catch
                })
            ); // await Promise.all
        } // if-else

        // sort platforms
        this.platforms = this.platforms.sort((a, b) => b.supply - a.supply);

        // update lcl.total_supply
        this.lcl.total_supply = 0;
        this.platforms.forEach((p) => {
            if (p && p.supply) this.lcl.total_supply += p.supply;
        });

        this.lcl.mcap = this.main.price * this.lcl.total_supply;
    } // updatePlatformsSupply()
}

module.exports = Coin;
