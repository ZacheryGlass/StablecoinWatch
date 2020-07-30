const keys = require('../keys');
const { createDfuseClient, createHttpClient } = require('@dfuse/client');

const httpClient = createHttpClient('', 'https://mainnet.eos.dfuse.io/');

const client = createDfuseClient({
    apiKey: keys.dfuse,
    network: 'https://mainnet.eos.dfuse.io/',
    httpClient: httpClient,
});

exports.getTokenSupply = async (address) => {
    let resp;

    // get available tables for this contract
    try {
        resp = await client.stateAbi(address).catch(console.debug);
    } catch (e) {
        console.debug('EOS fail here', e);
    }
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

/*------------------------------- this works to fetch an accounts balance -----------------------------------*/

// async function get_jwt_token(apiKey) {
//     return await fetch('https://auth.dfuse.io/v1/auth/issue', {
//         method: 'POST',
//         body: JSON.stringify({
//             api_key: apiKey,
//         }),
//         headers: {
//             'Content-Type': 'application/json',
//         },
//     })
//         .then((res) => res.json())
//         .then((data) => data.token);
// }

// get_jwt_token(keys.dfuse).then((jwt_token) => {
//     fetch(
//         'https://mainnet.eos.dfuse.io/v0/state/table/row?account=eosio.token&scope=b1&table=accounts&primary_key=EOS&key_type=symbol_code&block_num=25000000&json=true',
//         {
//             headers: {
//                 Authorization: 'Bearer ' + jwt_token,
//             },
//         }
//     ).then(async (resp) => {
//         console.log(await resp.json());
//     });
// });

/*------------------------------- this works to stream transactions via graphql -----------------------------------*/

// const { createDfuseClient } = require('@dfuse/client');

// const client = createDfuseClient({
//     apiKey: keys.dfuse,
//     network: 'mainnet.eos.dfuse.io',
// });

// // You must use a `$cursor` variable so stream starts back at last marked cursor on reconnect!
// const operation = `subscription($cursor: String!) {
//     searchTransactionsForward(query:"receiver:eosio.token action:transfer -data.quantity:'0.0001 EOS'", cursor: $cursor) {
//       undo cursor
//       trace { id matchingActions { json } }
//     }
//   }`;

// async function main() {
//     const stream = await client.graphql(operation, (message) => {
//         if (message.type === 'data') {
//             const {
//                 undo,
//                 cursor,
//                 trace: { id, matchingActions },
//             } = message.data.searchTransactionsForward;
//             matchingActions.forEach(({ json: { from, to, quantity } }) => {
//                 console.log(`Transfer ${from} -> ${to} [${quantity}]${undo ? ' REVERTED' : ''}`);
//             });

//             // Mark stream at cursor location, on re-connect, we will start back at cursor
//             stream.mark({ cursor });
//         }

//         if (message.type === 'error') {
//             console.log('An error occurred', message.errors, message.terminal);
//         }

//         if (message.type === 'complete') {
//             console.log('Completed');
//         }
//     });

//     // Waits until the stream completes, or forever
//     await stream.join();
//     await client.release();
// }

// main().catch((error) => console.log('Unexpected error', error));
