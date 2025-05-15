const { createLogger, format, transports } = require('winston')

/*  sysLevels__
    emerg: 0 | alert: 1,
    crit: 2 | error: 3,
    warning: 4 | notice: 5,
    info: 6 | debug: 7
*/

const logger = createLogger({
    level: 'info',
    format: format.cli(),
})

logger.add(new transports.File({filename: './winston-log.log', level: 'info'}))

module.exports = { logger }