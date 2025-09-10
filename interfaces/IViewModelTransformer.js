/**
 * Interface for view model transformation services.
 * Defines the contract for transforming aggregated data into view-layer compatible format.
 * Abstracts transformation logic to enable loose coupling between service and presentation layers.
 * 
 * @interface IViewModelTransformer
 */
class IViewModelTransformer {
    constructor() {
        if (this.constructor === IViewModelTransformer) {
            throw new Error('Cannot instantiate interface IViewModelTransformer directly');
        }
    }

    /**
     * Transforms raw aggregated data into standardized view model format.
     * Processes input data and prepares it for view layer consumption with proper formatting,
     * platform extraction, and metrics calculation.
     * 
     * @param {Array} aggregatedData - Array of aggregated data objects from multiple sources
     * @returns {void} Method updates internal state with transformed data
     * @abstract
     * @memberof IViewModelTransformer
     */
    transformData(aggregatedData) {
        throw new Error('Method transformData() must be implemented by concrete transformer');
    }

    /**
     * Gets the array of transformed data objects.
     * Returns processed data objects suitable for direct view layer consumption.
     * 
     * @returns {Array} Array of transformed data objects
     * @abstract
     * @memberof IViewModelTransformer
     */
    getTransformedData() {
        throw new Error('Method getTransformedData() must be implemented by concrete transformer');
    }

    /**
     * Calculates aggregated data for specific view requirements.
     * Processes transformed data to generate aggregated metrics like platform totals,
     * market summaries, or other derived data needed by views.
     * 
     * @returns {Array} Array of aggregated data objects
     * @abstract
     * @memberof IViewModelTransformer
     */
    calculateAggregations() {
        throw new Error('Method calculateAggregations() must be implemented by concrete transformer');
    }

    /**
     * Gets complete transformed data structure for view layer.
     * Returns comprehensive data object containing transformed items, metrics,
     * and aggregated data suitable for template consumption.
     * 
     * @returns {Object} Complete transformed data structure
     * @returns {Array} returns.stablecoins - Array of transformed data objects
     * @returns {Object} returns.metrics - Aggregated metrics  
     * @returns {Array} returns.platform_data - Platform aggregation data
     * @abstract
     * @memberof IViewModelTransformer
     */
    getCompleteViewModel() {
        throw new Error('Method getCompleteViewModel() must be implemented by concrete transformer');
    }

    /**
     * Resets the internal state of the transformer.
     * Clears any cached or internal data to prepare for new transformation cycle.
     * 
     * @returns {void}
     * @abstract
     * @memberof IViewModelTransformer
     */
    reset() {
        throw new Error('Method reset() must be implemented by concrete transformer');
    }

    /**
     * Validates input data structure before transformation.
     * Checks if the provided data meets the requirements for successful transformation.
     * 
     * @param {Array} data - Data array to validate
     * @returns {boolean} True if data is valid for transformation
     * @abstract
     * @memberof IViewModelTransformer
     */
    validateInputData(data) {
        throw new Error('Method validateInputData() must be implemented by concrete transformer');
    }

    /**
     * Gets metadata about the transformer implementation.
     * Returns information about capabilities, version, or other implementation details.
     * 
     * @returns {Object} Transformer metadata
     * @returns {string} returns.name - Transformer name
     * @returns {string} returns.version - Implementation version
     * @returns {Array} returns.capabilities - Supported capabilities
     * @abstract
     * @memberof IViewModelTransformer
     */
    getTransformerInfo() {
        throw new Error('Method getTransformerInfo() must be implemented by concrete transformer');
    }
}

module.exports = IViewModelTransformer;