const { catchResourceNetActivity, fetchFromResourceServer, IsM3u8Playlist } = require("../scraper.js")
const { M3u8Parser, MASTER_DIRECTIVES } = require('../m3u8.js')
const { logger } = require('../logger.js')
const { validResourceURL } = require('../utils.js')
 
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
            var resourceName = resource.request.url.split('/').toReversed()[0]
        } else {
            throw new Error('Failed to located resource playlist! Resource either does not exist or search criteria is incorrect.')
        }

        const masterM3u8Str = await fetchFromResourceServer(resourceName)
        const masterPlaylist = M3u8Parser.master(masterM3u8Str, MASTER_DIRECTIVES.STREAM_INFO)

        const sequenceM3u8Str = await fetchFromResourceServer(masterPlaylist[resolution])
        const sequence = M3u8Parser.segments(sequenceM3u8Str)

        res.status(200).json(sequence)
    } catch(err){
        logger.error('ResourceController Error: ', err)
        res.status(500).json({ error: err.message })
    }
}



const cTest = (req, res) => {
    try {
        const file = `
            #EXTM3U
            #EXT-X-VERSION:3
            #EXT-X-TARGETDURATION:6
            #EXT-X-MEDIA-SEQUENCE:0
            #EXT-X-PLAYLIST-TYPE:VOD
            #EXTINF:5.760000,
            4b54378d-f3c6-4365-b965-7d659f0095ee_2160p_000_1709719789.ts
            #EXTINF:1.200000,
            4b54378d-f3c6-4365-b965-7d659f0095ee_2160p_001_1709719789.ts
            #EXT-X-ENDLIST`

        const result = M3u8Parser.playlists(file, 'EXT-X-STREAM-INF')
        res.json(result)
    } catch(err){
        logger.error('TestRoute Error: ', err)
        res.status(500).json({error: err.message})
    }
}


module.exports = { footageResourceController, cTest }