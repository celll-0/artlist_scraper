const { getNetResourceActivity } = require("../scraper.js")

const resourceController = async (req, res) => {
    const resource = req.body.resource

    const url = `https://${resource}`
    try {
        if(validResourceURL(url)){
            var resourceNetworkActivity = await getNetResourceActivity(url)
        } else {
            res.status(400).json({ error: { msg: "Invalid resource URL", err: new TypeError("Invalid ")}})
        }

        res.json(resourceNetworkActivity)
    } catch(err){
        console.error(err)
        res.status(500).json({ error: { msg: "An error occurred on the server", err: err } })
    }
}

const validResourceURL = (url) => {
    const acceptedResourcePaths = ["stock-footage/clip", "pixelscan", "httpbin"]

    for(i=0; i < acceptedResourcePaths.length; i++){
        const match = url.includes(acceptedResourcePaths[i])
        if(match){
            return url
        }
    }

    return false
}

module.exports = { resourceController }