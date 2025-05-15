const path = require('path')

module.exports = {
    resources: {
        resourceServerUrl: 'https://cms-public-artifacts.artlist.io/content/artgrid/footage-hls/',
        acceptFileTypes: ['m3u8'],
        acceptmediaType: ['ts'],
        acceptResourceTypePaths: {
            footage: "stock-footage/clip"
        }, 
        acceptProtocols: ['https://'],
        acceptContentTypes: {
            m3u8: 'application\vnd.apple.mpegurl',
            // ts: ,
        }
    },
    tempFiles: {
        filenameTag: 'tempSegment',
        dir: path.join(__dirname, 'temp'),
    }
}