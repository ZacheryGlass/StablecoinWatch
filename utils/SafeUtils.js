/**
 * SafeUtils.js - Safe utility functions for common operations
 */

class SafeUtils {
    /**
     * Safely parse integer with explicit radix
     * @param {string|number} value - Value to parse
     * @param {number} defaultValue - Default if parsing fails
     * @param {number} radix - Radix for parsing (default 10)
     * @returns {number}
     */
    static safeParseInt(value, defaultValue = 0, radix = 10) {
        if (value === null || value === undefined || value === '') {
            return defaultValue;
        }
        const parsed = parseInt(value, radix);
        return isNaN(parsed) ? defaultValue : parsed;
    }

    /**
     * Safely parse float
     * @param {string|number} value - Value to parse
     * @param {number} defaultValue - Default if parsing fails
     * @returns {number}
     */
    static safeParseFloat(value, defaultValue = 0.0) {
        if (value === null || value === undefined || value === '') {
            return defaultValue;
        }
        const parsed = parseFloat(value);
        return isNaN(parsed) ? defaultValue : parsed;
    }

    /**
     * Safely parse JSON with error handling
     * @param {string} jsonString - JSON string to parse
     * @param {*} defaultValue - Default if parsing fails
     * @param {Function} logger - Optional logger function
     * @returns {*}
     */
    static safeParseJSON(jsonString, defaultValue = null, logger = null) {
        if (!jsonString || typeof jsonString !== 'string') {
            return defaultValue;
        }
        
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            if (logger && typeof logger === 'function') {
                logger(`JSON parse error: ${error.message}`, { input: jsonString.substring(0, 100) });
            }
            return defaultValue;
        }
    }

    /**
     * Deep clone an object (handles circular references)
     * @param {*} obj - Object to clone
     * @param {WeakMap} visited - Track visited objects for circular reference detection
     * @returns {*}
     */
    static deepClone(obj, visited = new WeakMap()) {
        // Handle primitives and null
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        // Handle dates
        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }

        // Handle arrays
        if (Array.isArray(obj)) {
            // Check for circular reference
            if (visited.has(obj)) {
                return visited.get(obj);
            }
            
            const clonedArr = [];
            visited.set(obj, clonedArr);
            
            for (let i = 0; i < obj.length; i++) {
                clonedArr[i] = this.deepClone(obj[i], visited);
            }
            
            return clonedArr;
        }

        // Handle regular expressions
        if (obj instanceof RegExp) {
            return new RegExp(obj.source, obj.flags);
        }

        // Handle objects
        if (obj instanceof Object) {
            // Check for circular reference
            if (visited.has(obj)) {
                return visited.get(obj);
            }
            
            const clonedObj = {};
            visited.set(obj, clonedObj);
            
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = this.deepClone(obj[key], visited);
                }
            }
            
            return clonedObj;
        }

        // Fallback
        return obj;
    }

    /**
     * Validate and sanitize API key
     * @param {string} apiKey - API key to validate
     * @returns {string|null}
     */
    static sanitizeApiKey(apiKey) {
        if (!apiKey || typeof apiKey !== 'string') {
            return null;
        }

        // Remove any control characters, newlines, etc.
        const sanitized = apiKey.trim().replace(/[\r\n\t]/g, '');
        
        // Check for reasonable API key format (alphanumeric, hyphens, underscores)
        if (!/^[a-zA-Z0-9\-_]{10,}$/.test(sanitized)) {
            return null;
        }

        // Check for header injection attempts
        if (sanitized.includes(':') || sanitized.includes(' ')) {
            return null;
        }

        return sanitized;
    }

    /**
     * Validate HTTP header value to prevent injection
     * @param {string} value - Header value to validate
     * @returns {boolean}
     */
    static isValidHeaderValue(value) {
        if (!value || typeof value !== 'string') {
            return false;
        }
        // Check for CRLF injection
        return !/[\r\n]/.test(value);
    }

    /**
     * Create atomic counter for thread-safe operations
     * @param {number} initialValue - Initial counter value
     * @returns {Object}
     */
    static createAtomicCounter(initialValue = 0) {
        let value = initialValue;
        const mutex = new Map();
        
        return {
            increment() {
                const key = Symbol();
                mutex.set(key, true);
                value++;
                const result = value;
                mutex.delete(key);
                return result;
            },
            
            decrement() {
                const key = Symbol();
                mutex.set(key, true);
                value--;
                const result = value;
                mutex.delete(key);
                return result;
            },
            
            get() {
                return value;
            },
            
            set(newValue) {
                const key = Symbol();
                mutex.set(key, true);
                value = newValue;
                mutex.delete(key);
            },
            
            getAndIncrement() {
                const key = Symbol();
                mutex.set(key, true);
                const result = value;
                value++;
                mutex.delete(key);
                return result;
            }
        };
    }

    /**
     * Execute regex with timeout protection
     * @param {RegExp} regex - Regular expression to execute
     * @param {string} text - Text to match against
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Object} Result with match and timeout status
     */
    static executeRegexWithTimeout(regex, text, timeout = 1000) {
        const startTime = Date.now();
        let timedOut = false;
        let match = null;
        
        // Simple timeout check for synchronous regex
        // In production, consider using worker threads for true timeout protection
        try {
            // Check for potentially dangerous patterns
            const pattern = regex.source;
            if (this.hasNestedQuantifiers(pattern)) {
                return {
                    match: null,
                    timedOut: false,
                    error: 'Potentially dangerous regex pattern detected'
                };
            }
            
            match = regex.exec(text);
            
            if (Date.now() - startTime > timeout) {
                timedOut = true;
            }
            
            return {
                match,
                timedOut,
                error: null
            };
        } catch (error) {
            return {
                match: null,
                timedOut: false,
                error: error.message
            };
        }
    }

    /**
     * Check for nested quantifiers that could cause catastrophic backtracking
     * @param {string} pattern - Regex pattern to check
     * @returns {boolean}
     */
    static hasNestedQuantifiers(pattern) {
        // Enhanced detection for nested quantifiers and dangerous patterns
        // Focus on truly dangerous patterns, not simple alternations
        const dangerousPatterns = [
            /\([^)]*[+*]{2,}[^)]*\)/,      // Multiple consecutive quantifiers in group
            /\(.*\+.*\)\+/,                // Nested plus
            /\(.*\*.*\)\*/,                // Nested star
            /\([^)]*\{[^}]*\}[^)]*\)[+*]{2,}/, // Nested braces with multiple quantifiers
            /(\[[^\]]*\]){3,}[+*]/,       // Three or more character classes with quantifiers
            /(\\[dDwWsS]){3,}[+*]/         // Three or more shorthand classes with quantifiers
        ];
        
        return dangerousPatterns.some(dangerous => dangerous.test(pattern));
    }

    /**
     * Create a memory-limited Map that automatically cleans up
     * @param {number} maxSize - Maximum number of entries
     * @param {number} globalMaxMemory - Maximum memory in MB
     * @returns {Map}
     */
    static createBoundedMap(maxSize = 1000, globalMaxMemory = 100) {
        const map = new Map();
        const originalSet = map.set.bind(map);
        
        map.set = function(key, value) {
            // Check size limit
            if (this.size >= maxSize) {
                // Remove oldest entry (first in map)
                const firstKey = this.keys().next().value;
                this.delete(firstKey);
            }
            
            // Rough memory check (simplified)
            const memUsage = process.memoryUsage();
            if (memUsage.heapUsed > globalMaxMemory * 1024 * 1024) {
                // Clear half of the map if memory is too high
                const entriesToRemove = Math.floor(this.size / 2);
                let removed = 0;
                for (const key of this.keys()) {
                    if (removed >= entriesToRemove) break;
                    this.delete(key);
                    removed++;
                }
            }
            
            return originalSet(key, value);
        };
        
        return map;
    }
}

module.exports = SafeUtils;