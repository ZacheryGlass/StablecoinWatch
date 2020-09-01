/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
const PlatformInterface = require('../platform_interface');
const TronWeb = require('tronweb');
// const TronGrid = require('trongrid');
// const tronGrid = new TronGrid(tronWeb);
// tronGrid.setExperimental('experimental key');

class TronInterface extends PlatformInterface {
    /*---------------------------------------------------------
    API Endpoint URL
    ---------------------------------------------------------*/
    url = 'https://api.trongrid.io';

    /*---------------------------------------------------------
    API Client
    ---------------------------------------------------------*/
    client = null;

    /*---------------------------------------------------------
    Function:    constructor
    Description: Initilaze class instantiation
    ---------------------------------------------------------*/
    constructor() {
        super();
        this.client = new TronWeb({ fullHost: this.url });
    }

    /*---------------------------------------------------------
    Function:    getTokenTotalSupply
    Description: Gets the total supply for token specified
                 by 'address'
    ---------------------------------------------------------*/
    async getTokenTotalSupply(address) {
        this.client.setAddress(address);
        return this.client
            .contract()
            .at(address)
            .then((contract) => Promise.all([contract.totalSupply().call(), contract.decimals().call()]))
            .then(([supply, decimals]) => parseInt(supply._hex, 16) / 10 ** decimals);
    } // getTokenTotalSupply

    /******************************************************
    async getAccount(address) {
        const options = {
            showAssets: true,
            onlyConfirmed: true,
        };
        return tronGrid.account.get(address, options);
    };

    async getTransactions(address) {
        const options = {
            onlyTo: true,
            onlyConfirmed: true,
            limit: 100,
            orderBy: 'timestamp,asc',
            minBlockTimestamp: Date.now() - 60000, // from a minute ago to go on
        };

        return tronGrid.account.getTransactions(address, options);
    };

    async getAssets(address) {
        const options = {};
        return tronGrid.asset.get(address);
    };
    *******************************************************/

} // TronInterface

/*---------------------------------------------------------
    EXPORTS
---------------------------------------------------------*/
module.exports = TronInterface;