const { catchResourceNetActivity } = require("../scraper.js")
const { logger } = require('../logger.js')
const { validResourceURL, pathIncludesM3u8 } = require('../utils.js')
const { buildVideoFromSegments, buildStreamSequence, fetchStreamSegments } = require('../footage.js')
 

const footageResourceController = async (req, res) => {
    const {resourceUrl, resolution, format} = req.body
    try {
        if(!validResourceURL(resourceUrl, {acceptType: 'footage'})){
            res.status(400).json({ error: new TypeError("Invalid resource URL").message })
        }

        const activity = await catchResourceNetActivity(resourceUrl)
        if(activity.length >= 1){
            const resource = activity.find((transaction) => pathIncludesM3u8(transaction.request.url))
            var masterPlaylistName = resource.request.url.split('/').toReversed()[0]
        } else {
            throw new Error('Failed to located resource playlist! Resource either does not exist or search criteria is incorrect.')
        }

        // fetch and build the sequence playlist from master as segment references
        const sequence = await buildStreamSequence(masterPlaylistName, resolution)
        // fetch the whole sequence to temp/
        const segmentPaths = await fetchStreamSegments(sequence.segments)
        // merge all resource segments to temp/
        const footageOutputPath = await buildVideoFromSegments(segmentPaths, resourceUrl, format)

        res.status(200).sendFile(footageOutputPath, (err) => {
            err ? logger.error('Resource Error: Could not send file in response.\n', err) : logger.info('Video file Sent');
        })
    } catch(err){
        logger.error('Resource Error: ', err)
        res.status(500).json({ error: err.message })
    }
}


module.exports = { footageResourceController }