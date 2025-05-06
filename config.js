module.exports = {
    resources: {
        resourceServerUrl: 'https://cms-public-artifacts.artlist.io/content/artgrid/footage-hls/',
        acceptFileTypes: ['m3u8'],
        acceptmediaType: ['ts'],
        acceptResourceTypePaths: {
            footage: "stock-footage/clip"
        }, 
        acceptProtocols: ['https://']
    },
}