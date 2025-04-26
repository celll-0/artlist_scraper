const { Builder, until, By } = require('selenium-webdriver')
const chrome = require('selenium-webdriver/chrome')
const path = require('node:path')
const { SessionProxyManager } = require("./proxy.js");


const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 14; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/122.0.0.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/122.0.0.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/122.0.0.0 Mobile/15E148 Safari/604.1"
]


const getNetResourceActivity = async (url) => {
    const driver = buildDriver()
    const videoElemSelector = 'video'

    try {
        await driver.get(url)

        console.log("Awaiting video Element load...")
        await driver.wait(until.elementLocated(By.css(videoElemSelector)), 6000)
        console.log("Video Element loaded!")

        const networkData = await driver.manage().logs().get("performance")
        const sentRequests = networkData.filter((transaction) => {
            const transactionData = JSON.parse(transaction.message)
            return transactionData.message.method === 'Network.requestWillBeSent' ? true : false;
        })
        
        const networkActivity = []
        for(const Obj of sentRequests){
            const transactionData = JSON.parse(Obj.message)
            const { message: { params: { request, requestId }}} = transactionData
            if(request.url.includes('.m3u8')){
                networkActivity.push({ requestId, request })
            }
        }

        return { networkActivity }
    } catch(err){
        console.error('An error occurred while scraping the site')
        throw err
    } finally {
        await driver.quit()
    }
}


const buildDriver = async () => {
    const sessionProxyManager = new SessionProxyManager({ mode: "direct", sessionDuration: 60000})
    const proxy = await sessionProxyManager.sessionProxy()
 
    const chromeDriverPath = path.resolve(__dirname, 'undetected_chromedriver.exe');
    const chromeExePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

    const chromeOptions = new chrome.Options();
    chromeOptions.setChromeBinaryPath(chromeExePath)
    chromeOptions.setLoggingPrefs({'performance': "ALL"})
    chromeOptions.setPerfLoggingPrefs({enableNetwork: true})

    console.log(chromeOptions.map_)
    console.log()

    const driver = new Builder()
        .forBrowser('chrome')
        .setChromeOptions(chromeOptions)
        // .setProxy(seleniumProxy.manual({https: `${proxy.proxy_address}:${proxy.port}>`}))
        // .setChromeOptions(chromeOptions.addArguments("--headless=new"))
        .setChromeService(new chrome.ServiceBuilder(chromeDriverPath))
        .build();

    return driver
}


module.exports = { getNetResourceActivity }