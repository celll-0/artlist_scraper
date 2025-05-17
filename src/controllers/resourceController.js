const { catchResourceNetActivity, fetchFromResourceServer } = require("../scraper.js")
const { logger } = require('../logger.js')
const { validResourceURL } = require('../utils.js')
const { mergeTsSegments, getSequenceFromMaster } = require('../footage.js')
const { getFootageResourceName, includesM3u8Path } = require('../utils.js')
 
const footageResourceController = async (req, res) => {
    const url = req.body.resource
    const resolution = '1080'
    const format = 'mp4'

    try {
        if(!validResourceURL(url, {acceptType: 'footage'})){
            res.status(400).json({ error: new TypeError("Invalid resource URL").message })
        }

        const activity = await catchResourceNetActivity(url)
        if(activity.length >= 1){
            const resource = activity.find((transaction) => includesM3u8Path(transaction.request.url))
            var masterPlaylistURI = resource.request.url.split('/').toReversed()[0]
        } else {
            throw new Error('Failed to located resource playlist! Resource either does not exist or search criteria is incorrect.')
        }

        var tsClips = []
        const sequence = getSequenceFromMaster(masterPlaylistURI, resolution)
        for(let i=0; i < sequence.segments.length; i++){
            const tsFile = await fetchFromResourceServer(sequence.segments[i].uri)
            tsClips.push(tsFile)
        }
        
        const resourceName = getFootageResourceName(url)
        const footage = mergeTsSegments(tsClips, resourceName, format)
        res.status(200).json(footage)
    } catch(err){
        logger.error('ResourceController Error: ', err)
        res.status(500).json({ error: err.message })
    }
}


const cTest = () => {}

module.exports = { footageResourceController, cTest }