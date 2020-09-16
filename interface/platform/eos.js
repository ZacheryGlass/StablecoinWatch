/*---------------------------------------------------------
    IMPORTS
---------------------------------------------------------*/
const PlatformInterface = require('./platform_interface');
const keys = require('../../app/keys');
const { createDfuseClient, createHttpClient } = require('@dfuse/client');

/*---------------------------------------------------------
    CLASS
---------------------------------------------------------*/
class EOSInterface extends PlatformInterface {
    /*---------------------------------------------------------
    API Endpoint URL
    ---------------------------------------------------------*/
    url = 'https://mainnet.eos.dfuse.io';

    /*---------------------------------------------------------
    API Client
    ---------------------------------------------------------*/
    client = null;

    /*---------------------------------------------------------
    Function:    constructor
    Description: Initilaze class instantiation
    ---------------------------------------------------------*/
    constructor() {
        super();
        let httpClient = createHttpClient('https://auth.dfuse.io', this.url);

        this.client = createDfuseClient({
            apiKey: keys.dfuse,
            network: this.url,
            httpClient: httpClient,
        });
    }

    /*---------------------------------------------------------
    Function:
            getExplorerURL
    Description:
            Returns a web link the blockchain explorer. 'address'
            parameter is optional.
    ---------------------------------------------------------*/
    getExplorerURL(address) {
        if (!address) {
            return 'https://bloks.io/';
        } else {
            // make this go to actual token page
            // (instead of account page) in the future
            return `https://bloks.io/account/${address}`;
        }
    }

    /*---------------------------------------------------------
    Function:    getTokenTotalSupply
    Description: Get the total supply for token specified
                 by 'token_contract_address'
    ---------------------------------------------------------*/
    async getTokenTotalSupply(token_contract_address) {
        let resp;

        /*----------------------------------------------------
        get available tables for this contract
        ----------------------------------------------------*/
        resp = await this.client.stateAbi(token_contract_address);
        const tables = resp.abi.tables;

        /*----------------------------------------------------
        check if stat tables exists - this is usually the
        table that contains the supply for token contracts
        ----------------------------------------------------*/
        const stat_table = tables.find((t) => t.name === 'stat');

        if (!stat_table) throw `Could not fine table 'stat' for this EOS Contract.`;
        return (
            this.client
                /*----------------------------------------------------
                get the scopes for this table
                ----------------------------------------------------*/
                .stateTableScopes(token_contract_address, 'stat')
                /*----------------------------------------------------
                get the state for this table
                ----------------------------------------------------*/
                .then(async (resp) => {
                    const scopes = resp.scopes;
                    return this.client.stateTable(token_contract_address, scopes[0], 'stat');
                })
                /*----------------------------------------------------
                search the rows of the table to find the supply
                ----------------------------------------------------*/
                .then((resp) => {
                    let supply;
                    resp.rows.forEach((row) => {
                        /*----------------------------------------------------
                        potential issue here if contract has 'supply' in more
                        than 1 table, or has issued more than 1 token?
                        ----------------------------------------------------*/
                        if (row.json && row.json.supply) supply = row.json.supply;
                    });
                    supply = supply.split(' ')[0]; /* trim symbol from supply string */
                    return Number(supply);
                })
        ); /* no catch here - allow errors to propogate up. */
    } /* getTokenTotalSupply */
} /* EOSInterface */

/*---------------------------------------------------------
    EXPORTS
---------------------------------------------------------*/
module.exports = EOSInterface;
