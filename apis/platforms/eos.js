const keys = require('../../keys');
const { createDfuseClient, createHttpClient } = require('@dfuse/client');

const httpClient = createHttpClient('https://auth.dfuse.io', 'https://mainnet.eos.dfuse.io');

const client = createDfuseClient({
    apiKey: keys.dfuse,
    network: 'mainnet.eos.dfuse.io',
    httpClient: httpClient,
});

/*---------------------------------------------------------
Function:
        eos.getTokenSupply
Description:
        Get the total supply of the token at the provided
        address.
---------------------------------------------------------*/
exports.getTokenSupply = async (address) => {
    let resp;

    // get available tables for this contract
    resp = await client.stateAbi(address);
    const tables = resp.abi.tables;

    // check if stat tables exists - this is usually the table that contains the supply for token contracts
    const stat_table = tables.find((t) => t.name === 'stat');

    if (!stat_table) throw `Could not fine table 'stat' for this EOS Contract.`;
    return (
        client
            // get the scopes for this table
            .stateTableScopes(address, 'stat')
            // get the state for this table
            .then(async (resp) => {
                const scopes = resp.scopes;
                return client.stateTable(address, scopes[0], 'stat');
            })
            // search the rows of the table to find the supply
            .then((resp) => {
                let supply;
                resp.rows.forEach((row) => {
                    // potential issue here if contract has 'supply' in more
                    // than 1 table, or has issued more than 1 token?
                    if (row.json && row.json.supply) supply = row.json.supply;
                });
                supply = supply.split(' ')[0]; // trim symbol from supply string
                return Number(supply);
            })
    ); // no catch here - allow errors to propogate up.
}; // getTokenSupply()
