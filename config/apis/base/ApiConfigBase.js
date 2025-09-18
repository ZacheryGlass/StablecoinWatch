/**
 * Base class for API configurations
 * Provides common functionality and validation for all API configuration modules
 */
const fs = require('fs');
const path = require('path');
const SafeUtils = require('../../../utils/SafeUtils');

class ApiConfigBase {
    /**
     * Create a new API configuration
     * @param {string} sourceId - Unique identifier for this API source
     * @param {Object} configOverrides - Optional configuration overrides
     */
    constructor(sourceId, configOverrides = {}) {
        this.sourceId = sourceId;
        this.schema = this._loadSchema();
        this.config = this._buildConfiguration(configOverrides);
        this._validateConfiguration();
    }

    /**
     * Load the JSON schema for validation
     * @private
     * @returns {Object} JSON schema object
     */
    _loadSchema() {
        try {
            const schemaPath = path.join(__dirname, '../../schemas/api-config.schema.json');
            const schemaContent = fs.readFileSync(schemaPath, 'utf8');
            return JSON.parse(schemaContent);
        } catch (error) {
            console.warn(`Could not load API config schema: ${error.message}`);
            return null;
        }
    }

    /**
     * Build the configuration object with defaults and environment overrides
     * @private
     * @param {Object} overrides - Configuration overrides
     * @returns {Object} Complete configuration object
     */
    _buildConfiguration(overrides) {
        const defaults = this._getDefaultConfiguration();
        const envConfig = this._getEnvironmentConfiguration();
        
        // Merge in order: defaults -> environment -> overrides
        return this._deepMerge(defaults, envConfig, overrides);
    }

    /**
     * Get default configuration that should be implemented by subclasses
     * @protected
     * @returns {Object} Default configuration
     */
    _getDefaultConfiguration() {
        throw new Error('_getDefaultConfiguration must be implemented by subclass');
    }

    /**
     * Get environment-based configuration overrides
     * @protected
     * @returns {Object} Environment configuration
     */
    _getEnvironmentConfiguration() {
        const sourceUpper = this.sourceId.toUpperCase();
        
        return {
            enabled: this._getEnvironmentEnabled(),
            baseUrl: process.env[`${sourceUpper}_BASE_URL`],
            apiKey: process.env[`${sourceUpper}_API_KEY`],
            
            rateLimit: {
                requestsPerMinute: this._parseRateLimit(process.env[`${sourceUpper}_RATE_LIMIT`]),
                requestsPerHour: this._parseRateLimit(process.env[`${sourceUpper}_HOURLY_LIMIT`]),
                requestsPerDay: this._parseRateLimit(process.env[`${sourceUpper}_DAILY_LIMIT`])
            },
            
            request: {
                timeout: process.env[`${sourceUpper}_TIMEOUT_MS`] ? SafeUtils.safeParseInt(process.env[`${sourceUpper}_TIMEOUT_MS`]) : undefined,
                retries: process.env[`${sourceUpper}_RETRIES`] ? SafeUtils.safeParseInt(process.env[`${sourceUpper}_RETRIES`]) : undefined,
                retryDelay: process.env[`${sourceUpper}_RETRY_DELAY_MS`] ? SafeUtils.safeParseInt(process.env[`${sourceUpper}_RETRY_DELAY_MS`]) : undefined
            },
            
            processing: {
                batchSize: process.env[`${sourceUpper}_BATCH_SIZE`] ? SafeUtils.safeParseInt(process.env[`${sourceUpper}_BATCH_SIZE`]) : undefined,
                maxResults: process.env[`${sourceUpper}_MAX_RESULTS`] ? SafeUtils.safeParseInt(process.env[`${sourceUpper}_MAX_RESULTS`]) : undefined,
                includeTokenizedAssets: process.env[`${sourceUpper}_INCLUDE_TOKENIZED_ASSETS`] === 'true'
            },
            
            mockData: {
                enabled: process.env[`${sourceUpper}_MOCK_DATA`] === 'true',
                filePath: process.env[`${sourceUpper}_MOCK_FILE`]
            }
        };
    }

    /**
     * Determine if this API source is enabled based on various factors
     * @private
     * @returns {boolean} Whether the source is enabled
     */
    _getEnvironmentEnabled() {
        const sourceUpper = this.sourceId.toUpperCase();
        
        // Check explicit enable/disable
        const explicitEnabled = process.env[`${sourceUpper}_ENABLED`];
        if (explicitEnabled !== undefined) {
            return explicitEnabled === 'true';
        }
        
        // Check if included in ENABLED_SOURCES list
        const enabledSources = process.env.ENABLED_SOURCES;
        if (enabledSources) {
            const sources = enabledSources.split(',').map(s => s.trim());
            return sources.includes(this.sourceId);
        }
        
        // Default to checking if API key is present (for APIs that require it)
        return !!process.env[`${sourceUpper}_API_KEY`];
    }

    /**
     * Parse rate limit value from environment variable
     * @private
     * @param {string} envValue - Environment variable value
     * @returns {number|null} Parsed rate limit or null if not set
     */
    _parseRateLimit(envValue) {
        if (!envValue) return null;
        const parsed = SafeUtils.safeParseInt(envValue, null);
        return parsed > 0 ? parsed : null;
    }

    /**
     * Deep merge multiple configuration objects
     * @private
     * @param {...Object} objects - Configuration objects to merge
     * @returns {Object} Merged configuration
     */
    _deepMerge(...objects) {
        const result = {};
        
        for (const obj of objects) {
            if (!obj || typeof obj !== 'object') continue;
            
            for (const [key, value] of Object.entries(obj)) {
                if (value === undefined || value === null) continue;
                
                if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
                    result[key] = this._deepMerge(result[key] || {}, value);
                } else {
                    result[key] = value;
                }
            }
        }
        
        return result;
    }

    /**
     * Validate configuration against JSON schema if available
     * @private
     */
    _validateConfiguration() {
        if (!this.schema) {
            console.warn(`Skipping validation for ${this.sourceId}: schema not available`);
            return;
        }

        // Basic validation - in a full implementation, you'd use a JSON schema validator
        const errors = this._performBasicValidation();
        
        if (errors.length > 0) {
            throw new Error(`Configuration validation failed for ${this.sourceId}: ${errors.join(', ')}`);
        }
    }

    /**
     * Perform basic validation of required fields
     * @private
     * @returns {Array<string>} Array of validation errors
     */
    _performBasicValidation() {
        const errors = [];
        const config = this.config;
        
        // Check required fields
        if (!config.name) errors.push('name is required');
        if (typeof config.enabled !== 'boolean') errors.push('enabled must be boolean');
        if (!config.baseUrl) errors.push('baseUrl is required');
        if (!config.endpoints || typeof config.endpoints !== 'object') {
            errors.push('endpoints is required and must be object');
        }
        if (!config.capabilities || typeof config.capabilities !== 'object') {
            errors.push('capabilities is required and must be object');
        }
        
        // Validate URL format
        if (config.baseUrl) {
            try {
                new URL(config.baseUrl);
            } catch (e) {
                errors.push('baseUrl must be a valid URL');
            }
        }
        
        // Validate rate limits are positive
        if (config.rateLimit) {
            const { requestsPerMinute, requestsPerHour, requestsPerDay } = config.rateLimit;
            if (requestsPerMinute !== null && requestsPerMinute <= 0) {
                errors.push('requestsPerMinute must be positive');
            }
            if (requestsPerHour !== null && requestsPerHour <= 0) {
                errors.push('requestsPerHour must be positive');
            }
            if (requestsPerDay !== null && requestsPerDay <= 0) {
                errors.push('requestsPerDay must be positive');
            }
        }
        
        return errors;
    }

    /**
     * Get the complete configuration object
     * @returns {Object} Complete configuration
     */
    getConfig() {
        return SafeUtils.deepClone(this.config);
    }

    /**
     * Get a specific configuration section
     * @param {string} section - Configuration section name
     * @returns {*} Configuration section value
     */
    getConfigSection(section) {
        return SafeUtils.deepClone(this.config[section]);
    }

    /**
     * Check if this API source is enabled
     * @returns {boolean} Whether the source is enabled
     */
    isEnabled() {
        return !!this.config.enabled;
    }

    /**
     * Check if mock data mode is enabled
     * @returns {boolean} Whether mock data is enabled
     */
    isMockMode() {
        return !!(this.config.mockData && this.config.mockData.enabled);
    }

    /**
     * Check if the API source is properly configured and ready to use
     * @returns {boolean} Whether the source is ready
     */
    isReady() {
        // If mock mode is enabled, consider it ready
        if (this.isMockMode()) return true;
        
        // Check if enabled
        if (!this.isEnabled()) return false;
        
        // Check if API key is present when required
        if (this._requiresApiKey() && !this.config.apiKey) return false;
        
        return true;
    }

    /**
     * Check if this API source requires an API key
     * Should be overridden by subclasses that don't require keys
     * @protected
     * @returns {boolean} Whether API key is required
     */
    _requiresApiKey() {
        return true;
    }

    /**
     * Get request headers with API key authentication
     * @returns {Object} HTTP headers object
     */
    getRequestHeaders() {
        const headers = { ...this.config.request.headers };
        
        // Add API key header if configured and not in mock mode
        if (this.config.apiKey && !this.isMockMode()) {
            const sanitizedKey = SafeUtils.sanitizeApiKey(this.config.apiKey);
            if (!sanitizedKey) {
                console.error(`Invalid API key format for ${this.sourceId}`);
                return headers;
            }
            
            // Add API key with source-specific header name
            const apiKeyHeader = this._getApiKeyHeaderName();
            if (apiKeyHeader) {
                headers[apiKeyHeader] = sanitizedKey;
            }
        }
        
        // Validate all header values
        for (const [key, value] of Object.entries(headers)) {
            if (!SafeUtils.isValidHeaderValue(value)) {
                console.error(`Invalid header value for ${key} in ${this.sourceId}`);
                delete headers[key];
            }
        }
        
        return headers;
    }

    /**
     * Get the API key header name for this source
     * Should be overridden by subclasses
     * @protected
     * @returns {string|null} Header name for API key
     */
    _getApiKeyHeaderName() {
        return null;
    }

    /**
     * Get source information
     * @returns {Object} Source information
     */
    getSourceInfo() {
        return {
            id: this.sourceId,
            name: this.config.name,
            enabled: this.isEnabled(),
            ready: this.isReady(),
            mockMode: this.isMockMode(),
            priority: this.config.capabilities.priority,
            capabilities: this.config.capabilities
        };
    }

    /**
     * Export configuration as JSON for debugging/documentation
     * @param {boolean} includeSensitive - Whether to include sensitive data like API keys
     * @returns {string} JSON representation of configuration
     */
    toJSON(includeSensitive = false) {
        const config = SafeUtils.deepClone(this.config);
        
        if (!includeSensitive && config.apiKey) {
            config.apiKey = '[REDACTED]';
        }
        
        return JSON.stringify(config, null, 2);
    }
}

module.exports = ApiConfigBase;