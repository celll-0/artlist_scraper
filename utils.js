const config = require('./config.js')


const validResourceURL = (url, { acceptType }) => {
    const acceptResourceTypeList = Object.keys(config.resources.acceptResourceTypePaths)
    console.log(acceptResourceTypeList)
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

module.exports = { validResourceURL }