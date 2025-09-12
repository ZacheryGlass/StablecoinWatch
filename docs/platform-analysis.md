# Investigation: Additional Stablecoins via Asset API Endpoints

## Executive Summary

**Result**: The Asset API endpoints **cannot** provide additional stablecoins beyond the 27 available from the dedicated `/metrics/v2/stablecoins` endpoint.

**Recommendation**: Continue using the dedicated stablecoin endpoint as the primary data source. The Asset API does not offer expanded stablecoin coverage for standard API keys.

## Investigation Details

### API Access Limitations Discovered

1. **Asset API Severe Limitations**
   - The `/metrics/v2/assets` endpoint only returns 2 assets total (Bitcoin and Ethereum)
   - This appears to be a restriction on standard (non-Enterprise) API keys
   - No amount of parameter adjustment increased the asset count

2. **Enterprise Requirements**
   - Multiple asset-related endpoints require Messari Enterprise membership:
     - `/metrics/v1/assets` - Enterprise only
     - `getAssetsTimeseriesCatalog()` - Enterprise only  
     - `getAssetsV2ATH()` - Enterprise only
     - `getAssetsV2ROI()` - Enterprise only

3. **SDK Method Results**
   - `client.asset.getAssetsV2()` - Limited to 2 assets (Bitcoin, Ethereum)
   - `client.asset.getAssetDetails()` - Can only fetch details for assets already known
   - No SDK methods provide comprehensive asset listings on standard keys

### Tested Approaches That Failed

#### 1. Endpoint Path Variations
- `/api/v2/assets` - 404 Not Found
- `/v2/assets` - 404 Not Found  
- `/assets` - 404 Not Found
- `/api/v1/assets` - 404 Not Found

#### 2. Parameter Filtering
- `limit: 500` - Still returned only 2 assets
- `hasMarketData: true` - No change
- `sector: "Stablecoins"` - 0 results
- `category: "Stablecoin"` - 0 results

#### 3. Direct Asset Access
- `/api/v1/assets/tether` - 404 Not Found
- `/api/v1/assets/usdc` - 404 Not Found
- All known stablecoin slugs returned 404

### Key Findings

1. **Dedicated Stablecoin Endpoint is Superior**
   - `/metrics/v2/stablecoins` returns 27 comprehensive stablecoins
   - Includes rich data: supply, transfers, networkBreakdown
   - No Enterprise membership required

2. **Asset API is Severely Limited for Standard Users**
   - Only 2 assets accessible (Bitcoin, Ethereum)
   - No stablecoin categorization available
   - Most functionality requires Enterprise upgrade

3. **SDK Method Availability vs. Functionality**
   - SDK exposes many methods but most require Enterprise
   - Available methods are limited to the same 2 assets
   - No method provides expanded asset discovery

## Technical Evidence

### Working Endpoints (Standard API Key)
- ✅ `GET /metrics/v2/stablecoins` - Returns 27 stablecoins
- ✅ `GET /metrics/v2/assets` - Returns 2 assets (Bitcoin, Ethereum)

### Non-Working/Restricted Endpoints
- ❌ `GET /api/v2/assets` - 404 Not Found
- ❌ `GET /metrics/v1/assets` - Requires Enterprise  
- ❌ `GET /api/v1/assets/{slug}` - 404 Not Found
- 🔒 Multiple SDK methods - Require Enterprise

## Conclusion

The investigation conclusively shows that:

1. **The dedicated `/metrics/v2/stablecoins` endpoint is the best available option** for stablecoin data with standard API keys
2. **Asset API endpoints cannot expand stablecoin coverage** due to severe access limitations
3. **The 27 stablecoins represent the complete set** available to non-Enterprise users
4. **Messari's business model restricts comprehensive asset data** to paying Enterprise customers

The discrepancy with Messari's website showing 100+ stablecoins likely reflects:
- Different data sources or internal tooling for the website
- Enterprise-level data not exposed via standard API keys  
- Marketing display vs. API access restrictions

## Recommendation

**Continue using the current implementation** with the dedicated stablecoin endpoint. The app correctly displays all 27 stablecoins available through the standard API, and no additional stablecoins can be discovered through alternative endpoints.

For expanded stablecoin coverage, a Messari Enterprise subscription would be required, but even then, it's unclear if additional stablecoins would be available beyond the dedicated endpoint.