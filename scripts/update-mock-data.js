#!/usr/bin/env node

/**
 * Update Mock Data Script
 * 
 * This script fetches fresh data from all configured APIs and updates
 * the corresponding raw output files used for mocking during development.
 * 
 * Usage:
 *   node scripts/update-mock-data.js [--api=cmc,messari,defillama] [--verbose]
 * 
 * Examples:
 *   node scripts/update-mock-data.js                    # Update all APIs
 *   node scripts/update-mock-data.js --api=cmc         # Update only CMC
 *   node scripts/update-mock-data.js --api=cmc,messari # Update CMC and Messari
 *   node scripts/update-mock-data.js --verbose         # Verbose output
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Parse command line arguments
const args = process.argv.slice(2);
const apiArg = args.find(arg => arg.startsWith('--api='));
const verbose = args.includes('--verbose');
const selectedApis = apiArg ? apiArg.split('=')[1].split(',') : ['cmc', 'messari', 'defillama'];

const log = (message) => console.log(`🔄 ${message}`);
const success = (message) => console.log(`✅ ${message}`);
const warn = (message) => console.log(`⚠️  ${message}`);
const error = (message) => console.error(`❌ ${message}`);

/**
 * Fetch CMC data
 */
async function fetchCMCData() {
    if (!process.env.CMC_API_KEY) {
        throw new Error('CMC_API_KEY not found in environment');
    }

    const baseUrl = process.env.CMC_BASE_URL || 'https://pro-api.coinmarketcap.com';
    const url = `${baseUrl}/v1/cryptocurrency/listings/latest`;
    
    const headers = {
        'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY,
        'Accepts': 'application/json',
        'Accept-Encoding': 'deflate, gzip'
    };

    const parameters = {
        start: '1',
        limit: '5000',
        aux: 'tags'
    };

    if (verbose) log(`Making request to: ${url}`);
    
    const response = await axios.get(url, { 
        headers, 
        params: parameters, 
        timeout: 30000 
    });
    
    if (!response.data?.data) {
        throw new Error('No data received from CMC API');
    }

    return response.data;
}

/**
 * Fetch Messari data
 */
async function fetchMessariData() {
    if (!process.env.MESSARI_API_KEY) {
        throw new Error('MESSARI_API_KEY not found in environment');
    }

    const baseUrl = process.env.MESSARI_BASE_URL || 'https://data.messari.io/api';
    
    const headers = {
        'x-messari-api-key': process.env.MESSARI_API_KEY,
        'Accept': 'application/json'
    };

    // Try the dedicated stablecoins endpoint first
    try {
        const stablecoinsUrl = `${baseUrl}/metrics/v2/stablecoins`;
        if (verbose) log(`Trying dedicated stablecoins endpoint: ${stablecoinsUrl}`);
        
        const response = await axios.get(stablecoinsUrl, { 
            headers, 
            timeout: 30000 
        });
        
        if (response.data?.data && response.data.data.length > 0) {
            if (verbose) success(`Found dedicated stablecoins endpoint with ${response.data.data.length} coins`);
            return response.data;
        }
    } catch (stablecoinsError) {
        if (verbose) warn(`Dedicated stablecoins endpoint not available: ${stablecoinsError.message}`);
    }

    // Fall back to general assets endpoint
    const assetsUrl = `${baseUrl}/v2/assets`;
    if (verbose) log(`Using general assets endpoint: ${assetsUrl}`);
    
    const parameters = {
        limit: 100,
        fields: 'id,symbol,name,slug,tags,supply,profile',
        'fields[profile]': 'general,images',
        'fields[supply]': 'circulating,total,max'
    };
    
    const response = await axios.get(assetsUrl, { 
        headers, 
        params: parameters, 
        timeout: 30000 
    });
    
    if (!response.data?.data) {
        throw new Error('No data received from Messari API');
    }

    return response.data;
}

/**
 * Fetch DeFiLlama data
 */
async function fetchDeFiLlamaData() {
    // DeFiLlama uses a different base URL for stablecoins
    const baseUrl = 'https://stablecoins.llama.fi';
    const url = `${baseUrl}/stablecoins`;
    
    const headers = {
        'Accept': 'application/json'
    };

    const parameters = {
        includePrices: 'true'
    };

    if (verbose) log(`Making request to: ${url}`);
    
    const response = await axios.get(url, { 
        headers, 
        params: parameters, 
        timeout: 30000 
    });
    
    if (!response.data?.peggedAssets) {
        throw new Error('No peggedAssets data received from DeFiLlama API');
    }

    return response.data;
}

/**
 * Update a single API's mock data
 */
async function updateApiMockData(apiName) {
    const startTime = Date.now();
    log(`Updating ${apiName.toUpperCase()} mock data...`);

    try {
        let data;
        let fileName;
        let filterInfo = '';

        switch (apiName) {
            case 'cmc':
                data = await fetchCMCData();
                fileName = 'cmc_raw_output.json';
                const stablecoins = data.data.filter(crypto => {
                    const hasStablecoinTag = crypto.tags && crypto.tags.includes('stablecoin');
                    const price = crypto.quote?.USD?.price;
                    const isReasonablePrice = !price || (price >= 0.5 && price <= 2.0);
                    return hasStablecoinTag && isReasonablePrice;
                });
                filterInfo = ` (${stablecoins.length} stablecoins out of ${data.data.length} total coins)`;
                break;
                
            case 'messari':
                data = await fetchMessariData();
                fileName = 'messari_raw_output.json';
                const potentialStablecoins = data.data.filter(asset => {
                    const symbol = (asset.symbol || '').toLowerCase();
                    const name = (asset.name || '').toLowerCase();
                    const tags = asset.tags || [];
                    
                    const stablecoinPatterns = [
                        /usdt|usdc|dai|busd|frax|usdd|tusd|pax|gusd|husd/,
                        /stable|dollar|usd/,
                    ];
                    
                    const hasStablecoinTag = tags.some(tag => 
                        tag.toLowerCase().includes('stable') || 
                        tag.toLowerCase().includes('currency')
                    );
                    
                    const matchesPattern = stablecoinPatterns.some(pattern => 
                        pattern.test(symbol) || pattern.test(name)
                    );
                    
                    return hasStablecoinTag || matchesPattern;
                });
                filterInfo = ` (${potentialStablecoins.length} potential stablecoins out of ${data.data.length} total assets)`;
                break;
                
            case 'defillama':
                data = await fetchDeFiLlamaData();
                fileName = 'defillama_raw_output.json';
                filterInfo = ` (${data.peggedAssets.length} stablecoins)`;
                break;
                
            default:
                throw new Error(`Unknown API: ${apiName}`);
        }

        const outputPath = path.join(__dirname, '..', fileName);
        fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
        
        const fileSizeMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);
        const duration = Date.now() - startTime;
        
        success(`${apiName.toUpperCase()} data updated in ${duration}ms`);
        success(`📊 File: ${fileName} (${fileSizeMB} MB)${filterInfo}`);
        
    } catch (err) {
        error(`Failed to update ${apiName.toUpperCase()} data: ${err.message}`);
        if (verbose && err.response) {
            error(`HTTP ${err.response.status}: ${err.response.statusText}`);
            if (err.response.data) {
                error(`Response: ${JSON.stringify(err.response.data, null, 2).substring(0, 300)}`);
            }
        }
        throw err;
    }
}

/**
 * Main function
 */
async function main() {
    const startTime = Date.now();
    
    console.log('🚀 StablecoinWatch Mock Data Updater');
    console.log(`📅 ${new Date().toISOString()}`);
    console.log(`🎯 Updating APIs: ${selectedApis.join(', ')}`);
    console.log('');

    let successCount = 0;
    let errorCount = 0;

    for (const api of selectedApis) {
        try {
            await updateApiMockData(api);
            successCount++;
        } catch (err) {
            errorCount++;
        }
        console.log(''); // Empty line for separation
    }

    const totalDuration = Date.now() - startTime;
    
    console.log('📊 Summary:');
    console.log(`✅ Successful updates: ${successCount}`);
    console.log(`❌ Failed updates: ${errorCount}`);
    console.log(`⏱️  Total duration: ${totalDuration}ms`);
    
    if (errorCount > 0) {
        console.log('');
        warn('Some APIs failed to update. Check your API keys and network connection.');
        process.exit(1);
    } else {
        console.log('');
        success('All mock data files updated successfully!');
    }
}

// Run the script if called directly
if (require.main === module) {
    main().catch(err => {
        error(`Script failed: ${err.message}`);
        process.exit(1);
    });
}

module.exports = { updateApiMockData, fetchCMCData, fetchMessariData, fetchDeFiLlamaData };