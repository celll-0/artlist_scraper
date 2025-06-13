const { catchResourceNetActivity } = require("../scraper.js")
const { logger } = require('../logger.js')
const { validResourceURL, pathIncludesM3u8 } = require('../utils.js')
const { mergeTsSegments, sequenceFromMaster, getSegmentsFromCMS } = require('../footage.js')
 

const footageResourceController = async (req, res) => {
    const {resource: url, resolution, format} = req.body
    try {
        if(!validResourceURL(url, {acceptType: 'footage'})){
            res.status(400).json({ error: new TypeError("Invalid resource URL").message })
        }

        const activity = await catchResourceNetActivity(url)
        if(activity.length >= 1){
            const resource = activity.find((transaction) => pathIncludesM3u8(transaction.request.url))
            var masterPlaylistName = resource.request.url.split('/').toReversed()[0]
        } else {
            throw new Error('Failed to located resource playlist! Resource either does not exist or search criteria is incorrect.')
        }

        const sequence = await sequenceFromMaster(masterPlaylistName, resolution)
        const segmentRefs = await getSegmentsFromCMS(sequence.segments)
        const {footageOutputPath, resourceName} = mergeTsSegments(segmentRefs, url, format)
        res.status(200).sendFile(resourceName, footageOutputPath, (err) => {
            err ? logger.error('Resource Error: Could not send file in response.\n', err) : logger.info('Video file Sent');
        })
    } catch(err){
        logger.error('Resource Error: ', err)
        res.status(500).json({ error: err.message })
    }
}


const cTest = () => {}

module.exports = { footageResourceController, cTest }