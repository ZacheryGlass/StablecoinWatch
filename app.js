global.fetch = require('node-fetch');
global.WebSocket = require('ws');
require('./api/eos');

// const https = require('https');
// const express = require('express');
// const cron = require('node-cron');
// const messari = require('./api/messari');
// const scw = require('./api/scw');
// const util = require('./util');
// const cmc = require('./api/cmc');

// /*---------------------------------------------------------
//     CONSTANTS
// ---------------------------------------------------------*/
// const MINS_BETWEEN_UPDATE = 15;

// /*---------------------------------------------------------
//     APP SETUP
// ---------------------------------------------------------*/
// // set up express app.
// const app = express();

// app.set('view engine', 'ejs');
// app.use(express.static(__dirname + '/styles'));
// app.use(express.static(__dirname + '/res'));

// updateData();
// cron.schedule(`*/${MINS_BETWEEN_UPDATE} * * * *`, updateData);

// /*---------------------------------------------------------
//     ROUTES
// ---------------------------------------------------------*/
// app.get('/', async (req, res) => {
//     let eth_data = glb_platform_data.find((chain) => chain.name === 'Ethereum');
//     // console.debug(glb_platform_data);
//     res.render('home', {
//         coins: glb_stablecoins,
//         totalMCap: glb_totalMCap,
//         totalMCap_s: util.toDollarString(glb_totalMCap),
//         totalVolume: glb_totalVolume,
//         totalVolume_s: util.toDollarString(glb_totalVolume),
//         totalETHMCap: eth_data.total_mcap,
//         totalETHMCap_s: eth_data.total_mcap_s,
//         active: 'home',
//     });
// }); // home

// app.get('/donate', async (req, res) => {
//     let eth_data = glb_platform_data.find((chain) => chain.name === 'Ethereum');
//     res.render('donate', {
//         totalMCap: glb_totalMCap,
//         totalMCap_s: util.toDollarString(glb_totalMCap),
//         totalVolume: glb_totalVolume,
//         totalVolume_s: util.toDollarString(glb_totalVolume),
//         totalETHMCap: eth_data.total_mcap,
//         totalETHMCap_s: eth_data.total_mcap_s,
//         active: 'donate',
//     });
// }); // donate

// // create chains page
// app.get('/chains', async (req, res) => {
//     let eth_data = glb_platform_data.find((chain) => chain.name === 'Ethereum');
//     res.render('chains', {
//         totalMCap: glb_totalMCap,
//         totalMCap_s: util.toDollarString(glb_totalMCap),
//         totalVolume: glb_totalVolume,
//         totalVolume_s: util.toDollarString(glb_totalVolume),
//         totalETHMCap: eth_data.total_mcap,
//         totalETHMCap_s: eth_data.total_mcap_s,
//         glb_platform_data: glb_platform_data,
//         active: 'chains',
//     });
// }); // chains

// // parses json request and attach to route handler
// // (order of app.use matters here)
// app.use(express.json());

// // process is a global variable.
// // Use the eviroment variable if it's set, otherwise use port 3000.
// const port = process.env.PORT || 3000;
// app.listen(port, () => console.log(`Listening on port ${port}`));
