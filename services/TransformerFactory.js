const HybridTransformerAdapter = require('./HybridTransformerAdapter');
const DataFormatter = require('./formatters/DataFormatter');

/**
 * Factory class for creating transformer and formatter instances with proper configuration.
 * Encapsulates transformer creation logic to enable loose coupling and easy implementation swapping.
 * Provides centralized configuration and dependency management for transformation components.
 * 
 * @class TransformerFactory
 */
class TransformerFactory {
    /**
     * Creates a view model transformer instance with default configuration.
     * Returns a transformer that implements IViewModelTransformer for data transformation.
     * 
     * @param {Object} [options={}] - Configuration options for the transformer
     * @param {string} [options.type='hybrid'] - Type of transformer to create
     * @param {Object} [options.config={}] - Additional configuration parameters
     * @returns {IViewModelTransformer} Configured view model transformer instance
     * @static
     * @memberof TransformerFactory
     */
    static createViewModelTransformer(options = {}) {
        const { type = 'hybrid', config = {} } = options;
        
        switch (type) {
            case 'hybrid':
                // Use adapter to accept aggregated DTOs from service
                return new HybridTransformerAdapter(config);
            default:
                throw new Error(`Unknown transformer type: ${type}`);
        }
    }

    /**
     * Creates a data formatter instance with default configuration.
     * Returns a formatter that implements IDataFormatter for value formatting.
     * 
     * @param {Object} [options={}] - Configuration options for the formatter
     * @param {string} [options.type='data'] - Type of formatter to create
     * @param {string} [options.currency='USD'] - Default currency for formatting
     * @param {string} [options.locale='en-US'] - Default locale for formatting
     * @param {Object} [options.config={}] - Additional configuration parameters
     * @returns {IDataFormatter} Configured data formatter instance
     * @static
     * @memberof TransformerFactory
     */
    static createDataFormatter(options = {}) {
        const { type = 'data', currency = 'USD', locale = 'en-US', config = {} } = options;
        
        switch (type) {
            case 'data':
                // Create wrapper that implements IDataFormatter interface
                return TransformerFactory._createDataFormatterAdapter(config);
            default:
                throw new Error(`Unknown formatter type: ${type}`);
        }
    }

    /**
     * Creates an adapter that wraps DataFormatter static methods to implement IDataFormatter interface.
     * 
     * @param {Object} [config={}] - Configuration options for the formatter
     * @returns {IDataFormatter} Formatter adapter instance
     * @private
     * @static
     * @memberof TransformerFactory
     */
    static _createDataFormatterAdapter(config = {}) {
        const IDataFormatter = require('../interfaces/IDataFormatter');
        
        return new class extends IDataFormatter {
            constructor() {
                super();
                this.config = config;
            }

            formatNumber(value, options = {}) {
                const includeCurrency = options.includeCurrency !== false;
                return DataFormatter.formatNumber(value, includeCurrency);
            }

            formatCurrency(amount, options = {}) {
                const { compact = true } = options;
                return DataFormatter.formatNumber(amount, true);
            }

            formatPercentage(value, options = {}) {
                const { decimals = 2 } = options;
                return DataFormatter.formatPercentage(value, decimals);
            }

            slugify(text, options = {}) {
                return DataFormatter.slugify(text);
            }

            formatCompactNumber(value, options = {}) {
                return DataFormatter.formatNumber(value, false);
            }

            isValidValue(value, type = 'number') {
                return DataFormatter.isValidNumber(value);
            }

            getDefaultFallback(type = 'number') {
                return 'No data';
            }

            getFormatterInfo() {
                return {
                    name: 'DataFormatterAdapter',
                    version: '1.0.0',
                    supportedTypes: ['number', 'currency', 'percentage', 'text'],
                    defaults: this.config
                };
            }
        }();
    }

    /**
     * Creates a complete transformer suite with all required dependencies.
     * Returns an object containing both transformer and formatter instances.
     * 
     * @param {Object} [options={}] - Configuration options
     * @param {string} [options.transformerType='hybrid'] - Type of transformer to create
     * @param {string} [options.formatterType='data'] - Type of formatter to create
     * @param {Object} [options.transformerConfig={}] - Transformer configuration
     * @param {Object} [options.formatterConfig={}] - Formatter configuration
     * @returns {Object} Object containing transformer and formatter instances
     * @returns {IViewModelTransformer} returns.transformer - View model transformer
     * @returns {IDataFormatter} returns.formatter - Data formatter
     * @static
     * @memberof TransformerFactory
     */
    static createTransformerSuite(options = {}) {
        const {
            transformerType = 'hybrid',
            formatterType = 'data',
            transformerConfig = {},
            formatterConfig = {}
        } = options;

        return {
            transformer: this.createViewModelTransformer({
                type: transformerType,
                config: transformerConfig
            }),
            formatter: this.createDataFormatter({
                type: formatterType,
                config: formatterConfig
            })
        };
    }

    /**
     * Gets information about available transformer types.
     * 
     * @returns {Array<Object>} Array of available transformer type information
     * @static
     * @memberof TransformerFactory
     */
    static getAvailableTransformers() {
        return [
            {
                type: 'hybrid',
                name: 'HybridTransformer',
                description: 'Standard transformer for hybrid stablecoin data',
                capabilities: ['data_transformation', 'platform_aggregation', 'view_formatting']
            }
        ];
    }

    /**
     * Gets information about available formatter types.
     * 
     * @returns {Array<Object>} Array of available formatter type information
     * @static
     * @memberof TransformerFactory
     */
    static getAvailableFormatters() {
        return [
            {
                type: 'data',
                name: 'DataFormatterAdapter',
                description: 'Standard data formatter with currency and number formatting',
                capabilities: ['number_formatting', 'currency_formatting', 'text_slugification']
            }
        ];
    }

    /**
     * Validates transformer configuration before creation.
     * 
     * @param {Object} config - Configuration to validate
     * @param {string} type - Transformer type to validate against
     * @returns {boolean} True if configuration is valid
     * @static
     * @memberof TransformerFactory
     */
    static validateTransformerConfig(config, type) {
        // Basic validation - can be extended for specific transformer types
        return typeof config === 'object' && config !== null;
    }
}

module.exports = TransformerFactory;
