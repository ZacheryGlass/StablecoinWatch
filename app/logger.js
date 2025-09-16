const winston = require('winston');

/**
 * Application-wide logging setup using Winston.
 *
 * Configures a structured JSON logger with log levels controlled by
 * the LOG_LEVEL environment variable.
 *
 * Supported LOG_LEVELS: error, warn, info, http, verbose, debug, silly
 */
function setupLogger() {
    const level = (process.env.LOG_LEVEL || 'info').toLowerCase();

    const logger = winston.createLogger({
        level: level,
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }), // Log stack traces
            winston.format.json()
        ),
        transports: [
            new winston.transports.Console({
                // In development, use a simpler format for readability
                format: process.env.NODE_ENV === 'development' ? winston.format.combine(
                    winston.format.colorize(),
                    winston.format.simple()
                ) : undefined,
            }),
        ],
        exitOnError: false, // Do not exit on handled exceptions
    });

    // Create a stream for morgan logging
    logger.stream = {
        write: (message) => {
            logger.http(message.trim());
        },
    };

    // Expose a global DEBUG flag for legacy modules
    global.DEBUG = ['debug', 'verbose', 'silly'].includes(level);

    if (global.DEBUG) {
        logger.info(`Verbose logging enabled with level: ${level}`);
    }

    return logger;
}

const logger = setupLogger();

module.exports = logger;