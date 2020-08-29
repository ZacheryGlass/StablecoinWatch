let fetch = require('node-fetch');
class QtumInterface {
    ENDPOINT = 'http://qtum.info/api';

    /*---------------------------------------------------------
    Function:
            getTokenTotalSupply
    Description:
            Fetches the the balance at an address for the 
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

        return fetch(request)
            .then((resp) => resp.json())
            .then((data) => data.qrc20.totalSupply / 10 ** data.qrc20.decimals)
            .catch(console.error);
    } // getTokenTotalSupply

    /*---------------------------------------------------------
    Function:
            getTokenCirculatingSupply
    Description:
            Fetches the circulating supply for token specified
            by 'token_contract_address'
    Note:   The parameter 'total_supply' is optional but 
            prevents an additional API call.
    ---------------------------------------------------------*/
    async getTokenCirculatingSupply(token_contract_address, exclude_addresses, total_supply) {

        if (!total_supply) total_supply = await this.getTokenTotalSupply(token_contract_address);

        const exclude_total = await Promise.all(
            exclude_addresses.map((addr) => this.getTokenBalanceAtAddress(token_contract_address, addr))
        ).then((exclude_amounts) => exclude_amounts.reduce((a, b) => a + b));

        return total_supply - exclude_total;
    } // total_supply
} // PlatformInterface

let q = new QtumInterface();
// module.exports = Qtum;
