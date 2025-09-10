/**
 * Utility class for formatting numerical values and text for display.
 * Provides standardized formatting for currency values, large numbers, and URL-friendly slugs.
 * 
 * @class DataFormatter
 */
class DataFormatter {
    /**
     * Formats numerical values with appropriate units and currency symbols.
     * Converts large numbers to readable format with B (billions), M (millions), K (thousands) suffixes.
     * Handles edge cases and provides fallback for invalid numbers.
     * 
     * @param {number} num - Numerical value to format
     * @param {boolean} [includeDollarSign=true] - Whether to include dollar sign prefix
     * @returns {string} Formatted number string with appropriate units
     * @static
     * @memberof DataFormatter
     */
    static formatNumber(num, includeDollarSign = true) {
        if (typeof num !== 'number' || !isFinite(num)) return 'No data';
        const prefix = includeDollarSign ? '$' : '';
        if (num >= 1e9) return prefix + (num / 1e9).toFixed(1) + 'B';
        if (num >= 1e6) return prefix + (num / 1e6).toFixed(1) + 'M';
        if (num >= 1e3) return prefix + (num / 1e3).toFixed(1) + 'K';
        return prefix + num.toFixed(includeDollarSign ? 2 : 0);
    }

    /**
     * Converts text to URL-friendly slug format.
     * Converts to lowercase, replaces non-alphanumeric characters with hyphens,
     * and removes leading/trailing hyphens.
     * 
     * @param {string} text - Text to convert to slug
     * @returns {string} URL-friendly slug string
     * @static
     * @memberof DataFormatter
     */
    static slugify(text) {
        if (!text) return '';
        return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    }

    /**
     * Validates if a number is suitable for formatting.
     * Checks if the value is a finite number and not null/undefined.
     * 
     * @param {*} value - Value to validate
     * @returns {boolean} True if value is a valid number for formatting
     * @static
     * @memberof DataFormatter
     */
    static isValidNumber(value) {
        return typeof value === 'number' && isFinite(value) && value !== null;
    }

    /**
     * Formats a percentage value with appropriate precision.
     * 
     * @param {number} value - Percentage value to format
     * @param {number} [decimals=2] - Number of decimal places
     * @returns {string} Formatted percentage string
     * @static
     * @memberof DataFormatter
     */
    static formatPercentage(value, decimals = 2) {
        if (!this.isValidNumber(value)) return 'No data';
        return `${value.toFixed(decimals)}%`;
    }
}

module.exports = DataFormatter;