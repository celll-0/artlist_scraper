const axios = require('axios')
const path = require('node:path')
const { createWriteStream } = require('node:fs');
const { Builder, until, By} = require('selenium-webdriver')
const chrome = require('selenium-webdriver/chrome')
const seleniumProxy = require('selenium-webdriver/proxy')
const { SessionProxyManager } = require("./proxy.js");
const { logger } = require('./utils/logging.js');
const { pathIncludesM3u8 } = require('./utils/url_processing.js')
const config = require('../config.js');


class Scraper {
    /**
     * Builds and returns a configured Selenium WebDriver instance with custom Chrome options and proxy settings.
     * This method sets up a headless Chrome browser with specific configurations for web scraping,
     * including user agent and automation detection prevention.
     * 
     * @returns {Promise<Builder>} A Promise that resolves to the configured WebDriver instance
     * @throws {Error} If there's an error during driver initialization or proxy setup
     */
    static async _buildDriver(){
        // Get session proxy
        const proxy = await Scraper._getSessionProxy({ mode: "direct", sessionDuration: 60000})
        const chromeExePath = config.paths.chromeExe
        const options = Scraper._buildChromeOptions(chromeExePath)
        const chromeDriverPath = config.paths.chromedriver;
        // Configure driver settings
        // Silence chromedriver/DevTools verbose output by routing service logs
        // to the platform null device and lowering chrome's log level.
        const nullDevice = process.platform === 'win32' ? 'NUL' : '/dev/null'
        const serviceBuilder = new chrome.ServiceBuilder(chromeDriverPath).loggingTo(nullDevice)

        // Add flags to reduce Chromium logging noise
        options.addArguments('--log-level=3')
        options.addArguments('--v=0')

        const driver = new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .setChromeService(serviceBuilder)
            .setProxy(seleniumProxy.manual({https: `${proxy.proxy_address}:${proxy.port}>`}))
            .build();

        return driver
    }

    /**
     * Builds and configures Chrome options for Selenium WebDriver with specific settings for web scraping.
     * Configures various Chrome flags and preferences including:
     * - Headless mode
     * - Performance logging
     * - Network monitoring
     * - Automation detection prevention
     * - Custom user agent
     * 
     * @param {string} chrome_exe - Absolute path to the Chrome executable
     * @returns {chrome.Options} Configured Chrome options object with all necessary settings
     * @throws {Error} If the Chrome executable path is invalid or inaccessible
     */
    static _buildChromeOptions(chrome_exe){
        const chromeOptions = new chrome.Options();
            // Set the path to Chrome executable for WebDriver to use the chrome browser instance version 137.*
            chromeOptions.setChromeBinaryPath(chrome_exe)
            // Enable performance logging to capture all network activity
            // This is required for capturing m3u8 playlist requests
            chromeOptions.setLoggingPrefs({'performance': "ALL"})
            chromeOptions.setPerfLoggingPrefs({enableNetwork: true})
            // Run Chrome in headless mode for better performance and resource usage
            // Using 'new' headless mode which is more stable than the legacy version
            chromeOptions.addArguments("--headless=new")
            // Disable blink engine features used to detect automation
            chromeOptions.addArguments("--disable-blink-features=AutomationControlled")
            // Set a realistic user agent to appear as a regular Chrome browser
            // This helps avoid detection and ensures normal site behavior
            chromeOptions.addArguments(`user-agent=${"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.53 Safari/537.36"}`)
            // Remove automation-specific Chrome switches
            chromeOptions.excludeSwitches(["enable-automation"])
        return chromeOptions
    }

    
    static async waitOnElementLoad(driver, elemSelector){    
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


    /**
     * Retrieves a session proxy from the SessionProxyManager for managing proxy connections.
     * The proxy can be configured with different modes and session durations for flexible proxy management.
     * 
     * @param {Object} options - Configuration options for the proxy session
     * @param {string} options.mode - Proxy mode ('direct', 'rotating', etc.)
     * @param {number} options.sessionDuration - Duration of the proxy session in milliseconds
     * @returns {Promise<ProxyObject>} A Promise that resolves to the proxy configuration object
     *                           containing proxy_address and port
     * @throws {Error} If proxy initialization fails or invalid options are provided
     */
    static async _getSessionProxy({ mode, sessionDuration}){
        const sessionProxyManager = new SessionProxyManager({ mode, sessionDuration })
        const proxy = await sessionProxyManager.sessionProxy()
        return proxy
    }

    /**
     * Searches network activity of the specified URL and extracts m3u8 playlist URLs.
     * Initializes a new WebDriver instance and waits for video elements to load.
     * Uses pathIncludesM3u8 to filter through network requests for m3u8 playlists
     * 
     * @param {string} url - The target URL to navigate to and monitor
     * @returns {Promise<Array>} A Promise that resolves to an array of network activity objects,
     *                          each containing requestId and request details for m3u8 URLs
     * @throws {Error} If navigation fails, page elements don't load, or network monitoring fails
     */
    static async searchNetworkActivity(url){
        const driver = await Scraper._buildDriver()
        try {
            await driver.get(url)
            await Scraper.waitOnElementLoad(driver, 'video')
            const requestsOnLanding = await Scraper.extractNetworkActivityRequests(driver)
            
            const networkActivity = []
            for(const Obj of requestsOnLanding){
                const transactionData = JSON.parse(Obj.message)
                const { message: { params: { request, requestId }}} = transactionData
            
                if(pathIncludesM3u8(request.url)){
                    // Instrumentation: record when DevTools captured this request
                    networkActivity.push({ requestId, request });
                }
            }

            return networkActivity
        } catch(err){
            logger.error('An error occurred while extracting network landing requests!', err)
            throw err
        } finally {
            await driver.quit()
        }
    }

    /**
     * Extracts and filters network activity requests from the Selenium WebDriver's performance logs.
     * Specifically filters for outgoing requests tagged as Network.requestWillBeSent events.
     * 
     * @param {WebDriver} driver - An active Selenium WebDriver instance with performance logging enabled
     * @returns {Promise<Array>} A Promise that resolves to an array of filtered network log entries
     *                          containing only Network.requestWillBeSent events
     * @throws {Error} If unable to access performance logs or if the driver is not properly configured
     */
    static async extractNetworkActivityRequests(driver){
        const networkLogs = await driver.manage().logs().get("performance")
        const requests = networkLogs.filter((transaction) => {
            const transactionData = JSON.parse(transaction.message)
            return transactionData.message.method === 'Network.requestWillBeSent' ? true : false;
        })
        return requests
    }

    /**
     * Fetches a resource from the resource server based on the file type.
     * Supports specific handling for different file types (m3u8, ts). Validates
     * file extensions against accepted types and will fail if the type is not accepted.
     * 
     * @param {string} resourceName - The name of the resource file to fetch (including extension)
     * @returns {Promise<string>} A Promise that resolves to either:
     *                           - The content of the resource (for m3u8 files)
     *                           - The file path of the downloaded resource (for ts files)
     * @throws {TypeError} If the resource file type is not accepted 
     * @throws {Error} If resource fetching fails or server is unreachable
     */
    static async fetchFromResourceServer(resourceName){
        const resourceFileExtension = resourceName.split('.').toReversed()[0]
        if(!config.resources.acceptFileTypes.includes(resourceFileExtension) && !config.resources.acceptmediaType.includes(resourceFileExtension)){
            throw new TypeError('Cannot fetch resource: file type not accepted')
        }

        const url = config.urls.resourceServerUrl + resourceName
        try {
            switch(resourceFileExtension){
                case 'm3u8': var resource = await Scraper.artlist_fetchMediaPlaylist(url)
                    break;

                case 'ts': var resource = await Scraper.artlist_fetchMedia(url, resourceName)
                    break
            }
            return resource
        } catch(err){
            logger.error('An error occurred while fetching resource from resource server!', err)
            throw err
        }
    }

    /**
     * Fetches and processes an m3u8 media playlist from a given URL.
     * Downloads the playlist using data stream and converts it to UTF-8 encoded text.
     * Uses chunked data handling for efficient memory usage with large playlists.
     * 
     * @param {string} url - The complete URL of the m3u8 media playlist to fetch
     * @returns {Promise<string>} A Promise that resolves to the UTF-8 encoded content
     *                           of the m3u8 playlist as a string
     * @throws {Error} If the stream fails, network is unreachable, or data is corrupt
     */
    static async artlist_fetchMediaPlaylist(url){
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
    /**
     * Fetches and saves a media file (ts) from the resource server locally to temp folder.
     * Handles the download process as a stream for efficient memory usage and logs
     * progress.
     * 
     * @param {string} url - The complete URL of the media file to download
     * @param {string} resourceName - The original name of the resource file (used for naming)
     * @returns {Promise<string>} A Promise that resolves to the absolute path of the saved media file
     * @throws {Error} If the download fails, stream errors occur, or writing to disk fails
     * @emits {event} 'data' - Emitted when receiving chunks of data, triggers download progress logging
     * @emits {event} 'end' - Emitted when download is complete
     */
    static async artlist_fetchMedia(url, resourceName){
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
}

module.exports = Scraper
