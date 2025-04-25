const { getNetResourceActivity } = require("../scraper.js")

const resourceController = async (req, res) => {
    const url = req.body.resource

    try {
        if(validResourceURL(url)){
            var result = await getNetResourceActivity(url)
        } else {
            res.status(400).json({ error: { msg: "Invalid resource URL", err: new TypeError("Invalid ")}})
        }

        res.json(result)
    } catch(err){
        console.error(err)
        res.status(500).json({ error: { msg: "An error occurred on the server", err: err } })
    }
}

const validResourceURL = (url) => {
    const acceptedResourcePaths = ["stock-footage/clip", "pixelscan", "httpbin", "johnpyeauctions"]
    const acceptProtocols = ['https://']

    for(i=0; i < acceptedResourcePaths.length; i++){
        const match = url.includes(acceptedResourcePaths[i])
        const validProtocol = url.includes(acceptProtocols[0])
        if(match){
            if(url.startsWith("www")){
                console.warn("Protocol speciification is missing from resource URL! Protocol defaults to 'https'.")
            } else if(!validProtocol){
                throw new TypeError("Invalid protocol! Protocol must be 'https'.")
            }

            return url
        }
    }

    return false
}

module.exports = { resourceController }