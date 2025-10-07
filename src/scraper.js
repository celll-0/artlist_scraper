const { Builder} = require('selenium-webdriver')
const chrome = require('selenium-webdriver/chrome')
const path = require('node:path')
const { SessionProxyManager } = require("./proxy.js");
const axios = require('axios')
const { logger } = require('./logger.js');
const config = require('./config.js');
const { createWriteStream } = require('node:fs');
const { awaitPageElemLoad, pathIncludesM3u8 } = require('./utils.js')



async function buildDriver(){
    // const sessionProxyManager = new SessionProxyManager({ mode: "direct", sessionDuration: 60000})
    // const proxy = await sessionProxyManager.sessionProxy()
    const chromeDriverPath = config.paths.chromedriver;
    const chromeExePath = config.paths.chromeExe

    const chromeOptions = new chrome.Options();
    chromeOptions.setChromeBinaryPath(chromeExePath)
    chromeOptions.setLoggingPrefs({'performance': "ALL"})
    chromeOptions.setPerfLoggingPrefs({enableNetwork: true})
    chromeOptions.addArguments("--headless=new")
    chromeOptions.addArguments("--disable-blink-features=AutomationControlled")
    chromeOptions.addArguments(`user-agent=${"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.53 Safari/537.36"}`)
    chromeOptions.excludeSwitches(["enable-automation"])

    const driver = new Builder()
        .forBrowser('chrome')
        .setChromeOptions(chromeOptions)
        .setChromeService(new chrome.ServiceBuilder(chromeDriverPath))
        .build();
        // .setProxy(seleniumProxy.manual({https: `${proxy.proxy_address}:${proxy.port}>`}))

    return driver
}

async function catchResourceNetActivity(url){
    const driver = await buildDriver()
    try {
        await driver.get(url)
        
        await awaitPageElemLoad(driver, 'video')
        const networkLogs = await driver.manage().logs().get("performance")
        const sentRequests = networkLogs.filter((transaction) => {
            const transactionData = JSON.parse(transaction.message)
            return transactionData.message.method === 'Network.requestWillBeSent' ? true : false;
        })
        
        const networkActivity = []
        for(const Obj of sentRequests){
            const transactionData = JSON.parse(Obj.message)
            const { message: { params: { request, requestId }}} = transactionData
        
            if(pathIncludesM3u8(request.url)){
                networkActivity.push({ requestId, request })
            }
        }

        return networkActivity
    } catch(err){
        logger.error('An error occurred while scraping the site', err)
        throw err
    } finally {
        await driver.quit()
    }
}

async function fetchFromResourceServer(resourceName){
    const resourceFileExtension = resourceName.split('.').toReversed()[0]
    if(!config.resources.acceptFileTypes.includes(resourceFileExtension) && !config.resources.acceptmediaType.includes(resourceFileExtension)){
        throw new TypeError('The resource file is not of an accepted type')
    }

    const url = config.urls.resourceServerUrl + resourceName
    try {
        switch(resourceFileExtension){
            case 'm3u8': var resource = await artlist_fetchMediaPlaylist(url)
                break;
            
            case 'ts': var resource = await artlist_fetchMedia(url, resourceName)
                break
        }
        return resource
    } catch(err){
        throw new Error("ResourceFetch Error: ", err)
    }
}

async function artlist_fetchMediaPlaylist(url){
    const playlist = new Promise(async (resolve, reject) => {
        try {
            const chunks = []
            const {data: stream, ...res} = await axios.get( url, { method: 'get', responseType: 'stream' })
            stream.on('data', (data) => chunks.push(data))
            stream.on('close', () => {
                const m3u8ASCII = Buffer.concat(chunks).toString('utf-8')
                resolve(m3u8ASCII)
            })
            stream.on('error', (error) => {throw error})
        } catch(err){
            logger.error('An error occured while fetching m3u8 files!', err)
            reject(err)
            throw err
        }
    })
    return playlist
}

async function artlist_fetchMedia(url, resourceName){
    return new Promise(async (resolve, reject) => {
        try {
            const {data: stream, ...res} = await axios.get( url, {
                method: 'get', responseType: 'stream',
                headers: {
                    Accept: 'video/mpeg',
            }})
            
            const filePath = path.join(config.temp.dir, `${config.temp.filenameTag}-${resourceName}`)
            const wStream = createWriteStream(filePath)
            await stream.pipe(wStream)

            let downloadingData = false
            stream.on('data', data => {
                if(!downloadingData){
                    downloadingData = true
                    logger.info("Downloading video chunks...")
                }
            })
            stream.on('end', (event) => {
                logger.info(`Stream Ended!`)
                downloadingData = false
                if(wStream.writableEnded === true){
                    resolve(filePath)
                    // wStream.wri
                }
            })
            stream.on('error', (err) => {
                throw new Error(`FetchMedia Error: Axios media stream failed for '${filePath}'.`, err)
            })
        } catch(err){
            logger.error('An error occured while fetching m3u8 files!', err)
            reject(err)
            throw err
        }
    })
}

module.exports = { catchResourceNetActivity, fetchFromResourceServer }