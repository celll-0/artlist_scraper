const { createLogger, format, config, transports } = require('winston')

/*  sysLevels__
    emerg: 0 | alert: 1,
    crit: 2 | error: 3,
    warning: 4 | notice: 5,
    info: 6 | debug: 7
*/

const logger = createLogger({
    format: format.combine(
        format.colorize(),
        format.simple(),
    ),
    transports: [
        new transports.Console({ format: format.errors({stack: true})})
    ],
})


module.exports = { logger }