const PlatformInterface = require('../platform_interface');

/*---------------------------------------------------------
    CLASS
---------------------------------------------------------*/
class QtumInterface extends PlatformInterface {
    /*---------------------------------------------------------
    API Endpoint URL
    ---------------------------------------------------------*/
    url = 'http://qtum.info/api';

    /*---------------------------------------------------------
    Function:
            getExplorerURL
    Description:
            Returns a web link the blockchain explorer. 'address'
            parameter is optional.
    ---------------------------------------------------------*/
    getExplorerURL(address) {
        if (!address) {
            return 'https://qtum.info//';
        } else {
            return `https://qtum.info/contract/${address}`;
        }
    }

    /*---------------------------------------------------------
    Function:    getTokenBalanceAtAddress
    Description: Gets the balance at an address for specified token
    ---------------------------------------------------------*/
    async getTokenBalanceAtAddress(token_contract_address, address) {
        return fetch(`${this.url}/address/${address}/qrc20-balance-history/${token_contract_address}?limit=1`)
            .then((resp) => resp.json())
            .then((data) => data.transactions[0].tokens[0].balance / 10 ** data.transactions[0].tokens[0].decimals)
            .catch(console.error);
    } // getTokenBalanceAtAddress

    /*---------------------------------------------------------
    Function:    getTokenTotalSupply
    Description: Gets the total supply for token specified
                 by 'token_contract_address'
    ---------------------------------------------------------*/
    async getTokenTotalSupply(token_contract_address) {
        return fetch(`${this.url}/contract/${token_contract_address}`)
            .then((resp) => resp.json())
            .then((data) => data.qrc20.totalSupply / 10 ** data.qrc20.decimals)
            .catch(console.error);
    } // getTokenTotalSupply
} // QtumInterface

/*---------------------------------------------------------
    EXPORTS
---------------------------------------------------------*/
module.exports = QtumInterface;
