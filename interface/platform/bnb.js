/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
const PlatformInterface = require('./platform_interface');

// const { BncClient, rpc } = require('@binance-chain/javascript-sdk');
// const client = new BncClient('https://dex.binance.org');
// client.initChain();
// const c = new rpc('http://data-seed-prealpha-1-s1.binance.org/');

/*---------------------------------------------------------
    CLASS
---------------------------------------------------------*/
class BinanceChainInterface extends PlatformInterface {
    /*---------------------------------------------------------
    API Endpoint URL
    ---------------------------------------------------------*/
    url = 'https://dex.binance.org';

    /*---------------------------------------------------------
    Function:
            getExplorerURL
    Description:
            Returns a web link the blockchain explorer. 'address'
            parameter is optional.
    ---------------------------------------------------------*/
    getExplorerURL(address) {
        return '/';
    }

    /*---------------------------------------------------------
    Function:    getTokenTotalSupply
    Description: Gets the total supply for token specified
                 by 'token_id'
    ---------------------------------------------------------*/
    async getTokenTotalSupply(token_id) {
        // TODO
        return 0;
    } // getTokenTotalSupply
} // BinanceChainInterface

/*---------------------------------------------------------
    EXPORTS
---------------------------------------------------------*/
module.exports = BinanceChainInterface;
