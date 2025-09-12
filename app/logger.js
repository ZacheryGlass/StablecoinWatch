/**
 * Minimal application-wide logging setup with a single toggle.
 *
 * Controls verbosity via either LOG_LEVEL=debug or VERBOSE_LOGGING=true.
 * When not in debug, console.debug becomes a no-op. Other console methods
 * are left intact to avoid behavior changes.
 */
(function setupLogger() {
    const level = (process.env.LOG_LEVEL || '').toLowerCase();
    const verbose = String(process.env.VERBOSE_LOGGING || process.env.VERBOSE || '').toLowerCase() === 'true';
    // Also honor DEBUG=true as a universal debug toggle
    const envDebug = String(process.env.DEBUG || '').toLowerCase() === 'true';
    const isDebug = envDebug || verbose || level === 'debug';

    const original = {
        debug: console.debug.bind(console),
        info: console.info.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console),
        log: console.log.bind(console)
    };

    // Timestamp prefix helper (kept lightweight)
    const ts = () => new Date().toISOString();
    const withPrefix = (fn, tag) => (...args) => fn(`[${ts()}] ${tag}:`, ...args);

    // Wrap info/warn/error/log to include level + timestamp for consistency
    console.info = withPrefix(original.info, 'info');
    console.warn = withPrefix(original.warn, 'warn');
    console.error = withPrefix(original.error, 'error');
    console.log = withPrefix(original.log, 'log');

    // Expose a global DEBUG flag for legacy modules that use it
    global.DEBUG = !!isDebug;

    // Control debug output via the single toggle
    if (isDebug) {
        console.debug = withPrefix(original.debug, 'debug');
        console.info('[logger] Verbose logging enabled (LOG_LEVEL=debug or VERBOSE_LOGGING=true)');
    } else {
        console.debug = () => {};
    }
})();

module.exports = {};
