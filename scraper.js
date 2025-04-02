const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')
const axios = require('axios')

const { SessionProxyManager } = require("./proxy.js")

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
    const activity = []

    const sessionProxyManager = new SessionProxyManager({ mode: "direct", sessionDuration: 60000})
    const proxy = await sessionProxyManager.sessionProxy()
 
    const browserConfig = {
        deviceScaleFactor: 1,
        userAgent: userAgents[(0 + userAgents.length + Math.random()) % userAgents.length],
        viewport: { width: 1920, height: 1080 },
        headless: true,
        timeout: 40000,
    }

    chromium.use(stealth)
    const browser = await chromium.launch(browserConfig)
    const context = await browser.newContext()
    const page = await context.newPage()

    // const resourceId = url.split("/").at(-1)

    try {
        const proxyDetails = await sessionProxyManager.inspectProxy(proxy)
    //     page.on('response', response => {
    //         if(response.url().includes(resourceId)){
    //             activity.push(
    //                 {
    //                     request: {
    //                         method: response.request().method(),
    //                         url: response.request().url()
    //                     },
    //                     response: {
    //                         status: response.status(),
    //                         url: response.url(),
    //                     }
    //                 }
    //             )
    //         }
    //     })
        // await page.goto(url, {waitUntil: "networkidle"})

        // // await page.evaluate(() => window.scrollBy(0, window.innerHeight));
        // // await page.mouse.move(Math.random()*100, Math.random()*120)
        // await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 4000 + 3000)));
        
        // await page.screenshot({path: "bfingerprints.png", fullPage: true})


        // return { activity }
        return { proxy, proxyDetails }
    } catch(err){
        console.error('An error occurred while scraping the site')
        throw err
    } finally {
        await browser.close()
    }
}

module.exports = { getNetResourceActivity }