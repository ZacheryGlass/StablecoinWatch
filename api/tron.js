/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
// const TronGrid = require('trongrid');
const TronWeb = require('tronweb');

/*---------------------------------------------------------
    CONSTANTS
---------------------------------------------------------*/
const tronWeb = new TronWeb({
    fullHost: 'https://api.trongrid.io',
});

// const tronGrid = new TronGrid(tronWeb);
// tronGrid.setExperimental('experimental key');

/*---------------------------------------------------------
    FUNCTIONS
---------------------------------------------------------*/
/*
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
*/

exports.getTokenSupply = async (address) => {
    tronWeb.setAddress(address);
    return tronWeb
        .contract()
        .at(address)
        .then((contract) => Promise.all([contract.totalSupply().call(), contract.decimals().call()]))
        .then(([supply, decimals]) => parseInt(supply._hex, 16) / 10 ** decimals);
};
