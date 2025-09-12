/*---------------------------------------------------------
    MODULE-SCOPED VARIABLES
---------------------------------------------------------*/
const CLR = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    magenta: '\x1b[35m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
};

/*---------------------------------------------------------
    FUNCTIONS
---------------------------------------------------------*/

/**
 * Pause execution for a specified amount of time
 * @param {number} ms - The number of milliseconds to sleep
 * @returns {Promise} A promise that resolves after the specified delay
 */
exports.sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Return a USD currency formatted string from a number input
 * @param {number} v - The numeric value to format
 * @returns {string} The formatted currency string (e.g., $1.2B, $500M, $1,000)
 */
exports.toDollarString = (v) => {
    if (!v) return v;

    const BILLION = 1000000000;
    const MILLION = 1000000;

    if (v >= BILLION) {
        return `$${(v / BILLION).toFixed(2)}B`;
    } else if (v >= MILLION) {
        return `$${(v / MILLION).toFixed(1)}M`;
    } else {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(v);
    }
};

/**
 * Format numbers with consistent comma separators and decimals
 * @param {number} value - The numeric value to format
 * @param {number} [decimals=0] - The number of decimal places to show
 * @returns {string} The formatted number string or 'No data' for invalid inputs
 */
exports.formatNumber = (value, decimals = 0) => {
    if (value === null || value === undefined || typeof value !== 'number' || isNaN(value)) {
        return 'No data';
    }
    
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value);
};

/**
 * Format stablecoin prices with 3 decimal places for consistency
 * @param {number} value - The price value to format
 * @returns {string} The formatted price string with $ prefix or 'No data' for invalid inputs
 */
exports.formatPrice = (value) => {
    if (value === null || value === undefined || typeof value !== 'number' || isNaN(value)) {
        return 'No data';
    }
    
    return `$${exports.formatNumber(value, 3)}`;
};

/**
 * Format percentages with consistent decimal places
 * @param {number} value - The percentage value to format
 * @param {number} [decimals=2] - The number of decimal places to show
 * @returns {string} The formatted percentage string with % suffix or 'No data' for invalid inputs
 */
exports.formatPercentage = (value, decimals = 2) => {
    if (value === null || value === undefined || typeof value !== 'number' || isNaN(value)) {
        return 'No data';
    }
    
    return `${exports.formatNumber(value, decimals)}%`;
};

/**
 * Format token supply numbers with comma separators, no decimals
 * @param {number} value - The supply value to format
 * @returns {string} The formatted supply number string or 'No data' for invalid inputs
 */
exports.formatSupply = (value) => {
    if (value === null || value === undefined || typeof value !== 'number' || isNaN(value)) {
        return 'No data';
    }
    
    return exports.formatNumber(value, 0);
};

/**
 * Function generator that returns a function to sort objects by a specified numeric property
 * Also works for sorting based on nested object properties. Non-numeric values are sorted to the end.
 * @param {...string} properties - The property names to navigate (supports nested properties)
 * @returns {Function} A comparator function for Array.sort()
 * @example
 * // Sort by obj.out.in value
 * myArray.sort(sortObjByNumProperty('out', 'in'))
 */
exports.sortObjByNumProperty = function (/* string: property, ... */) {
    let properies = Array.prototype.slice.call(arguments);

    let sorter = function (a, b) {
        // Get the specified nested object property for which to sort by
        for (let i = 0; i < properies.length; i++) {
            // check for non-objects
            if (typeof a !== 'object' || a === null) return 1;
            if (typeof b !== 'object' || b === null) return -1;

            a = a[properies[i]];
            b = b[properies[i]];
        }

        // check for non-numbers properties
        if (typeof a !== 'number') return 1;
        if (typeof b !== 'number') return -1;

        // check for property value NaN
        if (a !== a) return 1;
        if (b !== b) return -1;

        // if all safety checks pass, sort based on number value
        return b - a;
    };

    // return the generated sort function
    return sorter;
};

/**
 * Remove HTML tags from a string of text
 * @param {string} str - The string containing HTML tags to remove
 * @returns {string} The string with HTML tags removed
 */
exports.stripHTML = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/<[^>]*>?/gm, '');
};

/**
 * Determine the blockchain platform from a token type string
 * @param {string} token - The token type identifier (e.g., 'ERC20', 'TRC20', 'BEP20')
 * @returns {string} The platform name (ethereum, tron, binance-smart-chain, bitcoin, bitcoin-cash, native, or unknown)
 */
exports.getTokenPlatform = (token) => {
    if (typeof token !== 'string') return 'unknown';

    if (token.toUpperCase().startsWith('ERC')) {
        return 'ethereum';
    } else if (token.toUpperCase().startsWith('TRC')) {
        return 'tron';
    } else if (token.toUpperCase().startsWith('BEP')) {
        return 'binance-smart-chain';
    } else if (token.toLowerCase() == 'omni') {
        return 'bitcoin';
    } else if (token.toLowerCase() == 'slp') {
        return 'bitcoin-cash';
    } else if (token.toLowerCase() == 'native') {
        return 'native';
    } else {
        return 'unknown';
    }
};

/**
 * Convert URLs in text to HTML anchor tags
 * @param {string} text - The text containing URLs to convert
 * @returns {string} The text with URLs wrapped in <a> tags
 */
exports.urlify = (text) => {
    var urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, function (url) {
        return '<a href="' + url + '">' + url + '</a>';
    });
};

/**
 * Print a message to the console in a specified color with a specified prefix
 * @param {string} clr - The ANSI color code
 * @param {string} prefix - The prefix to show before the message
 * @param {Arguments} msgs - The messages to print
 */
const print_custom = function (clr, prefix, msgs) {
    if (global.DEBUG) process.stdout.write(clr);

    process.stdout.write(prefix + ':');
    for (let i = 0; i < msgs.length; i++) {
        process.stdout.write(' ');
        process.stdout.write('' + msgs[i]);
    }
    process.stdout.write('\n');

    if (global.DEBUG) process.stdout.write(CLR.reset);
};

/**
 * Override console.warn to print warnings with custom formatting
 */
console.warn = function () {
    print_custom(CLR.magenta, 'WARNING', arguments);
};

/**
 * Override console.info to print info messages with custom formatting
 */
console.info = function () {
    print_custom(CLR.green, 'INFO', arguments);
};

/**
 * Override console.error to print errors with custom formatting
 */
console.error = function () {
    print_custom(CLR.red, 'ERROR', arguments);
};

/**
 * Override console.debug to print debug messages with custom formatting
 * Only prints when global.DEBUG is true
 */
console.debug = function () {
    if (global.DEBUG) print_custom(CLR.cyan, 'DEBUG', arguments);
};
