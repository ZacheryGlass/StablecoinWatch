/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
const util = require('../util');

/*---------------------------------------------------------
    FUNCTIONS
---------------------------------------------------------*/

/*---------------------------------------------------------
Function:
        omni.getTokenSupply
Description:
        Fetches the Omni exporer to get the total supply
        for coin specified by 'token_id'
---------------------------------------------------------*/
exports.getTokenSupply = async (token_id) => {
    const omni_api_url = `https://api.omniexplorer.info/v1/property/${token_id}`;
    const response = await fetch(omni_api_url);
    const data = await response.json();
    const total_token_supply = Number(data.totaltokens);
    return total_token_supply;
};
