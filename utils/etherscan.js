const keys = require('../keys');
const etherscan_api = require('etherscan-api').init(keys.etherscan);

exports.getTokenSupply = async (contract_address, decimals) => {
    let total_token_supply = null;

    await etherscan_api.stats
        .tokensupply(null, contract_address)
        .then((data) => {
            total_token_supply = data.result / 10 ** decimals;
        })
        .catch((err) => {
            console.log('ETHERSCAN API ERROR: ', err);
            console.log(err);
        });

    return total_token_supply;
};
