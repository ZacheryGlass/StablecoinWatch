/**
 * Interface for health monitoring across all services and data sources
 * Provides comprehensive monitoring for scalable multi-API architecture
 */
class IHealthMonitor {
    constructor() {
        if (this.constructor === IHealthMonitor) {
            throw new Error('Cannot instantiate interface IHealthMonitor directly');
        }
    }

    /**
     * Get overall system health status
     * @returns {Promise<SystemHealth>} Complete system health overview
     */
    async getSystemHealth() {
        throw new Error('Method getSystemHealth() must be implemented');
    }

    /**
     * Get health status for a specific data source
     * @param {string} sourceId - Data source identifier
     * @returns {Promise<DataSourceHealth>} Health status for specific source
     */
    async getSourceHealth(sourceId) {
        throw new Error('Method getSourceHealth() must be implemented');
    }

    /**
     * Record successful operation for monitoring
     * @param {string} sourceId - Data source identifier
     * @param {OperationMetrics} metrics - Operation performance data
     * @returns {Promise<void>}
     */
    async recordSuccess(sourceId, metrics) {
        throw new Error('Method recordSuccess() must be implemented');
    }

    /**
     * Record failed operation for monitoring
     * @param {string} sourceId - Data source identifier
     * @param {OperationError} error - Error information
     * @returns {Promise<void>}
     */
    async recordFailure(sourceId, error) {
        throw new Error('Method recordFailure() must be implemented');
    }

    /**
     * Get performance metrics for a time period
     * @param {string} sourceId - Data source identifier (optional, null for all)
     * @param {TimePeriod} period - Time period for metrics
     * @returns {Promise<PerformanceMetrics>} Performance statistics
     */
    async getPerformanceMetrics(sourceId, period) {
        throw new Error('Method getPerformanceMetrics() must be implemented');
    }

    /**
     * Get alerts for unhealthy sources or conditions
     * @param {AlertLevel} level - Minimum alert level to return
     * @returns {Promise<Array<HealthAlert>>} Active health alerts
     */
    async getHealthAlerts(level) {
        throw new Error('Method getHealthAlerts() must be implemented');
    }

    /**
     * Check if system should enter degraded mode
     * @returns {Promise<DegradedModeStatus>} Degraded mode recommendation
     */
    async checkDegradedMode() {
        throw new Error('Method checkDegradedMode() must be implemented');
    }

    /**
     * Get health trends over time
     * @param {string} sourceId - Data source identifier (optional)
     * @param {TimePeriod} period - Time period for trends
     * @returns {Promise<HealthTrends>} Health trend data
     */
    async getHealthTrends(sourceId, period) {
        throw new Error('Method getHealthTrends() must be implemented');
    }

    /**
     * Reset health metrics for a source (for testing/recovery)
     * @param {string} sourceId - Data source identifier
     * @returns {Promise<void>}
     */
    async resetHealthMetrics(sourceId) {
        throw new Error('Method resetHealthMetrics() must be implemented');
    }
}

/**
 * Overall system health status
 * @typedef {Object} SystemHealth
 * @property {string} status - Overall status (healthy, degraded, critical, down)
 * @property {boolean} operational - Whether system is operational
 * @property {number} overallScore - Health score 0-100
 * @property {Array<DataSourceHealth>} sources - Health of each data source
 * @property {SystemMetrics} metrics - System-wide metrics
 * @property {Array<HealthAlert>} activeAlerts - Current health alerts
 * @property {DegradedModeStatus} degradedMode - Degraded mode status
 * @property {number} timestamp - When health was last calculated
 * @property {string} uptime - System uptime
 */

/**
 * Data source health details
 * @typedef {Object} DataSourceHealth
 * @property {string} sourceId - Data source identifier
 * @property {string} sourceName - Human readable name
 * @property {string} status - Health status (healthy, degraded, critical, down)
 * @property {boolean} operational - Whether source is working
 * @property {number} healthScore - Health score 0-100
 * @property {ResponseTimeMetrics} responseTime - Response time statistics
 * @property {ErrorMetrics} errorMetrics - Error rate and patterns
 * @property {RateLimitMetrics} rateLimit - Rate limiting status
 * @property {DataQualityMetrics} dataQuality - Data quality indicators
 * @property {number} lastSuccessfulOperation - Last successful operation timestamp
 * @property {number} consecutiveFailures - Number of consecutive failures
 * @property {string} lastError - Last error message
 * @property {CircuitBreakerState} circuitBreaker - Circuit breaker status
 */

/**
 * Operation metrics for successful operations
 * @typedef {Object} OperationMetrics
 * @property {string} operation - Operation type (fetch, transform, etc.)
 * @property {number} duration - Operation duration in ms
 * @property {number} recordCount - Number of records processed
 * @property {number} timestamp - When operation completed
 * @property {Object} metadata - Additional operation-specific data
 */

/**
 * Operation error information
 * @typedef {Object} OperationError
 * @property {string} operation - Operation that failed
 * @property {string} errorType - Type of error (network, parsing, rate_limit, etc.)
 * @property {string} message - Error message
 * @property {number} statusCode - HTTP status code if applicable
 * @property {boolean} retryable - Whether error is retryable
 * @property {number} timestamp - When error occurred
 * @property {Object} context - Additional error context
 */

/**
 * Time period specification
 * @typedef {Object} TimePeriod
 * @property {number} startTime - Start timestamp
 * @property {number} endTime - End timestamp
 * @property {string} period - Period type (hour, day, week, month)
 * @property {string} timezone - Timezone for period calculations
 */

/**
 * Performance metrics over time period
 * @typedef {Object} PerformanceMetrics
 * @property {string} sourceId - Data source identifier
 * @property {TimePeriod} period - Time period for metrics
 * @property {number} totalRequests - Total requests made
 * @property {number} successfulRequests - Successful requests
 * @property {number} failedRequests - Failed requests
 * @property {number} successRate - Success rate (0-1)
 * @property {ResponseTimeStats} responseTime - Response time statistics
 * @property {ThroughputStats} throughput - Request throughput statistics
 * @property {ErrorBreakdown} errorBreakdown - Breakdown of error types
 * @property {AvailabilityStats} availability - Availability statistics
 */

/**
 * Response time statistics
 * @typedef {Object} ResponseTimeMetrics
 * @property {number} current - Current response time (last request)
 * @property {number} average - Average response time
 * @property {number} median - Median response time
 * @property {number} p95 - 95th percentile response time
 * @property {number} p99 - 99th percentile response time
 * @property {number} min - Minimum response time
 * @property {number} max - Maximum response time
 * @property {Array<ResponseTimePoint>} trend - Response time trend data
 */

/**
 * Error metrics and patterns
 * @typedef {Object} ErrorMetrics
 * @property {number} errorRate - Current error rate (0-1)
 * @property {number} errorCount - Number of errors in recent period
 * @property {Object<string, number>} errorTypes - Count by error type
 * @property {Array<RecentError>} recentErrors - Recent error samples
 * @property {ErrorTrend} trend - Error rate trend
 */

/**
 * Rate limiting metrics
 * @typedef {Object} RateLimitMetrics
 * @property {boolean} active - Whether rate limiting is active
 * @property {number} remaining - Requests remaining in current window
 * @property {number} limit - Total request limit for window
 * @property {number} resetTime - When current window resets
 * @property {number} utilizationRate - Utilization rate (0-1)
 * @property {boolean} exceeded - Whether rate limit has been exceeded recently
 */

/**
 * Data quality metrics
 * @typedef {Object} DataQualityMetrics
 * @property {number} completenessScore - Data completeness (0-1)
 * @property {number} consistencyScore - Data consistency across sources (0-1)
 * @property {number} freshnessScore - Data freshness score (0-1)
 * @property {Array<string>} qualityIssues - Current data quality issues
 * @property {number} recordCount - Number of records in last fetch
 * @property {number} duplicateCount - Number of duplicate records detected
 */

/**
 * Circuit breaker state
 * @typedef {Object} CircuitBreakerState
 * @property {string} state - State (closed, open, half-open)
 * @property {number} failureCount - Current failure count
 * @property {number} failureThreshold - Threshold for opening circuit
 * @property {number} nextRetryTime - When next retry is allowed
 * @property {number} successThreshold - Successes needed to close circuit
 */

/**
 * Health alert information
 * @typedef {Object} HealthAlert
 * @property {string} id - Unique alert identifier
 * @property {AlertLevel} level - Alert severity level
 * @property {string} type - Alert type (performance, availability, data_quality, etc.)
 * @property {string} source - Source that triggered alert
 * @property {string} title - Alert title
 * @property {string} description - Detailed alert description
 * @property {number} timestamp - When alert was triggered
 * @property {boolean} active - Whether alert is currently active
 * @property {Object} metadata - Additional alert-specific data
 * @property {Array<string>} actions - Recommended actions
 */

/**
 * Alert severity levels
 * @typedef {string} AlertLevel
 * @description One of: 'info', 'warning', 'error', 'critical'
 */

/**
 * Degraded mode status
 * @typedef {Object} DegradedModeStatus
 * @property {boolean} recommended - Whether degraded mode is recommended
 * @property {boolean} active - Whether degraded mode is currently active
 * @property {Array<string>} reasons - Reasons for degraded mode
 * @property {Array<string>} disabledSources - Sources disabled in degraded mode
 * @property {DegradedModeConfig} config - Degraded mode configuration
 */

/**
 * Degraded mode configuration
 * @typedef {Object} DegradedModeConfig
 * @property {number} errorThreshold - Error rate threshold for activation
 * @property {number} responseTimeThreshold - Response time threshold
 * @property {number} minimumSources - Minimum sources required to avoid degraded mode
 * @property {Array<string>} essentialSources - Sources that must be healthy
 */

/**
 * Health trends over time
 * @typedef {Object} HealthTrends
 * @property {string} sourceId - Data source identifier
 * @property {TimePeriod} period - Time period for trends
 * @property {Array<HealthTrendPoint>} healthScore - Health score over time
 * @property {Array<HealthTrendPoint>} errorRate - Error rate trend
 * @property {Array<HealthTrendPoint>} responseTime - Response time trend
 * @property {Array<HealthTrendPoint>} availability - Availability trend
 * @property {string} overallTrend - Overall trend (improving, stable, degrading)
 * @property {Array<TrendInsight>} insights - Notable trends and patterns
 */

/**
 * Single point in health trend
 * @typedef {Object} HealthTrendPoint
 * @property {number} timestamp - Time point
 * @property {number} value - Metric value at this time
 * @property {string} label - Human readable time label
 */

/**
 * Trend insight
 * @typedef {Object} TrendInsight
 * @property {string} type - Insight type (anomaly, pattern, improvement, etc.)
 * @property {string} description - Description of the insight
 * @property {number} confidence - Confidence in insight (0-1)
 * @property {TimePeriod} period - Period when insight applies
 */

/**
 * System-wide metrics
 * @typedef {Object} SystemMetrics
 * @property {number} totalRequests - Total requests across all sources
 * @property {number} successRate - Overall success rate
 * @property {number} averageResponseTime - Average response time across sources
 * @property {number} dataFreshness - Overall data freshness score
 * @property {number} sourceCount - Number of active sources
 * @property {number} healthySourceCount - Number of healthy sources
 */

module.exports = IHealthMonitor;