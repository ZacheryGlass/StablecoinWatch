// https://developer.algorand.org/docs/reference/algorand-networks/mainnet/
// https://developer.purestake.io/code-samples

const algosdk = require('algosdk');

const mainnet_url = 'https://mainnet-algorand.api.purestake.io/ps1'
const testnet_url = 'https://testnet-algorand.api.purestake.io/ps1'
const port = "";
const token = {
    'X-API-key' : '2n5677I0Q46pibAiTRLHO9tWh66pfQho3xZgog6I',
}
const algodclient = new algosdk.Algod(token, mainnet_url, port); 

async function getAssetInfo(asset_id) {
    // tether asset id = 312769
    return algodclient.assetInformation(asset_ad);
}

async function getAccountInfo(address) {
    // tether account address = XIU7HGGAJ3QOTATPDSIIHPFVKMICXKHMOR2FJKHTVLII4FAOA3CYZQDLG4
    return algodclient.accountInformation(address);
};

async function getTokenSupplyByAddress(address) {
    let info = await getAccountInfo(address);
    coin_ids = Object.keys(info.thisassettotal);

    if (coin_ids.length > 1) {
        throw `Error: Multiple tokens created by this address. Use getTokenSupplyById instead.`;
    } else {
        let coin_data = info.thisassettotal[coin_ids[0]];
        let total_minted =  coin_data.total / 10**coin_data.decimals;
        let amount_not_yet_issued = info.assets[coin_ids[0]].amount / 10**coin_data.decimals;
        return total_minted - amount_not_yet_issued;
    }
}

exports.getTokenSupply = getTokenSupplyByAddress;
