const path = require('path')

module.exports = {
    resources: {
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
    temp: {
        filenameTag: 'tempSegment',
        dir: path.join(path.resolve(__dirname), 'temp'),
        clearAfterMergeTimeout: 500,
    },
    urls: {
        hostMarker: 'cms-public-artifacts.artlist.io',
        resourceServerUrl: 'https://cms-public-artifacts.artlist.io/content/artgrid/footage-hls/',       
        proxyServer:  "https://proxy.webshare.io/api/v2/proxy/list/",
        proxyInspector: "https://pixelscan.net/s/api/ci"
    },
    paths: {
        chromedriver: path.resolve('undetected_chromedriver.exe'), 
        chromeExe: process.env['CHROME_EXECUTABLE_PATH'],
        logFile: path.resolve('winston-log.log')
    }
}