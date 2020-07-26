const TronGrid = require('trongrid');
const TronWeb = require('tronweb');

const tronWeb = new TronWeb({
    fullHost: 'https://api.trongrid.io',
});

const tronGrid = new TronGrid(tronWeb);

// tronGrid.setExperimental('experimental key');

exports.getAccount = async (address) => {
    const options = {
        showAssets: true,
        onlyConfirmed: true,
    };
    return tronGrid.account.get(address, options);
};

exports.getTransactions = async (address) => {
    const options = {
        onlyTo: true,
        onlyConfirmed: true,
        limit: 100,
        orderBy: 'timestamp,asc',
        minBlockTimestamp: Date.now() - 60000, // from a minute ago to go on
    };

    return tronGrid.account.getTransactions(address, options);
};

exports.getAssets = async (address) => {
    const options = {};
    return tronGrid.asset.get(address);
};

exports.getTokenSupply = async (address) => {
    const account = await tronGrid.asset.get(address);
    const total_supply = account.data[0].total_supply;
    const decimals = account.data[0].precision;
    return total_supply / 10 ** decimals;
};
