const ffmpeg = require('fluent-ffmpeg')
const config = require('./config.js')
const { logger } = require('./logger.js');
const { removeTempFiles } = require('./utils.js')
const path = require('node:path')
const fs = require('node:fs')

async function mergeTsSegments(segmentsArray, resourceName){
    try {
        const fileExt = 'mp4'
        const footageOutputPath = path.join(config.tempFiles.dir, `${resourceName}.${fileExt}`)
        const ffmpeg_command = ffmpeg()
        segmentsArray.forEach(segmentPath => {
            console.log('Segment path: ', segmentPath)
            console.log('Segment: ', fs.readFileSync(segmentPath))
            console.log('Segment exists: ', fs.existsSync(segmentPath))
            if(fs.existsSync(segmentPath)) ffmpeg_command.mergeAdd(segmentPath);
            else {
                throw new Error('Segment file does not exists or the given path is incorrect.')
            }
        });
        
        ffmpeg_command
            .on('end', () => logger.info('ffmpeg merge complete!'))
            .on('error', (err) => {
                logger.error('Failed to merge ts segments.\n', err)
                throw err
            })
            .mergeToFile(footageOutputPath, {tempDir: config.tempFiles.dir})

        if(fs.existsSync(footageOutputPath)){
            return footageOutputPath
        }
    } catch(err){
        throw err
    }finally {
        // removeTempFiles(segmentsArray)
    }
}

module.exports = { mergeTsSegments }