const util = require('./util');
const Platform = require('./platform');
const eth = require('./api/eth');
const omni = require('./api/omni');
const tron = require('./api/tron');
const bnb = require('./api/bnb');
const slp = require('./api/bch');
const algo = require('./api/algo');

class Stablecoin {
    /*----------------------------------------------
    Function:       constructor
    ------------------------------------------------*/
    constructor() {
        this.cmc = {};
        this.msri = {};
        this.scw = {};
        this.platforms = [];
    } // constructor

    /*----------------------------------------------
    Function:       updateStrings
    Description: 
    ------------------------------------------------*/
    async updateStrings() {
        this.cmc.mcap_s = util.toDollarString(this.cmc.mcap);
        this.cmc.volume_s = util.toDollarString(this.cmc.volume);
        this.msri.mcap_s = util.toDollarString(this.msri.mcap);
        this.msri.volume_s = util.toDollarString(this.msri.volume);
        if (this.main) {
            this.main.mcap_s = util.toDollarString(this.main.mcap);
            this.main.volume_s = util.toDollarString(this.main.volume);
        }
    } // updateStrings()

    /*----------------------------------------------
    Function:       setMainDataSrc
    Description: 
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
        } else if (this.scw.total_supply) {
            this.main.total_supply = this.scw.total_supply;
            if (this.cmc.mcap) this.main.mcap = this.cmc.mcap;
            else if (this.msri.mcap) this.main.mcap = this.msri.mcap;
        }

        // set Price
        this.main.price = this.cmc.price ? this.cmc.price : this.msri.price;

        // set Price
        this.main.volume = this.cmc.volume ? this.cmc.volume : this.msri.volume;
    } // setMainDataSrc()

    /*----------------------------------------------
    Function:       updateMetrics
    Description: 
    ------------------------------------------------*/
    async updateMetrics() {
        this.setMainDataSrc();
        this.updateStrings();
        return this.updatePlatformsSupply();
    }

    /*----------------------------------------------
    Function:       updatePlatformsSupply
    Description: 
    ------------------------------------------------*/
    async updatePlatformsSupply() {
        if (!this.platforms) {
            console.log('no platforms for', this.name);
            return;
        }
        let PLATFORM_API = {};
        PLATFORM_API['Ethereum'] = eth;
        PLATFORM_API['Bitcoin'] = omni;
        PLATFORM_API['Tron'] = tron;
        PLATFORM_API['BNB Chain'] = bnb;
        PLATFORM_API['Bitcoin Cash (SLP)'] = slp;
        PLATFORM_API['EOS'] = null;
        PLATFORM_API['Algorand'] = algo;

        await Promise.all(
            this.platforms.map(async (platform) => {
                try {
                    if (!PLATFORM_API[platform.name]) {
                        throw `No API available for platform ${platform.name}`;
                    } else if (!PLATFORM_API[platform.name].getTokenSupply) {
                        throw `API for platform ${platform.name} does not support function 'getTokenSupply()'`;
                    } else {
                        platform.supply = await PLATFORM_API[platform.name].getTokenSupply(platform.contract_address);
                    }
                } catch (e) {
                    console.log(`Error getting ${this.name} platform supply: \n\t${e}`);
                    if (this.platforms.length == 1) {
                        this.platforms[0].supply = this.cmc.total_supply
                            ? this.cmc.total_supply
                            : this.msri.total_supply;
                    }
                }
            })
        ); // await Promise.all

        // sort platforms
        this.platforms = this.platforms.sort((a, b) => b.supply - a.supply);

        // update scw.total_supply
        this.scw.total_supply = 0;
        this.platforms.forEach((p) => {
            if (p && p.supply) this.scw.total_supply += p.supply;
        });
    } // updatePlatformsSupply()
}

module.exports = Stablecoin;
