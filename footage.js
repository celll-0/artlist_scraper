const ffmpeg = require('fluent-ffmpeg')

async function mergetsSegments(mediaStreams){
    const segmentBuffer = undefined

    for(let i=0; i < mediaStreams.length; i++){
        const ffmpeg_command = ffmpeg()
            .addMerge(segmentBuffer)
            .addMerge(mediaStreams[i])
            
        ffmpeg_command.output('./temp/output-artlist-video.mp4')
        ffmpeg_command.run()       
    }

}