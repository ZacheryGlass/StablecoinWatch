const ENDPOINT = 'http://qtum.info/api';

/*---------------------------------------------------------
Function:
        getTokenTotalSupply
Description:
        Fetches the the balance at an address for the 
        specified token
---------------------------------------------------------*/
async function getTokenBalanceAtAddress(token_contract, address) {
    const request = `${ENDPOINT}/address/${address}/qrc20-balance-history/${token_contract}?limit=1`;

    return fetch(request)
        .then((resp) => resp.json())
        .then((data) => data.transactions[0].tokens[0].balance / 10 ** data.transactions[0].tokens[0].decimals)
        .catch(console.error);
}

/*---------------------------------------------------------
Function:
        getTokenTotalSupply
Description:
        Fetches the total supply for token specified
        by 'contract_address'
---------------------------------------------------------*/
async function getTokenTotalSupply(contract_address) {
    const request = `${ENDPOINT}/contract/${contract_address}`;

    return fetch(request)
        .then((resp) => resp.json())
        .then((data) => data.qrc20.totalSupply / 10 ** data.qrc20.decimals)
        .catch(console.error);
}

exports.getTokenTotalSupply = getTokenTotalSupply;
