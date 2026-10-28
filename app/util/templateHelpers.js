/**
 * Template Helpers for EJS Templates
 * Provides safe property access, data formatting, and business logic helpers
 * to remove business logic from templates and prevent runtime errors
 */

/*---------------------------------------------------------
    SAFE PROPERTY ACCESS HELPERS
---------------------------------------------------------*/

/**
 * Safely access nested object properties with fallback support
 * @param {Object} obj - The object to access properties from
 * @param {string} path - Dot-separated property path (e.g., 'main.price')
 * @param {*} fallback - Value to return if property is undefined/null
 * @returns {*} The property value or fallback
 */
function safeGet(obj, path, fallback = null) {
    if (!obj || typeof obj !== 'object') return fallback;
    
    const keys = path.split('.');
    let result = obj;
    const visited = new Set(); // Circular reference protection
    const maxDepth = 10; // Reasonable depth limit
    
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        
        if (result === null || result === undefined || typeof result !== 'object') {
            return fallback;
        }
        
        // Circular reference protection
        if (visited.has(result)) {
            console.warn(`Circular reference detected in safeGet for path: ${path}`);
            return fallback;
        }
        visited.add(result);
        
        // Depth protection
        if (i >= maxDepth) {
            console.warn(`Maximum depth exceeded in safeGet for path: ${path}`);
            return fallback;
        }
        
        result = result[key];
    }
    
    return result !== undefined && result !== null ? result : fallback;
}

/**
 * Safely perform string operations with fallback
 * @param {*} value - The value to convert to string
 * @param {string} fallback - Fallback string if value is invalid
 * @returns {string} The string value or fallback
 */
function safeString(value, fallback = 'No data') {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string') return value;
    if (typeof value === 'number' && !isNaN(value)) return String(value);
    return fallback;
}

/**
 * Safely access numeric values with fallback
 * @param {*} value - The value to check/convert
 * @param {number} fallback - Fallback number if value is invalid
 * @returns {number} The numeric value or fallback
 */
function safeNumber(value, fallback = 0) {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'number' && !isNaN(value)) return value;
    
    // Only attempt parsing for strings, reject all other types
    if (typeof value !== 'string') return fallback;
    
    // Trim whitespace and check for empty string
    const trimmed = value.trim();
    if (trimmed === '') return fallback;
    
    const parsed = parseFloat(trimmed);
    return !isNaN(parsed) ? parsed : fallback;
}

/*---------------------------------------------------------
    DATA-SPECIFIC HELPERS
---------------------------------------------------------*/

/**
 * Safely get price from coin data with source priority
 * @param {Object} coin - The coin object
 * @param {string} source - Primary source to check ('main', 'cmc', 'msri', etc.)
 * @returns {number|null} The price value or null
 */
function getPrice(coin, source = 'main') {
    if (!coin) return null;
    
    // Define valid sources to prevent invalid source names
    const validSources = ['main', 'cmc', 'msri', 'cgko', 'scw'];
    
    // Validate source parameter
    if (typeof source !== 'string' || !validSources.includes(source)) {
        console.warn(`Invalid source '${source}' provided to getPrice, using 'main'`);
        source = 'main';
    }
    
    // Create sources array without duplicates using Set
    const sourcesSet = new Set([source, ...validSources]);
    const sources = Array.from(sourcesSet);
    
    for (const src of sources) {
        const price = safeGet(coin, `${src}.price`);
        if (price !== null && typeof price === 'number' && !isNaN(price)) {
            return price;
        }
    }
    
    return null;
}

/**
 * Safely get market cap from coin data with source priority and fallback
 * @param {Object} coin - The coin object
 * @param {string} source - Primary source to check
 * @returns {string} The formatted market cap or 'No data'
 */
function getMarketCap(coin, source = 'main') {
    if (!coin) return 'No data';
    
    const sources = [source, 'main', 'scw', 'cmc', 'msri', 'cgko'];
    
    for (const src of sources) {
        const mcap = safeGet(coin, `${src}.circulating_mcap_s`);
        if (mcap && typeof mcap === 'string' && mcap !== 'No data') {
            return mcap;
        }
    }
    
    return 'No data';
}

/**
 * Safely get supply data from coin
 * @param {Object} coin - The coin object
 * @param {string} source - Data source
 * @param {string} type - Supply type ('circulating_supply_s', 'total_supply_s')
 * @returns {string} The supply value or 'No data'
 */
function getSupply(coin, source, type = 'circulating_supply_s') {
    const value = safeGet(coin, `${source}.${type}`);
    if (!value) return 'No data';
    
    // Handle string replacement (no try-catch needed - replace() never throws)
    if (typeof value === 'string') {
        return value.replace('$', '');
    }
    
    return safeString(value, 'No data');
}

/**
 * Safely get volume data from coin
 * @param {Object} coin - The coin object
 * @param {string} source - Data source
 * @returns {string} The volume value or 'No data'
 */
function getVolume(coin, source) {
    return safeString(safeGet(coin, `${source}.volume_s`), 'No data');
}

/**
 * Get image URL with default fallback
 * @param {Object} coin - The coin object
 * @returns {string} The image URL or default logo path
 */
function getImage(coin) {
    const img = safeGet(coin, 'img_url');
    return img && typeof img === 'string' ? img : '/default-logo.png';
}

/**
 * Format platform display based on platform count
 * @param {Array} platforms - Array of platform objects
 * @returns {string} Formatted platform display string
 */
function getPlatformDisplay(platforms) {
    if (!Array.isArray(platforms) || platforms.length === 0) {
        return 'No platforms';
    }
    
    if (platforms.length === 1) {
        return safeString(platforms[0].name, 'Unknown platform');
    } else if (platforms.length <= 3) {
        return platforms.map(p => safeString(p.name, 'Unknown')).join(', ');
    } else {
        const first = platforms.slice(0, 2).map(p => safeString(p.name, 'Unknown')).join(', ');
        return `${first} + ${platforms.length - 2} more`;
    }
}

/*---------------------------------------------------------
    BUSINESS LOGIC HELPERS
---------------------------------------------------------*/

/**
 * Calculate market cap dominance percentage
 * @param {number} coinMcap - Individual coin market cap
 * @param {number} totalMcap - Total market cap
 * @returns {number|null} Dominance percentage or null
 */
function calculateDominance(coinMcap, totalMcap) {
    const coin = safeNumber(coinMcap);
    const total = safeNumber(totalMcap);
    
    if (coin === 0 || total === 0) return null;
    
    // Check for negative values
    if (coin < 0 || total < 0) {
        console.warn(`Negative values in calculateDominance: coin=${coin}, total=${total}`);
        return null;
    }
    
    const dominance = (coin / total) * 100;
    
    // Bounds checking: dominance should be between 0-100%
    if (dominance > 100) {
        console.warn(`Dominance exceeds 100%: ${dominance.toFixed(2)}% (coin=${coin}, total=${total})`);
        return 100; // Cap at 100% for display purposes
    }
    
    if (dominance < 0) {
        console.warn(`Negative dominance calculated: ${dominance.toFixed(2)}%`);
        return 0; // Floor at 0% for display purposes
    }
    
    // Handle precision issues with very small numbers
    return Math.round(dominance * 100) / 100; // Round to 2 decimal places
}

/**
 * Check if coin has valid data for a specific field
 * @param {Object} coin - The coin object
 * @param {string} field - Field to check (e.g., 'price', 'market_cap')
 * @returns {boolean} True if coin has valid data for the field
 */
function hasValidData(coin, field) {
    if (!coin || !field) return false;
    
    switch (field) {
        case 'price':
            return getPrice(coin) !== null;
        case 'market_cap':
            return getMarketCap(coin) !== 'No data';
        case 'platforms':
            return Array.isArray(coin.platforms) && coin.platforms.length > 0;
        default:
            return safeGet(coin, field) !== null;
    }
}

/**
 * Get formatted price with safe access
 * @param {Object} coin - The coin object
 * @param {string} source - Data source
 * @param {Object} formatter - Formatter functions
 * @returns {string} Formatted price or 'No data'
 */
function getFormattedPrice(coin, source, formatter) {
    const price = getPrice(coin, source);
    if (price === null) return 'No data';
    
    return formatter && formatter.formatPrice ? formatter.formatPrice(price) : `$${price.toFixed(3)}`;
}

/**
 * Get dominance display with safe calculation
 * @param {Object} coin - The coin object
 * @param {Object} metrics - Metrics object with totalMCap
 * @param {Object} formatter - Formatter functions
 * @returns {string} Formatted dominance or 'No data'
 */
function getDominanceDisplay(coin, metrics, formatter) {
    const coinMcap = safeGet(coin, 'main.circulating_mcap');
    const totalMcap = safeGet(metrics, 'totalMCap');
    
    const dominance = calculateDominance(coinMcap, totalMcap);
    if (dominance === null) return 'No data';
    
    return formatter && formatter.formatPercentage 
        ? formatter.formatPercentage(dominance, 2)
        : `${dominance.toFixed(2)}%`;
}

/**
 * Check if description exists for any source
 * @param {Object} coin - The coin object
 * @param {string} source - Specific source to check
 * @returns {boolean} True if description exists
 */
function hasDescription(coin, source) {
    return !!safeGet(coin, `${source}.desc`);
}

/**
 * Get contract URL with safe access
 * @param {Object} platform - Platform object
 * @returns {string|null} Contract URL or null
 */
function getContractUrl(platform) {
    return safeGet(platform, 'contract_url');
}

/**
 * Calculate platform percentage of total coin supply
 * @param {Object} platformData - Platform-specific coin data
 * @param {Object} coin - Full coin object
 * @param {Object} formatter - Formatter functions
 * @returns {string} Formatted percentage or 'No data'
 */
function getPlatformPercentage(platformData, coin, formatter) {
    const platformSupply = safeNumber(safeGet(platformData, 'circulating_supply'));
    const totalSupply = safeNumber(safeGet(coin, 'scw.circulating_supply'));
    
    if (platformSupply === 0 || totalSupply === 0) return 'No data';
    
    // Business logic validation: platform supply should not exceed total supply
    if (platformSupply > totalSupply) {
        console.warn(`Platform supply (${platformSupply}) exceeds total supply (${totalSupply}). Data inconsistency detected.`);
        return 'Data Error';
    }
    
    // Check for negative values
    if (platformSupply < 0 || totalSupply < 0) {
        console.warn(`Negative supply values: platform=${platformSupply}, total=${totalSupply}`);
        return 'No data';
    }
    
    const percentage = (platformSupply / totalSupply) * 100;
    
    // Additional bounds checking (should not exceed 100% given validation above)
    if (percentage > 100) {
        console.warn(`Platform percentage exceeds 100%: ${percentage.toFixed(2)}%`);
        return '100.00%'; // Cap at 100%
    }
    
    if (percentage < 0) {
        console.warn(`Negative platform percentage: ${percentage.toFixed(2)}%`);
        return '0.00%'; // Floor at 0%
    }
    
    // Round to prevent precision issues
    const roundedPercentage = Math.round(percentage * 100) / 100;
    
    return formatter && formatter.formatPercentage 
        ? formatter.formatPercentage(roundedPercentage, 2)
        : `${roundedPercentage.toFixed(2)}%`;
}

/**
 * Calculate platform percentage for chart data (returns numeric value)
 * @param {Object} platformData - Platform-specific coin data
 * @param {Object} coin - Full coin object
 * @param {Object} formatter - Formatter functions for display formatting
 * @returns {number|undefined} Numeric percentage or undefined for chart
 */
function getPlatformChartPercentage(platformData, coin, formatter) {
    const platformSupply = safeNumber(safeGet(platformData, 'circulating_supply'));
    const totalSupply = safeNumber(safeGet(coin, 'scw.circulating_supply'));
    
    if (platformSupply === 0 || totalSupply === 0) return undefined;
    
    const percentage = (platformSupply / totalSupply) * 100;
    return formatter && formatter.formatNumber 
        ? formatter.formatNumber(percentage, 2)
        : parseFloat(percentage.toFixed(2));
}

/*---------------------------------------------------------
    CROSS-CHAIN PLATFORM HELPERS
---------------------------------------------------------*/

/**
 * Get formatted platform supply display with fallback
 * @param {Object} platform - Platform data object
 * @param {Object} formatter - Formatter functions
 * @returns {string} Formatted supply or 'No data'
 */
function getPlatformSupplyDisplay(platform, formatter) {
    const supply = safeGet(platform, 'total_supply');
    if (!supply || supply === 0) return 'No data';
    
    const formatted = safeGet(platform, 'total_supply_s');
    return formatted || (formatter && formatter.formatSupply ? formatter.formatSupply(supply) : safeString(supply, 'No data'));
}

/**
 * Get platform supply percentage display
 * @param {Object} platform - Platform data object
 * @returns {string} Formatted percentage or 'No data'
 */
function getPlatformSupplyPercentage(platform) {
    const percentage = safeGet(platform, 'supply_percentage');
    if (percentage === null || percentage === undefined) return 'No data';
    
    const formatted = safeGet(platform, 'supply_percentage_s');
    return formatted || `${percentage.toFixed(2)}%`;
}

/**
 * Get dominant stablecoin display for a platform
 * @param {Object} platform - Platform data object
 * @param {Object} formatter - Formatter functions
 * @returns {string} Dominant stablecoin info or 'No data'
 */
function getDominantStablecoin(platform, formatter) {
    const dominant = safeGet(platform, 'dominant_stablecoin');
    if (!dominant || !dominant.name) return 'No data';
    
    const supply = formatter && formatter.formatSupply ? 
        formatter.formatSupply(dominant.supply) : 
        safeString(dominant.supply, '');
        
    return supply ? `${dominant.symbol} (${supply})` : dominant.symbol;
}

/**
 * Format chain supply breakdown for display
 * @param {Array} breakdown - Supply breakdown array
 * @param {number} [limit=3] - Maximum number of items to display
 * @returns {string} Formatted breakdown display
 */
function getChainBreakdownDisplay(breakdown, limit = 3) {
    if (!Array.isArray(breakdown) || breakdown.length === 0) {
        return 'No breakdown available';
    }
    
    const displayItems = breakdown.slice(0, limit);
    const formatted = displayItems.map(item => {
        const percentage = item.percentage ? ` (${item.percentage}%)` : '';
        return `${item.symbol}${percentage}`;
    });
    
    if (breakdown.length > limit) {
        const remaining = breakdown.length - limit;
        formatted.push(`+${remaining} more`);
    }
    
    return formatted.join(', ');
}


/**
 * Check if platform has cross-chain supply data
 * @param {Object} platform - Platform data object
 * @returns {boolean} True if platform has supply breakdown data
 */
function hasCrossChainData(platform) {
    const breakdown = safeGet(platform, 'supply_breakdown');
    return Array.isArray(breakdown) && breakdown.length > 0;
}

/**
 * Get platform stablecoin count with proper pluralization
 * @param {Object} platform - Platform data object
 * @returns {string} Formatted count string
 */
function getPlatformCoinCount(platform) {
    const count = safeGet(platform, 'coin_count', 0);
    if (count === 0) return 'No stablecoins';
    if (count === 1) return '1 stablecoin';
    return `${count} stablecoins`;
}

/**
 * Get platform rank indicator based on supply or market cap
 * @param {number} index - Platform index in sorted list (0-based)
 * @param {string} [metric='supply'] - Ranking metric ('supply' or 'mcap')
 * @returns {string} Rank indicator
 */
function getPlatformRank(index, metric = 'supply') {
    const rank = index + 1;
    const suffix = metric === 'supply' ? ' by supply' : ' by market cap';
    
    if (rank === 1) return `#${rank} (Leading${suffix})`;
    if (rank <= 3) return `#${rank} (Top 3${suffix})`;
    if (rank <= 5) return `#${rank} (Top 5${suffix})`;
    if (rank <= 10) return `#${rank} (Top 10${suffix})`;
    return `#${rank}${suffix}`;
}

/**
 * Format platform comparison metric
 * @param {Object} platform - Platform data object
 * @param {string} metric - Metric to compare ('supply_percentage', 'mcap_sum', 'coin_count')
 * @param {Object} formatter - Formatter functions
 * @returns {string} Formatted comparison metric
 */
function getPlatformMetric(platform, metric, formatter) {
    switch (metric) {
        case 'supply_percentage':
            return getPlatformSupplyPercentage(platform);
        case 'supply':
            return getPlatformSupplyDisplay(platform, formatter);
        case 'mcap':
            return safeString(safeGet(platform, 'mcap_sum_s'), 'No data');
        case 'coin_count':
            return getPlatformCoinCount(platform);
        default:
            return 'Unknown metric';
    }
}

/*---------------------------------------------------------
    PAGE VIEW HELPERS
---------------------------------------------------------*/

const SOURCE_ORDER = ['cmc', 'messari', 'coingecko', 'defillama'];
const SOURCE_NAMES = {
    cmc: 'CoinMarketCap',
    messari: 'Messari',
    coingecko: 'CoinGecko',
    defillama: 'DeFiLlama',
    app: 'Web app'
};
const SOURCE_ROLES = {
    cmc: 'Prices, market caps and volume',
    messari: 'Supply and project descriptions',
    coingecko: 'Prices, volume and logos',
    defillama: 'Supply by chain and supply history'
};
const MINUS = '−';
const DASH = '—';
// A USD-pegged coin priced between these bounds accrues yield (tokenized T-bills, yield vaults)
// rather than holding a peg. Far above the ceiling it is more likely a de-pegged coin.
const YIELD_PRICE_FLOOR = 1.03;
const YIELD_PRICE_CEILING = 1.25;
const PEG_ON_BP = 10;
const PEG_DRIFT_BP = 50;

function isNum(v) {
    return typeof v === 'number' && isFinite(v);
}

/**
 * Display name for a data source id (e.g. 'cmc' -> 'CoinMarketCap')
 * @param {string} id - Source id
 * @returns {string} Human-readable name
 */
function sourceName(id) {
    const key = String(id || '').toLowerCase();
    return SOURCE_NAMES[key] || String(id || '').toUpperCase();
}

/**
 * Short description of what a data source contributes
 * @param {string} id - Source id
 * @returns {string} Role text, or empty string
 */
function sourceRole(id) {
    return SOURCE_ROLES[String(id || '').toLowerCase()] || '';
}

/**
 * Formats a number with a sign, e.g. +0.51% or −2.32%
 * @param {number} value - Value to format
 * @param {number} decimals - Decimal places
 * @param {string} suffix - Unit suffix
 * @returns {string} Signed string, or an em dash when missing
 */
function formatSigned(value, decimals = 2, suffix = '%') {
    if (!isNum(value)) return DASH;
    const rounded = Number(value.toFixed(decimals));
    const sign = rounded > 0 ? '+' : rounded < 0 ? MINUS : '';
    return `${sign}${Math.abs(rounded).toFixed(decimals)}${suffix}`;
}

/**
 * CSS class for a signed change value
 * @param {number} value - Change value
 * @returns {string} 'text-up', 'text-down' or 'text-secondary'
 */
function changeClass(value) {
    if (!isNum(value) || Number(value.toFixed(2)) === 0) return 'text-secondary';
    return value > 0 ? 'text-up' : 'text-down';
}

/**
 * Formats large numbers compactly (e.g. $168.9B, 75.12B)
 * @param {number} value - Value to format
 * @param {Object} opts - { dollar: boolean, decimals: number }
 * @returns {string} Compact string, or an em dash when missing
 */
function formatCompact(value, opts = {}) {
    const { dollar = true, decimals = 1 } = opts;
    if (!isNum(value)) return DASH;
    const prefix = dollar ? '$' : '';
    const abs = Math.abs(value);
    if (abs >= 1e12) return `${prefix}${(value / 1e12).toFixed(decimals)}T`;
    if (abs >= 1e9) return `${prefix}${(value / 1e9).toFixed(decimals)}B`;
    if (abs >= 1e6) return `${prefix}${(value / 1e6).toFixed(decimals)}M`;
    if (abs >= 1e3) return `${prefix}${(value / 1e3).toFixed(decimals)}K`;
    return `${prefix}${value.toFixed(dollar ? 2 : 0)}`;
}

/**
 * Formats a share percentage, showing '<0.01%' instead of rounding small shares to zero
 * @param {number} value - Percentage value
 * @returns {string} Formatted share, or an em dash when missing
 */
function formatShare(value) {
    if (!isNum(value)) return DASH;
    if (value > 0 && value < 0.01) return '<0.01%';
    return `${value.toFixed(2)}%`;
}

/**
 * Formats a stablecoin price with enough precision to show peg drift
 * @param {number} price - Price in USD
 * @param {number} decimals - Decimal places for prices near $1
 * @returns {string} Formatted price, or an em dash when missing
 */
function formatPegPrice(price, decimals = 4) {
    if (!isNum(price)) return DASH;
    if (price >= 1000) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (price >= 0.01) return `$${price.toFixed(decimals)}`;
    return `$${price.toPrecision(3)}`;
}

/**
 * Formats a timestamp in UTC
 * @param {number|string|Date} ts - Timestamp
 * @param {boolean} long - true for '26 Oct 2026, 18:30:11 UTC', false for '18:30 UTC'
 * @returns {string} Formatted time, or 'Unknown'
 */
function formatUtc(ts, long = false) {
    const d = ts instanceof Date ? ts : new Date(ts);
    if (!ts || isNaN(d.getTime())) return 'Unknown';
    const pad = (n) => String(n).padStart(2, '0');
    const time = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
    if (!long) return `${time} UTC`;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${time}:${pad(d.getUTCSeconds())} UTC`;
}

/**
 * Title-cases a DeFiLlama peg mechanism (e.g. 'fiat-backed' -> 'Fiat-backed')
 * @param {string} mechanism - Raw mechanism
 * @returns {string|null} Display label
 */
function formatMechanism(mechanism) {
    if (!mechanism || typeof mechanism !== 'string') return null;
    return mechanism.charAt(0).toUpperCase() + mechanism.slice(1);
}

function _pegLabel(peg) {
    if (peg === 'VAR') return 'Variable peg';
    return `${peg} peg`;
}

/**
 * Peg status of a coin from its price and peg currency.
 * Only USD-pegged coins are measured; other pegs and yield-bearing coins are labelled.
 * @param {Object} coin - Stablecoin view model, or a platform coin entry ({ price, pegged_asset })
 * @param {number} [priceOverride] - Price to use instead of the coin's merged price
 * @returns {{state: string, text: string, badgeClass: string, bp: number|null, filter: string}}
 */
function getPegStatus(coin, priceOverride) {
    const peg = coin?.pegged_asset || null;
    const price = isNum(priceOverride) ? priceOverride : (isNum(coin?.main?.price) ? coin.main.price : coin?.price);
    const neutral = (text, filter) => ({ state: 'neutral', text, badgeClass: 'badge-neutral', bp: null, filter });

    if (!peg) return neutral('No peg data', 'other');
    if (peg !== 'USD') return neutral(_pegLabel(peg), peg === 'EUR' ? 'eur' : 'other');
    if (!isNum(price)) return neutral('No price feed', 'usd');
    if (price >= YIELD_PRICE_FLOOR && price <= YIELD_PRICE_CEILING) return neutral('Yield-bearing', 'yield');

    const bp = (price - 1) * 10000;
    const abs = Math.abs(bp);
    const text = formatSigned(bp, 1, ' bp');
    if (abs <= PEG_ON_BP) return { state: 'on', text, badgeClass: 'badge-success', bp, filter: 'usd' };
    if (abs <= PEG_DRIFT_BP) return { state: 'drift', text, badgeClass: 'badge-warning', bp, filter: 'usd' };
    return { state: 'off', text, badgeClass: 'badge-error', bp, filter: 'usd' };
}

/**
 * Counts USD-pegged coins by peg status and finds the largest coin off its peg
 * @param {Array} stablecoins - Stablecoin view models
 * @returns {{on: number, drift: number, off: number, largestOff: Object|null}}
 */
function getPegWatch(stablecoins) {
    const result = { on: 0, drift: 0, off: 0, largestOff: null };
    for (const coin of stablecoins || []) {
        const status = getPegStatus(coin);
        if (status.state === 'on') result.on++;
        else if (status.state === 'drift') result.drift++;
        else if (status.state === 'off') {
            result.off++;
            const mcap = coin?.main?.circulating_mcap || 0;
            if (!result.largestOff || mcap > result.largestOff.mcap) {
                result.largestOff = { symbol: coin.symbol, uri: coin.uri, text: status.text, mcap };
            }
        }
    }
    return result;
}

/**
 * Market share of the largest coins
 * @param {Array} stablecoins - Stablecoin view models, sorted by market cap
 * @param {number} total - Total market cap
 * @param {number} count - Number of named segments
 * @returns {{segments: Array, others: {count: number, pct: number}}}
 */
function getMarketShare(stablecoins, total, count = 5) {
    const list = (stablecoins || []).filter(c => isNum(c?.main?.circulating_mcap));
    if (!isNum(total) || total <= 0) return { segments: [], others: { count: 0, pct: 0 } };
    const segments = list.slice(0, count).map(c => ({
        symbol: c.symbol,
        pct: (c.main.circulating_mcap / total) * 100
    }));
    const named = segments.reduce((s, x) => s + x.pct, 0);
    return { segments, others: { count: Math.max(list.length - segments.length, 0), pct: Math.max(100 - named, 0) } };
}

/**
 * Aggregate supply change of USD-pegged coins over 7 and 30 days
 * @param {Array} stablecoins - Stablecoin view models
 * @returns {{d7: number|null, d30: number|null}}
 */
function getMarketSupplyChange(stablecoins) {
    let cur7 = 0, prev7 = 0, cur30 = 0, prev30 = 0;
    for (const coin of stablecoins || []) {
        const sc = coin?.supply_change;
        if (coin?.pegged_asset !== 'USD' || !sc || !isNum(sc.current)) continue;
        if (isNum(sc.prevWeek) && sc.prevWeek > 0) { cur7 += sc.current; prev7 += sc.prevWeek; }
        if (isNum(sc.prevMonth) && sc.prevMonth > 0) { cur30 += sc.current; prev30 += sc.prevMonth; }
    }
    return {
        d7: prev7 > 0 ? ((cur7 - prev7) / prev7) * 100 : null,
        d30: prev30 > 0 ? ((cur30 - prev30) / prev30) * 100 : null
    };
}

function _chainPlatforms(coin) {
    return (coin?.platforms || [])
        .filter(p => p?.name && p.name !== 'Unknown')
        .map(p => ({ platform: p, supply: p.total_supply || p.circulating_supply || 0 }));
}

/**
 * Number of chains a coin is on, and the chain holding most of its supply
 * @param {Object} coin - Stablecoin view model
 * @returns {{count: number, name: string|null, pct: number|null}}
 */
function getTopChain(coin) {
    const chains = _chainPlatforms(coin);
    if (chains.length === 0) return { count: 0, name: null, pct: null };
    const total = chains.reduce((s, c) => s + c.supply, 0);
    const top = chains.reduce((best, c) => (c.supply > best.supply ? c : best), chains[0]);
    return {
        count: chains.length,
        name: top.platform.name,
        pct: total > 0 && top.supply > 0 ? Math.round((top.supply / total) * 100) : null
    };
}

/**
 * A coin's supply split across chains, largest first
 * @param {Object} coin - Stablecoin view model
 * @param {number} limit - Number of chains to return
 * @returns {{chains: Array, rest: {count: number, supply: number, pct: number}, total: number}}
 */
function getChainSupply(coin, limit = 8) {
    const pegKey = coin?.defillamaData?.pegType || null;
    const chains = _chainPlatforms(coin).filter(c => c.supply > 0).sort((a, b) => b.supply - a.supply);
    const total = chains.reduce((s, c) => s + c.supply, 0);
    const rows = chains.slice(0, limit).map(({ platform, supply }) => {
        const prev = pegKey ? platform.historical_data?.prevWeek?.[pegKey] : null;
        return {
            name: platform.name,
            uri: String(platform.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
            supply,
            pct: total > 0 ? (supply / total) * 100 : 0,
            change7d: isNum(prev) && prev > 0 ? ((supply - prev) / prev) * 100 : null
        };
    });
    const restSupply = chains.slice(limit).reduce((s, c) => s + c.supply, 0);
    return {
        chains: rows,
        rest: { count: Math.max(chains.length - rows.length, 0), supply: restSupply, pct: total > 0 ? (restSupply / total) * 100 : 0 },
        total
    };
}

function _median(values) {
    const s = values.slice().sort((a, b) => a - b);
    if (s.length === 0) return null;
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Each source's own figures for a coin, plus the spread between them
 * @param {Object} coin - Stablecoin view model
 * @returns {{rows: Array, spread: Object, median: number|null, scaleBp: number}}
 */
function getSourceComparison(coin) {
    const snapshots = coin?.source_snapshots || {};
    const shown = coin?.value_sources || {};
    const rows = SOURCE_ORDER
        .filter(id => snapshots[id])
        .map(id => {
            const s = snapshots[id];
            const bp = isNum(s.price) && coin?.pegged_asset === 'USD' ? (s.price - 1) * 10000 : null;
            return {
                id,
                name: sourceName(id),
                role: sourceRole(id),
                price: s.price,
                bp,
                marketCap: s.marketCap,
                volume: s.volume24h,
                shown: {
                    price: shown.price === id,
                    marketCap: shown.marketCap === id,
                    volume: shown.volume === id
                }
            };
        })
        .filter(r => isNum(r.price) || isNum(r.marketCap) || isNum(r.volume));

    const prices = rows.map(r => r.price).filter(isNum);
    const caps = rows.map(r => r.marketCap).filter(isNum);
    const vols = rows.map(r => r.volume).filter(v => isNum(v) && v > 0);
    const spread = {
        priceBp: prices.length > 1 ? ((Math.max(...prices) - Math.min(...prices)) / _median(prices)) * 10000 : null,
        marketCapPct: caps.length > 1 ? ((Math.max(...caps) - Math.min(...caps)) / Math.min(...caps)) * 100 : null,
        volumeRatio: vols.length > 1 ? Math.max(...vols) / Math.min(...vols) : null,
        volumeMin: vols.length > 1 ? Math.min(...vols) : null,
        volumeMax: vols.length > 1 ? Math.max(...vols) : null
    };

    // Scale for the price-by-source chart: at least ±5 bp, wide enough for every source
    const maxBp = rows.reduce((m, r) => (isNum(r.bp) ? Math.max(m, Math.abs(r.bp)) : m), 0);
    const scaleBp = [5, 10, 25, 50, 100, 250, 500, 1000].find(v => v >= maxBp) || Math.ceil(maxBp);
    rows.forEach(r => {
        r.position = isNum(r.bp) ? Math.min(Math.max(((r.bp + scaleBp) / (2 * scaleBp)) * 100, 0), 100) : null;
    });

    return { rows, spread, median: _median(prices), scaleBp };
}

/**
 * The coin's written description and which source it came from
 * @param {Object} coin - Stablecoin view model
 * @returns {{html: string, source: string}|null}
 */
function getDescription(coin) {
    const snapshots = coin?.source_snapshots || {};
    for (const id of ['messari', 'coingecko', 'cmc']) {
        const desc = snapshots[id]?.description;
        if (desc && typeof desc === 'string' && desc.trim()) {
            return { html: desc, source: sourceName(id) };
        }
    }
    return null;
}

/**
 * Summary figures for the blockchains page
 * @param {Array} platformData - Platform view models, sorted by value
 * @param {number} count - Number of named segments in the share bar
 * @returns {Object} Totals, concentration and share-bar segments
 */
function getChainsSummary(platformData, count = 5) {
    const list = (platformData || []).filter(p => isNum(p?.mcap_sum));
    const total = list.reduce((s, p) => s + p.mcap_sum, 0);
    const pct = (v) => (total > 0 ? (v / total) * 100 : 0);
    const sumTop = (n) => pct(list.slice(0, n).reduce((s, p) => s + p.mcap_sum, 0));
    const segments = list.slice(0, count).map(p => ({ name: p.name, pct: pct(p.mcap_sum) }));
    return {
        total,
        count: list.length,
        overMillion: list.filter(p => p.mcap_sum >= 1e6).length,
        top: list[0] ? { name: list[0].name, pct: pct(list[0].mcap_sum) } : null,
        next: list[1] ? { name: list[1].name, pct: pct(list[1].mcap_sum) } : null,
        top2: sumTop(2),
        top10: sumTop(10),
        segments,
        others: { count: Math.max(list.length - segments.length, 0), pct: Math.max(100 - segments.reduce((s, x) => s + x.pct, 0), 0) }
    };
}

/**
 * Icon URL for a chain from DeFiLlama's icon CDN
 * @param {string} name - Chain display name
 * @returns {string} Icon URL
 */
function getChainIcon(name) {
    return `https://icons.llamao.fi/icons/chains/rsz_${encodeURIComponent(String(name || '').toLowerCase())}`;
}

/*---------------------------------------------------------
    EXPORTS
---------------------------------------------------------*/

module.exports = {
    // Page view helpers
    sourceName,
    sourceRole,
    formatSigned,
    changeClass,
    formatCompact,
    formatShare,
    formatPegPrice,
    formatUtc,
    formatMechanism,
    getPegStatus,
    getPegWatch,
    getMarketShare,
    getMarketSupplyChange,
    getTopChain,
    getChainSupply,
    getSourceComparison,
    getDescription,
    getChainsSummary,
    getChainIcon,

    // Safe property access
    safeGet,
    safeString,
    safeNumber,
    
    // Data-specific helpers
    getPrice,
    getMarketCap,
    getSupply,
    getVolume,
    getImage,
    getPlatformDisplay,
    
    // Business logic helpers
    calculateDominance,
    hasValidData,
    getFormattedPrice,
    getDominanceDisplay,
    hasDescription,
    getContractUrl,
    getPlatformPercentage,
    getPlatformChartPercentage,
    
    // Cross-chain platform helpers
    getPlatformSupplyDisplay,
    getPlatformSupplyPercentage,
    getDominantStablecoin,
    getChainBreakdownDisplay,
    hasCrossChainData,
    getPlatformCoinCount,
    getPlatformRank,
    getPlatformMetric
};
