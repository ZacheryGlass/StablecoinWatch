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
    EXPORTS
---------------------------------------------------------*/

module.exports = {
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
    getPlatformChartPercentage
};