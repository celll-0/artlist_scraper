const Scraper = require("../lib/scraper.js")
const { buildVideoFromSegments, getStreamSequence, fetchStreamSegments } = require('../services/footage.service.js')
const { logger } = require('../lib/utils/logging.js')
const { validResourceURL } = require('../lib/utils/url_processing.js')
const { findFirstPlaylist } = require('../lib/utils/file_ops.js')
 

const footageResourceController = async (req, res) => {
    const {resourceUrl, resolution, format} = req.body
    try {
        if(!validResourceURL(resourceUrl, {acceptType: 'footage'})){
            res.status(400).json({ error: new TypeError("Invalid resource URL").message })
        }
        // Search the network activity for the resource URL containing m3u8 files
        const activity = await Scraper.searchNetworkActivity(resourceUrl)
        // Find the first resource with the M3U8 file type, as the masster playlist is required
        // to locate all full sequences. Then fetch and build the sequence segment reference list.
        const sequence = await getStreamSequence(findFirstPlaylist(activity), resolution)
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


module.exports = footageResourceController