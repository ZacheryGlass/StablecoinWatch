const request = require('request');
const util = require('./cmn');

exports.getTokenSupply = async (token_id) => {
    let total_token_supply = null;
    var fetch_done = 0;
    const omni_api_url = `https://api.omniexplorer.info/v1/property/${token_id}`;
    request.get(omni_api_url, function (error, response, body) {
        body = JSON.parse(body);
        total_token_supply = Number(body.totaltokens);

        fetch_done = true;
    });
    // wait for done
    while (true) {
        if (!fetch_done) await util.sleep(50);
        else break;
    }

    return total_token_supply;
};
