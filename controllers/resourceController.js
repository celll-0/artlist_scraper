const { getNetResourceActivity, getM3u8 } = require("../scraper.js")
const { M3u8Parser } = require('../m3u8.js')
const { logger } = require('../logger.js')

const resourceController = async (req, res) => {
    const url = req.body.resource

    try {
        if(!validResourceURL(url)){
            res.status(400).json({ error: new TypeError("Invalid resource URL").message })
        }

        // var result = await getNetResourceActivity(url)
        var m3u8Str = await getM3u8('https://cms-public-artifacts.artlist.io/content/artgrid/footage-hls/4b54378d-f3c6-4365-b965-7d659f0095ee_playlist_1709719789.m3u8')
        var result = M3u8Parser._getDirectives(m3u8Str)
        res.json(result)
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
            #EXT-X-STREAM-INF:BANDWIDTH=400000,RESOLUTION=426x240
            97703_240p.m3u8
            #EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360
            97703_360p.m3u8
            #EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=842x480
            97703_480p.m3u8
            #EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720
            97703_720p.m3u8
            #EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080
            97703_1080p.m3u8
            #EXT-X-STREAM-INF:BANDWIDTH=10000000,RESOLUTION=3840x2160
            97703_2160p.m3u8`

        const result = M3u8Parser.playlists(file, 'EXT-X-STREAM-INF')
        res.json(result)
    } catch(err){
        logger.error('TestRoute Error: ', err)
        res.status(500).json({error: err.message})
    }
}


const validResourceURL = (url) => {
    const acceptedResourcePaths = ["stock-footage/clip", "pixelscan", "httpbin", "johnpyeauctions"]
    const acceptProtocols = ['https://']

    for(i=0; i < acceptedResourcePaths.length; i++){
        const match = url.includes(acceptedResourcePaths[i])
        const validProtocol = url.includes(acceptProtocols[0])
        if(match){
            if(url.startsWith("www")){
                logger.warn("Protocol speciification is missing from resource URL! Protocol defaults to 'https'.")
            } else if(!validProtocol){
                throw new TypeError("Invalid protocol! Protocol must be 'https'.")
            }

            return url
        }
    }

    return false
}

module.exports = { resourceController, cTest }