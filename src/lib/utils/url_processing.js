const config = require('../../config.js')
const { logger } = require('./logging.js')

const pathIncludesM3u8 = (url) => url.includes('.m3u8') && url.includes('playlist')

const validResourceURL = (url, { acceptType }) => {
    const acceptResourceTypeList = Object.keys(config.resources.acceptResourceTypePaths)
    if(!acceptResourceTypeList.includes(acceptType)){
        throw new TypeError('Resource type does not exist.')
    }

    const isAcceptedType = url.includes(config.resources.acceptResourceTypePaths[acceptType])
    const validProtocol = url.includes(config.resources.acceptProtocols[0])
    if(isAcceptedType){
        if(url.startsWith("www")){
            logger.warn("Protocol speciification is missing from resource URL! Protocol defaults to 'https'.")
        } else if(!validProtocol){
            throw new TypeError("Invalid protocol! Protocol must be 'https'.")
        }
        
        return url
    }
    
    return false
}


const getFootageResourceName = (url) => {
    if(!(typeof url === 'string')){
        throw new TypeError('Url must be a string.')
    }

    if(!url.includes(config.resources.acceptResourceTypePaths.footage)){
        return
    }

    const resourceNameFromPath = url.split('/').toReversed()[1]
    return resourceNameFromPath
}


const getFootageResourceID = (url) => {
    if(!(typeof url === 'string')){
        throw new TypeError('Url must be a string.')
    }

    if(!url.includes(config.resources.acceptResourceTypePaths.footage)){
        return
    }

    const resourceIDFromPath = url.split('/').toReversed()[0]
    return resourceIDFromPath
}


const gethostnameFromUrl = (url) => {
    if(!(typeof url === 'string')){
        throw new TypeError('Url must be a string.')
    }

    const urlObj = new URL(url)
    return urlObj.hostname
}

module.exports = {
    validResourceURL,
    getFootageResourceName,
    getFootageResourceID,
    pathIncludesM3u8,
    gethostnameFromUrl
}