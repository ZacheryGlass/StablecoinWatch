class PlatformInterface {
    /*---------------------------------------------------------
    Function:
            getTokenBalanceAtAddress
    Description:
            Fetches the balance at an address for the 
            specified token
    Note:   This function is expected to be defined by the 
            inheriting class
    ---------------------------------------------------------*/
    getTokenBalanceAtAddress() {
        throw new Error('Function getTokenBalanceAtAddress is not defined');
    } // getTokenBalanceAtAddress

    /*---------------------------------------------------------
    Function:
            getTokenTotalSupply
    Description:
            Fetches the total supply for token specified
            by 'token_contract_address'
    Note:   This function is expected to be defined by the 
            inheriting class
    ---------------------------------------------------------*/
    async getTokenTotalSupply(token_contract_address, address) {
        throw new Error('Function getTokenTotalSupply is not defined');
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
}

module.exports = PlatformInterface;
