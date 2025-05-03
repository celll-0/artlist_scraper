const { Builder, until, By } = require('selenium-webdriver')
const chrome = require('selenium-webdriver/chrome')
const path = require('node:path')
const { SessionProxyManager } = require("./proxy.js");
const axios = require('axios')
const logger = require('winston')


const IsM3u8Playlist = (url) => url.includes('.m3u8') && url.includes('playlist')


async function catchResourceNetActivity(url){
    const driver = await buildDriver()
    try {
        await driver.get(url)
        
        await awaitVideoAndM3u8Files(driver)
        const networkLogs = await driver.manage().logs().get("performance")
        const sentRequests = networkLogs.filter((transaction) => {
            const transactionData = JSON.parse(transaction.message)
            return transactionData.message.method === 'Network.requestWillBeSent' ? true : false;
        })
        
        const networkActivity = []
        for(const Obj of sentRequests){
            const transactionData = JSON.parse(Obj.message)
            const { message: { params: { request, requestId }}} = transactionData
        
            if(IsM3u8Playlist(request.url)){
                networkActivity.push({ requestId, request })
            }
        }
        
        if(networkActivity.length === 0){
            throw new Error('Failed to located resource playlist! Resource either does not exist or search criteria is incorrect.')
        }

        return networkActivity
    } catch(err){
        logger.error('An error occurred while scraping the site')
        throw err
    } finally {
        // await driver.quit()
    }
}

async function awaitVideoAndM3u8Files(driver){
    const videoElemSelector = 'video'
    
    // Wait for the video element to load
    logger.info("Awaiting video files...")
    await driver.wait(until.elementLocated(By.css(videoElemSelector)), 6000)
    logger.info("Video Element loaded!")

    // Wait for the video element to play.
    // >> Assumes the auto is enable for the element.
    const videoElem = driver.executeScript(`return document.querySelector('${videoElemSelector}')`)
    const isPlaying = async () => await driver.executeScript(`
        return arguments[0].currentTime > 0 && !arguments[0].paused && !arguments[0].ended
    `, videoElem)
    await driver.wait(isPlaying, 6000)
}


async function buildDriver(){
    const sessionProxyManager = new SessionProxyManager({ mode: "direct", sessionDuration: 60000})
    const proxy = await sessionProxyManager.sessionProxy()
 
    const chromeDriverPath = path.resolve(__dirname, 'undetected_chromedriver.exe');
    const chromeExePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

    const chromeOptions = new chrome.Options();
    chromeOptions.setChromeBinaryPath(chromeExePath)
    chromeOptions.setLoggingPrefs({'performance': "ALL"})
    chromeOptions.setPerfLoggingPrefs({enableNetwork: true})

    console.log({chromeOptions: chromeOptions.map_})

    const driver = new Builder()
        .forBrowser('chrome')
        .setChromeOptions(chromeOptions)
        // .setProxy(seleniumProxy.manual({https: `${proxy.proxy_address}:${proxy.port}>`}))
        // .setChromeOptions(chromeOptions.addArguments("--headless=new"))
        .setChromeService(new chrome.ServiceBuilder(chromeDriverPath))
        .build();

    return driver
}

async function fetchResourcePlaylist(url){
    console.info(url)
    if(!url.includes('.m3u8')){
        throw new TypeError('The resource must be a m3u8 with the file extension ".m3u8"')
    }

    const chunks = []
    const m3u8 = new Promise(async (resolve, reject) => {
        try {
            const {data: stream} = await axios.get( url, { method: 'get', responseType: 'stream' })
            stream.on('data', (data) => chunks.push(data))
            stream.on('close', () => {
                const m3u8ASCII = Buffer.concat(chunks).toString('utf-8')
                resolve(m3u8ASCII)
            })
            stream.on('error', (error) => {throw error})
        } catch(err){
            logger.error('An error occured while fetching m3u8 files!')
            reject(err)
        }
    })
    return m3u8    
}
module.exports = { catchResourceNetActivity, fetchResourcePlaylist, IsM3u8Playlist }