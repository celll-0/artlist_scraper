const config = require('./config.js')
const fs = require('node:fs')
const path = require('node:path')
const { until, By } = require('selenium-webdriver')
const { logger } = require('./logger.js')


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


const removeTempFiles = (tempFiles) => {
    if(removeTempFiles.length === 0){
        throw new Error('File array must contain at least on file')
    }

    setTimeout(()=>{}, 2000)

    const isTempDir = (file) => path.dirname(file) === config.temp.dir;
    const isTempFile = (file) => path.basename(file).includes(config.temp.filenameTag)
    tempFiles.forEach((filename) => {
        if(!isTempDir(filename) || !isTempFile(filename)){
            throw new TypeError('File is not a temp file or is not in the applications temp directiory.')
        }
        fs.rm(filename, (err) => {
            if(err) logger.warn(`${err}`);
        })
    })
    logger.info('Temp files cleared!')
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


async function awaitPageElemLoad(driver, elemSelector){    
    // Wait for the video element to load
    logger.info("Awaiting master playlist files...")
    await driver.wait(until.elementLocated(By.css(elemSelector)), 15000)
    logger.info("Master playlist files loaded!")

    // Wait for the video element to play.
    // |_ Assumes the auto is enable for the element.
    const videoElem = driver.executeScript(`return document.querySelector('${elemSelector}')`)
    const isPlaying = async () => await driver.executeScript(`
        return arguments[0].currentTime > 0 && !arguments[0].paused && !arguments[0].ended
    `, videoElem)
    await driver.wait(isPlaying, 6000)
}


module.exports = { validResourceURL, removeTempFiles, getFootageResourceName, getFootageResourceID, awaitPageElemLoad, pathIncludesM3u8 }