const ffmpeg = require('fluent-ffmpeg')
const config = require('./config.js')
const { logger } = require('./logger.js');
const { removeTempFiles, getFootageResourceName } = require('./utils.js')
const { fetchFromResourceServer } = require("./scraper.js")
const { M3u8Parser, MASTER_DIRECTIVES } = require('./m3u8.js')
const path = require('node:path')
const fs = require('node:fs')


async function sequenceFromMaster(masterUrl, resolution, url){
    // fetch and parse the master playlist based on the resolution 
    const masterM3u8Str = await fetchFromResourceServer(masterUrl)
    const masterPlaylist = M3u8Parser.master(masterM3u8Str, MASTER_DIRECTIVES.STREAM_INFO)

    // fetch and parse the sequence playlist based on the resolution 
    const sequenceM3u8Str = await fetchFromResourceServer(masterPlaylist[resolution])
    const sequence = M3u8Parser.segments(sequenceM3u8Str)
    logger.debug(`${sequence}`)
    return sequence
}


async function getSegmentsFromCMS(segments){
    const segmentRefs = []
    for(let i=0; i < segments.length; i++){ 
        const tsFile = await fetchFromResourceServer(segments[i].uri)
        segmentRefs.push(tsFile)
    }
    return segmentRefs
}


async function mergeTsSegments(segmentsArray, url, ext){
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
        
        const resourceName = getFootageResourceName(url)
        const footageOutputPath = await executeMerge(ffmpeg_command, segmentsArray, resourceName, ext)        

        return footageOutputPath
    } catch(err){
        logger.error('FootageMerge Error: ', err)
        throw err
    }
}

async function executeMerge(ffmpeg_command, segmentsArray, resourceName, ext){
    const footageOutputPath = path.join(config.temp.dir, `${resourceName}.${ext}`)
    return new Promise((resolve, reject) => {
        try {
            ffmpeg_command.mergeToFile(footageOutputPath, {tempDir: config.temp.dir})
                .on('end', () => {
                    logger.info('ffmpeg merge complete!')
                    resolve(footageOutputPath)
                    removeTempFiles(segmentsArray)
                })
                .on('error', (err) => {
                    logger.error('Failed to merge ts segments.\n', err)
                    removeTempFiles(segmentsArray)
                    reject(err)
                })
        } catch(err){
            logger.error('Merge Error: Issue occurred during merge.\n', err)
            reject(err)
        }
    })
}

module.exports = { mergeTsSegments, sequenceFromMaster, getSegmentsFromCMS }