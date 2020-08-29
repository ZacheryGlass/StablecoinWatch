const util = require('../util');
const Platform = require('./platform');

const PLATFORM_API = {
    Ethereum: require('../apis/platforms/eth'),
    Bitcoin: require('../apis/platforms/omni'),
    Tron: require('../apis/platforms/tron'),
    'BNB Chain': require('../apis/platforms/bnb'),
    'Bitcoin Cash': require('../apis/platforms/bch'),
    EOS: require('../apis/platforms/eos'),
    Algorand: require('../apis/platforms/algo'),
    'Bitcoin (Liquid)': require('../apis/platforms/liquid'),
};

class Stablecoin {
    /*---------------------------------------------------------
    Function:
            constructor
    Description:
            Creates a blank Stablecoin object.
    ---------------------------------------------------------*/
    constructor() {
        /*----------------------------------------------------
        basic properties
        ----------------------------------------------------*/
        this.name = '';
        this.symbol = '';
        this.platforms = [];
        /*----------------------------------------------------
        coin metrics per-data source
        ----------------------------------------------------*/
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

        /*----------------------------------------------------
        set main price source
        ----------------------------------------------------*/
        this.main.price = Number(this.cmc.price ? this.cmc.price : this.msri.price ? this.msri.price : this.scw.price);

        /*----------------------------------------------------
        set main volume source
        ----------------------------------------------------*/
        this.main.volume = Number(this.cmc.volume ? this.cmc.volume : this.msri.volume);

        /*----------------------------------------------------
        set main Total Supply source, used by updatPlatformsSupply()
        ----------------------------------------------------*/
        this.main.total_supply = Number(this.cmc.total_supply ? this.cmc.total_supply : this.msri.total_supply);

        /*----------------------------------------------------
        set supply data
        ----------------------------------------------------*/
        await this.updatePlatformsSupply();

        /*----------------------------------------------------
        set scw total supply
        ----------------------------------------------------*/
        this.scw.total_supply = 0;
        this.platforms.forEach((p) => {
            if (p && p.total_supply) this.scw.total_supply += p.total_supply;
        });

        /*----------------------------------------------------
        set scw market cap
        ----------------------------------------------------*/
        this.scw.mcap = this.main.price * this.scw.total_supply;

        /*----------------------------------------------------
        always use scw total supply as main
        ----------------------------------------------------*/
        this.main.total_supply = this.scw.total_supply;

        /*----------------------------------------------------
        set main Market Cap source
        ----------------------------------------------------*/
        if (this.scw.mcap) this.main.mcap = this.scw.mcap;
        else if (this.cmc.mcap) this.main.mcap = this.cmc.mcap;
        else if (this.msri.mcap) this.main.mcap = this.msri.mcap;
        this.main.mcap = Number(this.main.mcap);

        if (this.cmc.mcap > this.main.mcap) {
            console.warn('CMC Market Cap is larger than main');
            this.main.mcap = this.cmc.mcap;
        }

        /*----------------------------------------------------
        set strings
        ----------------------------------------------------*/
        this.updateStrings();

        return this;
    } // updateDerivedMetrics

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
        if (!this.platforms || this.platforms.length == 0) {
            console.warn('No platforms for', this.name);
            return;
        }

        await Promise.all(
            this.platforms.map(async (platform) => {
                try {
                    if (!PLATFORM_API[platform.name]) {
                        throw `No API available for ${platform.name} platform.`;
                    } else if (!PLATFORM_API[platform.name].getTokenTotalSupply) {
                        throw `API for ${platform.name} platform does not support function 'getTokenTotalSupply()'.`;
                    } else {
                        platform.total_supply = await PLATFORM_API[platform.name].getTokenTotalSupply(
                            platform.contract_address
                        );
                    }
                } catch (e) {
                    if (this.platforms.length == 1) {
                        console.warn(
                            `Using Total Supply as platform supply for ${this.name} on ${platform.name} due to API error: ${e}`
                        );
                        this.platforms[0].total_supply = this.main.total_supply;
                    } else {
                        console.error(`Could not get ${this.name} supply on ${platform.name}: ${e}`);
                    }
                } //try-catch
            })
        ); // await Promise.all
        /*----------------------------------------------------
        sort platforms by supply
        ----------------------------------------------------*/
        this.platforms.sort(util.sortObjByNumProperty('total_supply'));
    } // updatePlatformsSupply()
}

module.exports = Stablecoin;