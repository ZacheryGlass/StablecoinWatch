/**
 * API Configuration - Modernized Architecture
 * 
 * This is the main entry point for API configuration management.
 * It uses the new modular architecture with ApiConfigRegistry for better
 * scalability, maintainability, and testing.
 * 
 * For backward compatibility, this maintains the same public interface
 * as the original ApiConfig while using the new registry internally.
 */
const AppConfig = require('./AppConfig');
const ApiConfigRegistry = require('./ApiConfigRegistry');

class ApiConfig {
    constructor() {
        this.registry = ApiConfigRegistry;
        this._applyGlobalOverrides();
    }

    /**
     * Apply global overrides based on AppConfig settings
     * @private
     */
    _applyGlobalOverrides() {
        try {
            const debugMode = !!(AppConfig?.development?.debugMode);
            const mockApis = !!(AppConfig?.development?.mockApis);
            
            if (debugMode || mockApis) {
                // Enable mock data for all sources when in debug/mock mode
                const enabledSources = this.registry.getEnabledSources();
                for (const sourceId of enabledSources) {
                    const configInstance = this.registry.getApiConfigInstance(sourceId);
                    if (configInstance && configInstance.getConfig) {
                        const config = configInstance.getConfig();
                        if (config.mockData) {
                            config.mockData.enabled = true;
                        }
                    }
                }
            }
        } catch (error) {
            console.warn('Failed to apply global configuration overrides:', error.message);
        }
    }

    /**
     * Get configuration for a specific API
     * @param {string} sourceId - API source identifier
     * @returns {Object|null} API configuration or null if not found
     */
    getApiConfig(sourceId) {
        const config = this.registry.getApiConfig(sourceId);
        if (!config) return null;
        
        // Deep clone the config
        const clonedConfig = JSON.parse(JSON.stringify(config));
        
        // Runtime check for debug/mock mode
        try {
            const debugMode = !!(AppConfig?.development?.debugMode);
            const mockApis = !!(AppConfig?.development?.mockApis);
            if (debugMode || mockApis) {
                if (!clonedConfig.mockData) clonedConfig.mockData = {};
                clonedConfig.mockData.enabled = true;
            }
        } catch (_) { /* best-effort */ }
        
        return clonedConfig;
    }

    /**
     * Get all API configurations
     * @returns {Object} All API configurations
     */
    getAllApiConfigs() {
        return this.registry.getAllApiConfigs();
    }

    /**
     * Get list of enabled API sources
     * @returns {Array<string>} Array of enabled source IDs
     */
    getEnabledSources() {
        const enabledSources = this.registry.getEnabledSources();
        
        // Runtime check for debug/mock mode
        let inMockMode = false;
        try {
            const debugMode = !!(AppConfig?.development?.debugMode);
            const mockApis = !!(AppConfig?.development?.mockApis);
            inMockMode = debugMode || mockApis;
        } catch (_) { /* best-effort */ }
        
        if (inMockMode) {
            // In mock mode, include all configured sources
            const allConfigs = this.registry.getAllApiConfigs();
            const allSources = Object.keys(allConfigs);
            return allSources.filter(sourceId => {
                const config = this.registry.getApiConfig(sourceId);
                return config && (config.enabled || (config.mockData && config.mockData.enabled) || inMockMode);
            });
        }
        
        return enabledSources;
    }

    /**
     * Get list of configured but disabled sources
     * @returns {Array<string>} Array of disabled source IDs
     */
    getDisabledSources() {
        return this.registry.getDisabledSources();
    }

    /**
     * Check if a source is enabled and properly configured
     * @param {string} sourceId - API source identifier
     * @returns {boolean} Whether source is ready to use
     */
    isSourceReady(sourceId) {
        const config = this.registry.getApiConfig(sourceId);
        if (!config) return false;

        // Runtime check for debug/mock mode
        let inMockMode = false;
        try {
            const debugMode = !!(AppConfig?.development?.debugMode);
            const mockApis = !!(AppConfig?.development?.mockApis);
            inMockMode = debugMode || mockApis;
        } catch (_) { /* best-effort */ }

        // If in mock mode or mock data is enabled for this source, consider it ready
        if (inMockMode || (config.mockData && config.mockData.enabled)) return true;

        // Otherwise use the registry's standard readiness check
        return this.registry.isSourceReady(sourceId);
    }

    /**
     * Get sources sorted by priority (highest first)
     * @returns {Array<Object>} Sources with their priorities
     */
    getSourcesByPriority() {
        return this.registry.getSourcesByPriority();
    }

    /**
     * Get sources that provide specific capability
     * @param {string} capability - Capability to search for
     * @returns {Array<string>} Source IDs that provide this capability
     */
    getSourcesWithCapability(capability) {
        return this.registry.getSourcesWithCapability(capability);
    }

    /**
     * Get best source for specific data type
     * @param {string} dataType - Type of data needed
     * @returns {string|null} Best source ID for this data type
     */
    getBestSourceForDataType(dataType) {
        return this.registry.getBestSourceForDataType(dataType);
    }

    /**
     * Get headers for API request with sanitized API key
     * @param {string} sourceId - API source identifier
     * @returns {Object} Sanitized headers object
     */
    getRequestHeaders(sourceId) {
        return this.registry.getRequestHeaders(sourceId);
    }

    /**
     * Get shared asset classification configuration
     * @returns {Object} Shared taxonomy configuration for AssetClassifier
     */
    getAssetClassificationConfig() {
        return this.registry.getAssetClassificationConfig();
    }

    /**
     * Validate asset classification configuration
     * @returns {Object} Validation result with isValid flag and errors array
     */
    validateAssetClassificationConfig() {
        return this.registry.validateAssetClassificationConfig();
    }

    /**
     * Get tokenized assets configuration for a specific source
     * @param {string} sourceId - Source identifier ('cmc', 'messari', etc.)
     * @returns {Object} Tokenized assets configuration
     */
    getTokenizedAssetsConfig(sourceId) {
        return this.registry.getTokenizedAssetsConfig(sourceId);
    }

    /**
     * Get global tokenized assets configuration summary
     * @returns {Object} Summary of tokenized assets configuration across all sources
     */
    getGlobalTokenizedAssetsConfig() {
        return this.registry.getGlobalTokenizedAssetsConfig();
    }

    /**
     * Validate API configuration
     * @returns {Object} Validation results
     */
    validate() {
        return this.registry.validate();
    }

    /**
     * Add or update API configuration (for dynamic configuration)
     * @param {string} sourceId - Source identifier
     * @param {Object} config - API configuration instance
     */
    addApiConfig(sourceId, config) {
        if (!config || typeof config.getConfig !== 'function') {
            throw new Error('Config must be an instance that implements getConfig method');
        }
        this.registry.register(sourceId, config);
    }

    /**
     * Remove API configuration
     * @param {string} sourceId - Source identifier to remove
     */
    removeApiConfig(sourceId) {
        this.registry.unregister(sourceId);
    }

    // Backward compatibility methods for legacy code

    /**
     * Legacy method: Parse rate limit from environment variable
     * @deprecated Use ApiConfigBase._parseRateLimit instead
     * @private
     * @param {string} envValue - Environment variable value
     * @param {number} defaultValue - Default value if not set
     * @returns {number} Parsed rate limit
     */
    _parseRateLimit(envValue, defaultValue) {
        console.warn('_parseRateLimit is deprecated. Use ApiConfigBase._parseRateLimit instead.');
        if (!envValue) return defaultValue;
        const parsed = parseInt(envValue, 10);
        return isNaN(parsed) ? defaultValue : parsed;
    }

    /**
     * Legacy method: Parse custom tags from environment variables
     * @deprecated Use AssetClassificationConfig._parseCustomTags instead
     * @private
     * @param {string} envValue - Comma-separated tag string
     * @returns {Array<string>} Array of tags
     */
    _parseCustomTags(envValue) {
        console.warn('_parseCustomTags is deprecated. Use AssetClassificationConfig._parseCustomTags instead.');
        if (!envValue || typeof envValue !== 'string') return [];
        return envValue.split(',').map(tag => tag.trim().toLowerCase()).filter(Boolean);
    }

    /**
     * Legacy method: Set tokenized assets configuration
     * @deprecated Configuration is now handled automatically by individual API configs
     * @private
     * @param {Object} configs - API configurations object
     */
    _setTokenizedAssetsConfig(configs) {
        console.warn('_setTokenizedAssetsConfig is deprecated. Configuration is now handled automatically.');
        // No-op for backward compatibility
    }

    /**
     * Legacy method: Get tokenized assets environment variable name
     * @deprecated Use AssetClassificationConfig._getTokenizedAssetsEnvVar instead
     * @private
     * @param {string} sourceId - Source identifier
     * @returns {string} Environment variable name
     */
    _getTokenizedAssetsEnvVar(sourceId) {
        console.warn('_getTokenizedAssetsEnvVar is deprecated. Use AssetClassificationConfig._getTokenizedAssetsEnvVar instead.');
        const sourceUpper = sourceId.toUpperCase();
        return `${sourceUpper}_INCLUDE_TOKENIZED_ASSETS`;
    }

    /**
     * Get registry statistics for debugging
     * @returns {Object} Registry statistics
     */
    getStats() {
        return this.registry.getStats();
    }

    /**
     * Export configuration as JSON for debugging/documentation
     * @param {boolean} includeSensitive - Whether to include sensitive data like API keys
     * @returns {Object} JSON representation of all configurations
     */
    toJSON(includeSensitive = false) {
        return this.registry.toJSON(includeSensitive);
    }

    /**
     * Get the underlying registry instance (for advanced usage)
     * @returns {ApiConfigRegistry} The registry instance
     */
    getRegistry() {
        return this.registry;
    }
}

// Export singleton instance for backward compatibility
module.exports = new ApiConfig();