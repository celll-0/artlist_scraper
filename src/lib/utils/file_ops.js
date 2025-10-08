const fs = require('node:fs')
const path = require('node:path')
const config = require('../../config.js')
const { logger } = require('./logging.js')
const { pathIncludesM3u8 } = require('./url_processing.js')

const findFirstPlaylist = (activity) => {
    if(activity.length >= 1){
        const resource = activity.find((transaction) => pathIncludesM3u8(transaction.request.url))
        var masterPlaylistName = resource.request.url.split('/').toReversed()[0]
    } else {
        throw new Error('Failed to locate resource playlist! Resource either does not exist or is not in M3U8 format.')
    }
    return masterPlaylistName
}

const removeTempFiles = (tempFiles) => {
    if(removeTempFiles.length === 0){
        throw new Error('File array must contain at least on file')
    }

    setTimeout(()=>{}, 2000)

    const isTempDir = (file) => path.dirname(file) === config.temp.dir;
    const isTempFile = (file) => path.basename(file).includes(config.temp.filenameTag)
    tempFiles.forEach((filename) => {
        if(!isTempDir(filename) || !isTempFile(filename)){
            throw new TypeError('File is not a temp file or is not in the applications temp directiory.')
        }
        fs.rm(filename, (err) => {
            if(err) logger.warn(`${err}`);
        })
    })
    logger.info('Temp files cleared!')
}

module.exports = {
    findFirstPlaylist,
    removeTempFiles
}