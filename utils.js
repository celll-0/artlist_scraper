const config = require('./config.js')
const fs = require('node:fs')
const path = require('node:path')


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


const removeTempFiles = (tempFiles) => {
    if(removeTempFiles.length === 0){
        throw new Error('File array must contain at least on file')
    }

    const isTempDir = (file) => path.dirname(file) === config.tempFiles.dir;
    const isTempFile = (file) => path.basename(file).includes(config.tempFiles.filenameTag)
    tempFiles.forEach((filename) => {
        if(!isTempDir(filename) || !isTempFile(filename)){
            throw new TypeError('File is not a temp file or is not in the applications temp directiory.')
        }

        fs.rm(filename)
    })
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


module.exports = { validResourceURL, removeTempFiles, getFootageResourceName, getFootageResourceID }