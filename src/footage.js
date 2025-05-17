const ffmpeg = require('fluent-ffmpeg')
const config = require('./config.js')
const { logger } = require('./logger.js');
const { removeTempFiles } = require('./utils.js')
const { M3u8Parser, MASTER_DIRECTIVES } = require('./m3u8.js')
const path = require('node:path')
const fs = require('node:fs')

function mergeTsSegments(segmentsArray, resourceName, ext){
    try {
        const ffmpeg_command = ffmpeg()
        segmentsArray.forEach(segmentPath => {
            const segmentExists = fs.existsSync(segmentPath)
            if(segmentExists){
                logger.debug(`...Adding segment to merge path: ${segmentPath.includes('/') ? segmentPath.split('/').toReversed()[0] : segmentPath.split('\\').toReversed()[0]}`)
                ffmpeg_command.mergeAdd(segmentPath);
            } else {
                throw new Error('Segment file does not exists or the given path is incorrect.')
            }
        });
        
        const footageOutputPath = path.join(config.temp.dir, `${resourceName}.${ext}`)
        ffmpeg_command
            .mergeToFile(footageOutputPath, {tempDir: config.temp.dir})
                .on('end', () => {
                    logger.info('ffmpeg merge complete!')
                    removeTempFiles(segmentsArray)
                })
                .on('error', (err) => {
                    logger.error('Failed to merge ts segments.\n', err)
                    throw err
                })

        return footageOutputPath
    } catch(err){
        logger.error('FootageMerge Error: ', err)
        throw err
    }
}

async function getSequenceFromMaster(masterUrl, resolution){
    // fetch and parse the master playlist based on the resolution 
    const masterM3u8Str = await fetchFromResourceServer(masterUrl)
    const masterPlaylist = M3u8Parser.master(masterM3u8Str, MASTER_DIRECTIVES.STREAM_INFO)

    // fetch and parse the sequence playlist based on the resolution 
    const sequenceM3u8Str = await fetchFromResourceServer(masterPlaylist[resolution])
    const sequence = M3u8Parser.segments(sequenceM3u8Str)
    return sequence
}

module.exports = { mergeTsSegments, getSequenceFromMaster }