/**
 * API Configuration Registry
 * Manages multiple API configurations with registration, validation, and runtime updates
 */
const SafeUtils = require('../utils/SafeUtils');
const AssetClassificationConfig = require('./AssetClassificationConfig');

// Import API configuration classes
const CmcApiConfig = require('./apis/cmc.config');
const MessariApiConfig = require('./apis/messari.config');
const CoinGeckoApiConfig = require('./apis/coingecko.config');
const DeFiLlamaApiConfig = require('./apis/defillama.config');

class ApiConfigRegistry {
    constructor() {
        this.configs = new Map();
        this.assetClassificationConfig = AssetClassificationConfig;
        this._initializeDefaultConfigs();
    }

    /**
     * Initialize default API configurations
     * @private
     */
    _initializeDefaultConfigs() {
        try {
            // Register built-in API configurations
            this.register('cmc', new CmcApiConfig());
            this.register('messari', new MessariApiConfig());
            this.register('coingecko', new CoinGeckoApiConfig());
            this.register('defillama', new DeFiLlamaApiConfig());
        } catch (error) {
            console.error('Failed to initialize default API configurations:', error.message);
        }
    }

    /**
     * Register an API configuration
     * @param {string} sourceId - Unique identifier for the API source
     * @param {Object} config - API configuration instance (must extend ApiConfigBase)
     * @returns {ApiConfigRegistry} Registry instance for chaining
     */
    register(sourceId, config) {
        if (!sourceId || typeof sourceId !== 'string') {
            throw new Error('Source ID must be a non-empty string');
        }

        if (!config || typeof config.getConfig !== 'function') {
            throw new Error('Config must be an instance that implements getConfig method');
        }

        // Validate the configuration
        if (typeof config.isReady === 'function') {
            try {
                config.isReady(); // Test that configuration is valid
            } catch (error) {
                console.warn(`Configuration validation failed for ${sourceId}: ${error.message}`);
            }
        }

        this.configs.set(sourceId, config);
        return this;
    }

    /**
     * Unregister an API configuration
     * @param {string} sourceId - Source identifier to remove
     * @returns {boolean} True if configuration was removed
     */
    unregister(sourceId) {
        return this.configs.delete(sourceId);
    }

    /**
     * Get a specific API configuration
     * @param {string} sourceId - Source identifier
     * @returns {Object|null} API configuration or null if not found
     */
    getApiConfig(sourceId) {
        const config = this.configs.get(sourceId);
        return config ? config.getConfig() : null;
    }

    /**
     * Get the configuration instance (not just the config data)
     * @param {string} sourceId - Source identifier
     * @returns {Object|null} API configuration instance
     */
    getApiConfigInstance(sourceId) {
        return this.configs.get(sourceId) || null;
    }

    /**
     * Get all API configurations
     * @returns {Object} All API configurations keyed by source ID
     */
    getAllApiConfigs() {
        const result = {};
        for (const [sourceId, configInstance] of this.configs) {
            result[sourceId] = configInstance.getConfig();
        }
        return result;
    }

    /**
     * Get list of enabled API sources
     * @returns {Array<string>} Array of enabled source IDs
     */
    getEnabledSources() {
        const enabled = [];
        for (const [sourceId, configInstance] of this.configs) {
            try {
                if (configInstance.isEnabled && configInstance.isEnabled()) {
                    enabled.push(sourceId);
                }
            } catch (error) {
                console.warn(`Error checking if ${sourceId} is enabled: ${error.message}`);
            }
        }
        return enabled;
    }

    /**
     * Get list of configured but disabled sources
     * @returns {Array<string>} Array of disabled source IDs
     */
    getDisabledSources() {
        const disabled = [];
        for (const [sourceId, configInstance] of this.configs) {
            try {
                if (configInstance.isEnabled && !configInstance.isEnabled()) {
                    disabled.push(sourceId);
                }
            } catch (error) {
                console.warn(`Error checking if ${sourceId} is disabled: ${error.message}`);
            }
        }
        return disabled;
    }

    /**
     * Get list of ready-to-use API sources
     * @returns {Array<string>} Array of ready source IDs
     */
    getReadySources() {
        const ready = [];
        for (const [sourceId, configInstance] of this.configs) {
            try {
                if (configInstance.isReady && configInstance.isReady()) {
                    ready.push(sourceId);
                }
            } catch (error) {
                console.warn(`Error checking if ${sourceId} is ready: ${error.message}`);
            }
        }
        return ready;
    }

    /**
     * Check if a source is enabled and properly configured
     * @param {string} sourceId - API source identifier
     * @returns {boolean} Whether source is ready to use
     */
    isSourceReady(sourceId) {
        const configInstance = this.configs.get(sourceId);
        if (!configInstance) return false;

        try {
            return configInstance.isReady ? configInstance.isReady() : false;
        } catch (error) {
            console.warn(`Error checking readiness for ${sourceId}: ${error.message}`);
            return false;
        }
    }

    /**
     * Get sources sorted by priority (highest first)
     * @returns {Array<Object>} Sources with their priorities
     */
    getSourcesByPriority() {
        const sources = [];
        
        for (const [sourceId, configInstance] of this.configs) {
            try {
                if (configInstance.isEnabled && configInstance.isEnabled()) {
                    const config = configInstance.getConfig();
                    sources.push({
                        sourceId,
                        name: config.name,
                        priority: config.capabilities?.priority || 0,
                        capabilities: config.capabilities
                    });
                }
            } catch (error) {
                console.warn(`Error getting priority for ${sourceId}: ${error.message}`);
            }
        }
        
        return sources.sort((a, b) => b.priority - a.priority);
    }

    /**
     * Get sources that provide specific capability
     * @param {string} capability - Capability to search for
     * @returns {Array<string>} Source IDs that provide this capability
     */
    getSourcesWithCapability(capability) {
        const sources = [];
        
        for (const [sourceId, configInstance] of this.configs) {
            try {
                if (configInstance.isEnabled && configInstance.isEnabled()) {
                    const config = configInstance.getConfig();
                    if (config.capabilities && config.capabilities[capability]) {
                        sources.push(sourceId);
                    }
                }
            } catch (error) {
                console.warn(`Error checking capability ${capability} for ${sourceId}: ${error.message}`);
            }
        }
        
        return sources;
    }

    /**
     * Get best source for specific data type
     * @param {string} dataType - Type of data needed
     * @returns {string|null} Best source ID for this data type
     */
    getBestSourceForDataType(dataType) {
        let bestSource = null;
        let highestPriority = -1;
        
        for (const [sourceId, configInstance] of this.configs) {
            try {
                if (configInstance.isEnabled && configInstance.isEnabled()) {
                    const config = configInstance.getConfig();
                    const capabilities = config.capabilities;
                    
                    if (capabilities && 
                        capabilities.dataTypes && 
                        capabilities.dataTypes.includes(dataType) &&
                        capabilities.priority > highestPriority) {
                        
                        bestSource = sourceId;
                        highestPriority = capabilities.priority;
                    }
                }
            } catch (error) {
                console.warn(`Error evaluating ${sourceId} for data type ${dataType}: ${error.message}`);
            }
        }
        
        return bestSource;
    }

    /**
     * Get request headers for API request with sanitized API key
     * @param {string} sourceId - API source identifier
     * @returns {Object} Sanitized headers object
     */
    getRequestHeaders(sourceId) {
        const configInstance = this.configs.get(sourceId);
        if (!configInstance) return {};
        
        try {
            return configInstance.getRequestHeaders ? configInstance.getRequestHeaders() : {};
        } catch (error) {
            console.error(`Error getting headers for ${sourceId}: ${error.message}`);
            return {};
        }
    }

    /**
     * Get asset classification configuration
     * @returns {Object} Asset classification configuration
     */
    getAssetClassificationConfig() {
        return this.assetClassificationConfig.getConfig();
    }

    /**
     * Validate asset classification configuration
     * @returns {Object} Validation result with isValid flag and errors array
     */
    validateAssetClassificationConfig() {
        return this.assetClassificationConfig.validate();
    }

    /**
     * Get tokenized assets configuration for a specific source
     * @param {string} sourceId - Source identifier
     * @returns {Object} Tokenized assets configuration
     */
    getTokenizedAssetsConfig(sourceId) {
        return this.assetClassificationConfig.getTokenizedAssetsConfig(sourceId);
    }

    /**
     * Get global tokenized assets configuration summary
     * @returns {Object} Summary of tokenized assets configuration across all sources
     */
    getGlobalTokenizedAssetsConfig() {
        return this.assetClassificationConfig.getGlobalTokenizedAssetsConfig();
    }

    /**
     * Validate all API configurations
     * @returns {Object} Validation results
     */
    validate() {
        const results = {
            valid: true,
            enabledSources: 0,
            readySources: 0,
            warnings: [],
            errors: [],
            sourceResults: {}
        };

        // Validate asset classification
        const assetClassificationValidation = this.validateAssetClassificationConfig();
        if (!assetClassificationValidation.isValid) {
            results.valid = false;
            results.errors.push(...assetClassificationValidation.errors.map(e => `Asset Classification: ${e}`));
        }

        // Validate each API configuration
        for (const [sourceId, configInstance] of this.configs) {
            const sourceResult = {
                valid: true,
                enabled: false,
                ready: false,
                warnings: [],
                errors: []
            };

            try {
                // Check if enabled
                if (configInstance.isEnabled) {
                    sourceResult.enabled = configInstance.isEnabled();
                    if (sourceResult.enabled) {
                        results.enabledSources++;
                    }
                }

                // Check if ready
                if (configInstance.isReady) {
                    sourceResult.ready = configInstance.isReady();
                    if (sourceResult.ready) {
                        results.readySources++;
                    }
                }

                // Run source-specific validation if available
                const validationMethods = [
                    'validateCmcConfig',
                    'validateMessariConfig', 
                    'validateCoinGeckoConfig',
                    'validateDeFiLlamaConfig'
                ];

                for (const method of validationMethods) {
                    if (typeof configInstance[method] === 'function') {
                        const validation = configInstance[method]();
                        if (!validation.isValid) {
                            sourceResult.valid = false;
                            sourceResult.errors.push(...validation.errors);
                        }
                        break;
                    }
                }

                // Basic configuration validation
                const config = configInstance.getConfig();
                if (!config.name) {
                    sourceResult.errors.push('Missing name');
                    sourceResult.valid = false;
                }
                if (!config.baseUrl) {
                    sourceResult.errors.push('Missing baseUrl');
                    sourceResult.valid = false;
                }

                // Check for enabled source without API key (where required)
                if (sourceResult.enabled && 
                    configInstance._requiresApiKey && 
                    configInstance._requiresApiKey() &&
                    !config.apiKey &&
                    !(configInstance.isMockMode && configInstance.isMockMode())) {
                    sourceResult.warnings.push('Enabled but missing required API key');
                }

            } catch (error) {
                sourceResult.valid = false;
                sourceResult.errors.push(`Validation error: ${error.message}`);
            }

            results.sourceResults[sourceId] = sourceResult;
            
            if (!sourceResult.valid) {
                results.valid = false;
                results.errors.push(...sourceResult.errors.map(e => `${sourceId}: ${e}`));
            }
            results.warnings.push(...sourceResult.warnings.map(w => `${sourceId}: ${w}`));
        }

        if (results.readySources === 0) {
            results.errors.push('No data sources are ready for use');
            results.valid = false;
        }

        return results;
    }

    /**
     * Get registry statistics
     * @returns {Object} Registry statistics
     */
    getStats() {
        const stats = {
            totalConfigs: this.configs.size,
            enabledSources: this.getEnabledSources().length,
            disabledSources: this.getDisabledSources().length,
            readySources: this.getReadySources().length,
            configuredSources: Array.from(this.configs.keys()),
            sourcesByPriority: this.getSourcesByPriority().map(s => ({
                sourceId: s.sourceId,
                name: s.name,
                priority: s.priority
            }))
        };

        return stats;
    }

    /**
     * Export all configurations as JSON for debugging/documentation
     * @param {boolean} includeSensitive - Whether to include sensitive data like API keys
     * @returns {Object} All configurations as JSON
     */
    toJSON(includeSensitive = false) {
        const result = {
            assetClassification: this.getAssetClassificationConfig(),
            apis: {}
        };

        for (const [sourceId, configInstance] of this.configs) {
            try {
                if (typeof configInstance.toJSON === 'function') {
                    result.apis[sourceId] = JSON.parse(configInstance.toJSON(includeSensitive));
                } else {
                    result.apis[sourceId] = configInstance.getConfig();
                    if (!includeSensitive && result.apis[sourceId].apiKey) {
                        result.apis[sourceId].apiKey = '[REDACTED]';
                    }
                }
            } catch (error) {
                result.apis[sourceId] = { error: `Failed to serialize: ${error.message}` };
            }
        }

        return result;
    }

    /**
     * Create a new registry instance with custom configurations
     * @param {Object} customConfigs - Custom configuration instances keyed by source ID
     * @returns {ApiConfigRegistry} New registry instance
     */
    static createCustom(customConfigs = {}) {
        const registry = new ApiConfigRegistry();
        
        // Clear default configs if custom ones are provided
        if (Object.keys(customConfigs).length > 0) {
            registry.configs.clear();
        }
        
        // Register custom configurations
        for (const [sourceId, config] of Object.entries(customConfigs)) {
            registry.register(sourceId, config);
        }
        
        return registry;
    }
}

// Export singleton instance
module.exports = new ApiConfigRegistry();