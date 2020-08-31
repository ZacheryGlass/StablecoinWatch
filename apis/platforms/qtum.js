
const PlatformInterface = require('./platform_interface');

class QtumInterface extends PlatformInterface {
    ENDPOINT = 'http://qtum.info/api';

    /*---------------------------------------------------------
    Function:
            getTokenBalanceAtAddress
    Description:
            Fetches the balance at an address for the 
            specified token
    ---------------------------------------------------------*/
    async getTokenBalanceAtAddress(token_contract_address, address) {
        const request = `${this.ENDPOINT}/address/${address}/qrc20-balance-history/${token_contract_address}?limit=1`;

        return fetch(request)
            .then((resp) => resp.json())
            .then((data) => data.transactions[0].tokens[0].balance / 10 ** data.transactions[0].tokens[0].decimals)
            .catch(console.error);
    } // getTokenBalanceAtAddress

    /*---------------------------------------------------------
    Function:
            getTokenTotalSupply
    Description:
            Fetches the total supply for token specified
            by 'token_contract_address'
    ---------------------------------------------------------*/
    async getTokenTotalSupply(token_contract_address) {
        const request = `${this.ENDPOINT}/contract/${token_contract_address}`;

        console.log(request);
        return fetch(request)
            .then((resp) => resp.json())
            .then((data) => data.qrc20.totalSupply / 10 ** data.qrc20.decimals)
            .catch(console.error);
    } // getTokenTotalSupply
} // PlatformInterface

module.exports = QtumInterface;
