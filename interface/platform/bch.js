
/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
const PlatformInterface = require('./platform_interface');
const util = require('../../app/util');

class BitcoinCashInterface extends PlatformInterface {
    /*---------------------------------------------------------
    API Endpoint URL
    ---------------------------------------------------------*/
    url = 'https://rest.bitcoin.com';

    /*---------------------------------------------------------
    Function:
            getTokenTotalSupply
    Description:
            Gets the total supply for token specified
            by 'token_contract_address'
    ---------------------------------------------------------*/
    async getTokenTotalSupply(token_id) {
        const response = await fetch(`${this.url}/v2/slp/list/${token_id}`);
        const data = await response.json();
        const total_token_supply = Number(data.quantity);
        return total_token_supply;
    } // getTokenTotalSupply

} // BitcoinCashInterface

/*---------------------------------------------------------
    EXPORTS
---------------------------------------------------------*/
module.exports = BitcoinCashInterface;