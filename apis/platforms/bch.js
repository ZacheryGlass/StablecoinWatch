/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
const util = require('../../util');

/*---------------------------------------------------------
    FUNCTIONS
---------------------------------------------------------*/
exports.getTokenTotalSupply = async (token_id) => {
    const slp_api_url = `https://rest.bitcoin.com/v2/slp/list/${token_id}`;
    const response = await fetch(slp_api_url);
    const data = await response.json();
    const total_token_supply = Number(data.quantity);
    return total_token_supply;
};
