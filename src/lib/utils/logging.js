const { createLogger, format, transports } = require('winston')

/**
 * @callback ShowProxiesFn
 * @param {Array<{id:string,proxy_address:string,port:number}>} proxies
 * @param {string} [origin]
 * @returns {void}
 */

/**
 * @callback SetLogLevelFn
 * @param {string} [level]
 * @returns {void}
 */

/**
 * @typedef {import('winston').Logger & { showProxies: ShowProxiesFn, setLogLevel: SetLogLevelFn }} CustomLogger
 */

/**
 * Factory function type for creating an application logger.
 * @callback CreateAppLogger
 * @param {object} [opts] createLogger options
 * @returns {CustomLogger}
 */

/**
 * Create a new logger instance and attach helper methods.
 * This preserves the prototype-level level methods that winston's
 * `createLogger` adds (info, warn, debug, isInfoEnabled, etc.).
 *
 * @param {object} opts createLogger options
 * @returns {CustomLogger}
 */
function createAppLogger(opts = {}) {
    /** @type {CustomLogger} */
    const logger = createLogger(opts)

    // Use LOG_LEVEL env var (default 'info') so debug noise can be silenced
    const consoleLevel = (process.env.LOG_LEVEL || 'info').toLowerCase()
    const consoleFormat = format.printf(({ message }) => message)
    logger.add(new transports.Console({ level: consoleLevel, format: consoleFormat }))

    logger.showProxies = function (proxies, origin = 'unknown') {
        if (!proxies || !proxies.length) return
        for (const proxy of proxies) {
            logger.info(`==> ${origin} | ${proxy.id} | ${proxy.proxy_address}:${proxy.port}`)
        }
    }       

    /**
     * Change console transport level at runtime.
     * @param {string} level
     */
    logger.setLogLevel = function (level) {
        const lvl = (level || process.env.LOG_LEVEL || 'info').toLowerCase()
        for (const t of logger.transports || []) {
            // transports.Console is a constructor function; comparing by name is safer
            if (t.constructor && t.constructor.name === 'Console') {
                t.level = lvl
            }
        }
    }

    return logger
}

// Default shared logger instance used by the codebase.
const logger = createAppLogger({ format: format.simple() })

module.exports = { createAppLogger, logger }