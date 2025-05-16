const { catchResourceNetActivity, fetchFromResourceServer, IsM3u8Playlist } = require("../scraper.js")
const { M3u8Parser, MASTER_DIRECTIVES } = require('../m3u8.js')
const { logger } = require('../logger.js')
const { validResourceURL } = require('../utils.js')
const { mergeTsSegments } = require('../footage.js')
const { getFootageResourceName } = require('../utils.js')
 
const footageResourceController = async (req, res) => {
    const url = req.body.resource
    const resolution = '1080'

    try {
        if(!validResourceURL(url, {acceptType: 'footage'})){
            res.status(400).json({ error: new TypeError("Invalid resource URL").message })
        }

        const activity = await catchResourceNetActivity(url)
        if(activity.length >= 1){
            const resource = activity.find((transaction) => IsM3u8Playlist(transaction.request.url))
            var resourceId = resource.request.url.split('/').toReversed()[0]
        } else {
            throw new Error('Failed to located resource playlist! Resource either does not exist or search criteria is incorrect.')
        }

        const masterM3u8Str = await fetchFromResourceServer(resourceId)
        const masterPlaylist = M3u8Parser.master(masterM3u8Str, MASTER_DIRECTIVES.STREAM_INFO)

        const sequenceM3u8Str = await fetchFromResourceServer(masterPlaylist[resolution])
        const sequence = M3u8Parser.segments(sequenceM3u8Str)

        const tsClips = []
        for(let i=0; i < sequence.segments.length; i++){
            console.log(`Starting stream ${sequence.segments[i].uri}...`)
            const tsFile = await fetchFromResourceServer(sequence.segments[i].uri)
            tsClips.push(tsFile)
        }
        const resourceName = getFootageResourceName(url)
        const footage = mergeTsSegments(tsClips, resourceName)
        
        res.status(200).json(footage)
    } catch(err){
        logger.error('ResourceController Error: ', err)
        res.status(500).json({ error: err.message })
    }
}


const cTest = () => {}

module.exports = { footageResourceController, cTest }