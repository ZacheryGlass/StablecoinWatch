/**
 * Interface for data formatting services.
 * Defines the contract for formatting numerical values, currency amounts, and text for display.
 * Abstracts formatting logic to enable loose coupling and swappable formatting implementations.
 * 
 * @interface IDataFormatter
 */
class IDataFormatter {
    constructor() {
        if (this.constructor === IDataFormatter) {
            throw new Error('Cannot instantiate interface IDataFormatter directly');
        }
    }

    /**
     * Formats numerical values with appropriate units and currency symbols.
     * Converts large numbers to readable format with standard suffixes (B, M, K).
     * 
     * @param {number} value - Numerical value to format
     * @param {Object} [options={}] - Formatting options
     * @param {boolean} [options.includeCurrency=true] - Whether to include currency symbol
     * @param {string} [options.currency='$'] - Currency symbol to use
     * @param {number} [options.precision=1] - Decimal places for large numbers
     * @returns {string} Formatted number string with appropriate units
     * @abstract
     * @memberof IDataFormatter
     */
    formatNumber(value, options = {}) {
        throw new Error('Method formatNumber() must be implemented by concrete formatter');
    }

    /**
     * Formats currency values with consistent styling.
     * Specialized formatting for currency amounts with appropriate precision.
     * 
     * @param {number} amount - Currency amount to format
     * @param {Object} [options={}] - Formatting options
     * @param {string} [options.currency='USD'] - Currency code
     * @param {string} [options.symbol='$'] - Currency symbol
     * @param {boolean} [options.compact=true] - Use compact notation for large amounts
     * @returns {string} Formatted currency string
     * @abstract
     * @memberof IDataFormatter
     */
    formatCurrency(amount, options = {}) {
        throw new Error('Method formatCurrency() must be implemented by concrete formatter');
    }

    /**
     * Formats percentage values with appropriate precision.
     * 
     * @param {number} value - Percentage value to format
     * @param {Object} [options={}] - Formatting options
     * @param {number} [options.decimals=2] - Number of decimal places
     * @param {boolean} [options.includeSymbol=true] - Whether to include % symbol
     * @returns {string} Formatted percentage string
     * @abstract
     * @memberof IDataFormatter
     */
    formatPercentage(value, options = {}) {
        throw new Error('Method formatPercentage() must be implemented by concrete formatter');
    }

    /**
     * Converts text to URL-friendly slug format.
     * Standardizes text for use in URLs, IDs, and other web-friendly contexts.
     * 
     * @param {string} text - Text to convert to slug
     * @param {Object} [options={}] - Slugification options
     * @param {string} [options.separator='-'] - Separator character for spaces
     * @param {boolean} [options.lowercase=true] - Convert to lowercase
     * @returns {string} URL-friendly slug string
     * @abstract
     * @memberof IDataFormatter
     */
    slugify(text, options = {}) {
        throw new Error('Method slugify() must be implemented by concrete formatter');
    }

    /**
     * Formats large numbers with appropriate suffixes (K, M, B, T).
     * Provides consistent compact notation for large numerical values.
     * 
     * @param {number} value - Number to format
     * @param {Object} [options={}] - Formatting options
     * @param {number} [options.precision=1] - Decimal places for formatted number
     * @param {Array<string>} [options.suffixes] - Custom suffix array
     * @returns {string} Formatted number with suffix
     * @abstract
     * @memberof IDataFormatter
     */
    formatCompactNumber(value, options = {}) {
        throw new Error('Method formatCompactNumber() must be implemented by concrete formatter');
    }

    /**
     * Validates if a value is suitable for formatting.
     * Checks if the provided value can be safely formatted by this formatter.
     * 
     * @param {*} value - Value to validate
     * @param {string} [type='number'] - Expected value type
     * @returns {boolean} True if value is valid for formatting
     * @abstract
     * @memberof IDataFormatter
     */
    isValidValue(value, type = 'number') {
        throw new Error('Method isValidValue() must be implemented by concrete formatter');
    }

    /**
     * Gets the default fallback value for invalid inputs.
     * Returns standardized fallback text when formatting fails.
     * 
     * @param {string} [type='number'] - Type of value that failed formatting
     * @returns {string} Fallback display text
     * @abstract
     * @memberof IDataFormatter
     */
    getDefaultFallback(type = 'number') {
        throw new Error('Method getDefaultFallback() must be implemented by concrete formatter');
    }

    /**
     * Gets metadata about the formatter implementation.
     * Returns information about formatting capabilities and configuration.
     * 
     * @returns {Object} Formatter metadata
     * @returns {string} returns.name - Formatter name
     * @returns {string} returns.version - Implementation version
     * @returns {Array} returns.supportedTypes - Supported data types
     * @returns {Object} returns.defaults - Default formatting options
     * @abstract
     * @memberof IDataFormatter
     */
    getFormatterInfo() {
        throw new Error('Method getFormatterInfo() must be implemented by concrete formatter');
    }
}

module.exports = IDataFormatter;