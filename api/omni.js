const fetch = require('node-fetch');
const util = require('../util');

exports.getTokenSupply = async (token_id) => {
    const omni_api_url = `https://api.omniexplorer.info/v1/property/${token_id}`;
    const response = await fetch(omni_api_url);
    const data = await response.json();
    const total_token_supply = Number(data.totaltokens);
    return total_token_supply;
};
