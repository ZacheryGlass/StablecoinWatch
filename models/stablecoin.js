/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
const util = require('../app/util');
const Platform = require('./platform');
const PInterface = require('../interface/platform');

/*---------------------------------------------------------
    MODULE CONSTANTS
---------------------------------------------------------*/
const PLATFORM_API = {
    Ethereum: new PInterface.Ethereum(),
    Bitcoin: new PInterface.Bitcoin(),
    Tron: new PInterface.Tron(),
    'BNB Chain': new PInterface.BNB(),
    'Bitcoin Cash': new PInterface.BitcoinCash(),
    EOS: new PInterface.EOS(),
    Algorand: new PInterface.Algorand(),
    'Bitcoin (Liquid)': new PInterface.Liquid(),
    Qtum: new PInterface.Qtum(),
};

/*---------------------------------------------------------
    CLASS
---------------------------------------------------------*/
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

        this.cmc.total_mcap_s           = util.toDollarString(this.cmc.total_mcap);
        this.cmc.circulating_mcap_s     = util.toDollarString(this.cmc.circulating_mcap);
        this.cmc.total_supply_s         = util.toDollarString(this.cmc.total_supply);
        this.cmc.circulating_supply_s   = util.toDollarString(this.cmc.circulating_supply);
        this.cmc.volume_s               = util.toDollarString(this.cmc.volume);

        this.msri.total_mcap_s          = util.toDollarString(this.msri.total_mcap);
        this.msri.circulating_mcap_s    = util.toDollarString(this.msri.circulating_mcap);
        this.msri.total_supply_s        = util.toDollarString(this.msri.total_supply);
        this.msri.circulating_supply_s  = util.toDollarString(this.msri.circulating_supply);
        this.msri.volume_s              = util.toDollarString(this.msri.volume);

        this.scw.total_mcap_s           = util.toDollarString(this.scw.total_mcap);
        this.scw.circulating_mcap_s     = util.toDollarString(this.scw.circulating_mcap);
        this.scw.total_supply_s         = util.toDollarString(this.scw.total_supply);
        this.scw.circulating_supply_s   = util.toDollarString(this.scw.circulating_supply);

        this.main.total_mcap_s          = util.toDollarString(this.main.total_mcap);
        this.main.circulating_mcap_s    = util.toDollarString(this.main.circulating_mcap);
        this.main.volume_s              = util.toDollarString(this.main.volume);
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
        /*----------------------------------------------------
        if no coin logo, use default
        ----------------------------------------------------*/
        if (!this.img_url) this.img_url = '/default-logo.png';

        /*----------------------------------------------------
        set main price source
        ----------------------------------------------------*/
        this.main = {};
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
        set main Circulating Supply source,
	    used by updatPlatformsSupply()
        ----------------------------------------------------*/
        this.main.circulating_supply = Number(
            this.cmc.circulating_supply ? this.cmc.circulating_supply : this.msri.circulating_supply
        );

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
        set scw circulating supply
        ----------------------------------------------------*/
        this.scw.circulating_supply = 0;
        this.platforms.forEach((p) => {
            if (p && p.circulating_supply) this.scw.circulating_supply += p.circulating_supply;
        });

        /*----------------------------------------------------
        set scw total market cap
        ----------------------------------------------------*/
        this.scw.total_mcap = this.main.price * this.scw.total_supply;

        /*----------------------------------------------------
        set scw circulating market cap
        ----------------------------------------------------*/
        this.scw.circulating_mcap = this.main.price * this.scw.circulating_supply;

        /*----------------------------------------------------
        always use scw total supply as main
        ----------------------------------------------------*/
        this.main.total_supply = this.scw.total_supply;

        /*----------------------------------------------------
        always use scw circulating supply as main
        ----------------------------------------------------*/
        this.main.circulating_supply = this.scw.circulating_supply;

        /*----------------------------------------------------
        set main Market Cap source
        ----------------------------------------------------*/
        if (this.scw.circulating_mcap) {
            this.main.total_mcap = this.scw.total_mcap;
            this.main.circulating_mcap = this.scw.circulating_mcap;
        } else if (this.cmc.circulating_mcap) {
            this.main.total_mcap = this.cmc.total_mcap;
            this.main.circulating_mcap = this.cmc.circulating_mcap;
        } else if (this.msri.circulating_mcap) {
            this.main.total_mcap = this.msri.total_mcap;
            this.main.circulating_mcap = this.msri.circulating_mcap;
        }
        this.main.total_mcap = Number(this.main.total_mcap);
        this.main.circulating_mcap = Number(this.main.circulating_mcap);

        if (this.cmc.total_mcap > this.main.total_mcap) {
            console.warn('CMC Market Cap is larger than main');
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
                        /* Set the explorer URL */

                        platform.contract_url = await PLATFORM_API[platform.name].getExplorerURL(platform.contract_address);

                        /* Set the total supply on this platform */
                        let ts = await PLATFORM_API[platform.name].getTokenTotalSupply(platform.contract_address);
                        platform.total_supply = ts ? ts : platform.total_supply;
                        platform.total_supply_s = util.toDollarString(platform.total_supply);

                        /* Set the circulating on this platform */
                        if (platform.exclude_addresses && platform.exclude_addresses.length != 0) {
                            platform.circulating_supply = await PLATFORM_API[platform.name].getTokenCirculatingSupply(
                                platform.contract_address,
                                platform.exclude_addresses,
                                platform.total_supply
                            );
                        } else {
                            platform.circulating_supply = platform.total_supply;
                        }
                        platform.circulating_supply_s = util.toDollarString(platform.total_supply);
                    }
                } catch (e) {
                    if (this.platforms.length == 1) {
                        console.warn(
                            `Using Total Supply as platform supply for ${this.name} on ${platform.name} due to API error: ${e}`
                        );
                        this.platforms[0].total_supply = this.main.total_supply;
                        this.platforms[0].circulating_supply = this.main.circulating_supply;
                    } else {
                        console.error(`Could not get ${this.name} supply on ${platform.name}: ${e}`);
                    }
                } //try-catch
            })
        ); // await Promise.all
        /*----------------------------------------------------
        sort platforms by supply
        ----------------------------------------------------*/
        this.platforms.sort(util.sortObjByNumProperty('circulating_supply'));
    } // updatePlatformsSupply()
}

/*---------------------------------------------------------
    EXPORTS
---------------------------------------------------------*/
module.exports = Stablecoin;
