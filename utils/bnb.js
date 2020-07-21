const { BncClient, rpc } = require('@binance-chain/javascript-sdk');
const client = new BncClient('https://dex.binance.org');
client.initChain();
const c = new rpc('http://data-seed-prealpha-1-s1.binance.org/');

exports.getTokenSupply = async (address) => {
    address = 'bnb1ultyhpw2p2ktvr68swz56570lgj2rdsadq3ym2';
    try {
        console.log(address);
        let x = await c.getTokenInfo(address);
    } catch (e) {
        console.log('ZG-ERROR:', e);
    }

    console.log(x);
    // console.log('BNB', address);
    return 10000000;
}; // getTokenSupply
