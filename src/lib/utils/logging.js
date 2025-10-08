const { createLogger, format, transports } = require('winston')

/*  sysLevels__
    emerg: 0 | alert: 1,
    crit: 2 | error: 3,
    warning: 4 | notice: 5,
    info: 6 | debug: 7
*/

const logger = createLogger({
    format: format.simple()
})

// logger.add(new transports.File({level: 'info', filename: config.paths.logFile}))

logger.add(new transports.Console({level: 'debug', format: format.cli()}))

module.exports = { logger }