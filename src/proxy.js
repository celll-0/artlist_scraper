const axios = require("axios")
const config = require('./config.js')

class SessionProxyManager {
    constructor({ mode = "direct", sessionDuration = 60000 }){
        this.apiUrl = config.urls.proxyServer
        this.inspectorUrl = config.urls.proxyInspector
        this.currentProxy = null
        this.lastAssignedTime = null
        this.isFresh = true
        this.proxyListSize = 10
        this.sessionDuration = sessionDuration
        this.proxyList = []

        if(!["direct", "backbone"].includes(mode)){
            throw new TypeError("Invalid proxy mode. Proxy mode must be either direct or backbone.")
        }

        this.connectionMode = mode
    }

    notifyFirstUse(){
        /**
         * Notify the session manager the of the current proxy's first use
         */
        this.isFreshProxy = false

    }

    async fetchProxyList(){
        /**
         * An asynchronous method that makes a request to
         * the Webshare proxy api for a list of proxies, and updates
         * the SessionProxyManager' proxyList directly. The
         * request contains a page parameter with a value of 1.
         * The page size and proxy mode can be changed via the
         * class properties.
         */
        try {
            console.log("Fetching proxy list...")
            const res = await axios({
                method: "GET",
                url: this.apiUrl,
                params: {
                    mode: this.connectionMode,
                    page: "1",
                    page_size: this.proxyListSize,
                },
                headers: {
                    Authorization: `Token ${process.env.PROXY_AUTH_TOKEN}`
                }
            })

            this.proxyList = await res.data.results

            for(const proxy in this.proxyList){
                const { id, proxy_address, port, country_code, valid,...otherProxyDetails } = proxy
                console.log({ id, proxy_address, port, country_code, valid })
            }
        } catch(err){
            console.error("An error occurred whie fetching proxy list!")
            throw err
        }
    }

    async sessionProxy(){
        /**
         * Returns the current session proxy. If thecurrent proxy
         * has expiried then one is picked at random from
         * the SessionProxyManager's ProxyList.
         * 
         * @return  {Object}  The current session proxy
         */
        if(this.proxyList.length === 0) await this.fetchProxyList();

        if(!this.currentProxy || (Date.now() - this.lastAssignedTime) > this.sessionDuration){
            const randomProxyListIndex = (0 + this.proxyList.length + Math.floor(Math.random() * 10)) % this.proxyList.length
            this.currentProxy = this.proxyList[randomProxyListIndex]
            this.lastAssignedTime = Date.now()
            this.isFresh = true
            console.log(`Session proxy obtained! Activate session proxy id => ${ this.currentProxy.id }`)
        }
        return this.currentProxy
    }

    async inspectProxy({ password, username, proxy_address, port }){
        const proxyCheckerURL = this.inspectorUrl
        try {
            const res = await axios({
                method: "POST",
                url: proxyCheckerURL,
                proxy: {
                    host: proxy_address,
                    port: port,
                    protocol: "http",
                    auth: {
                        password: password,
                        username: username
                    }
                },
                data: {
                    defaultIceServer: {
                        sdp: "",
                        localIPv4: [],
                        externalIPv4: [ proxy_address ],
                        localIPv6: [],
                        externalIPv6: []
                    }
                }
            })
    
            const proxyDetails = await res.data
            return proxyDetails
        } catch(err){
            console.log("An error occured while fetching the proxy details.")
            throw err
        }
    }
}

module.exports = { SessionProxyManager }