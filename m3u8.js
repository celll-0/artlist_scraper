const M3U8_SIGNITURE = '#EXTM3U'

// M3u8 directives that classify the desired information
const DIRECTIVES = {
    VERSION: 'EXT-X-VERSION',
    STREAM_INFO: 'EXT-X-STREAM-INF',
    MEDIA_SEQUENCE: 'EXT-X-MEDIA-SEQUENCE',
    DURATION: 'EXT-X-TARGETDURATION',
    PLAYLIST_TYPE: 'EXT-X-PLAYLIST-TYPE',
    ENDLIST: 'EXT-X-ENDLIST'
}

const DIRECTIVE_PARAMS = {
    resolution: 'RESOLUTION',
    bandwidth: 'BANDWIDTH'
}

const IsDirectiveLine = (line) => IsDirectiveLine(line)

class M3u8Parser {

    parse(m3u8){
        if(!m3u8.include(M3U8_SIGNITURE)){
            throw new TypeError('Invalid m3u8! File is not a valid m3u8 file or does not have the correct signiture.')
        }

        try {

        } catch(err){
            console.log('An error occurred while parsing the m3u8')
            throw err
        }
    }

    static playlists(m3u8){
        if(typeof m3u8 !== 'string'){
            throw new TypeError(`M3u8 must be a string. Given type '${typeof m3u8}'.`)
        }

        if(!m3u8.includes('.m3u8')){
            throw new TypeError('File provided must be the m3u8 Playlist')
        }

        var lines = m3u8.split('\n').filter(x => x)
        console.log(typeof lines)
        const directives = this._getDirectives(lines)

        for(i=0; i < lines.length; i++){
            if(IsDirectiveLine(lines[i])){
                var playlists = this._bagAndTagResourcePaths({idx: i, lines, directives})
            }
        }
        return playlists
    }

    static _bagAndTagResourcePaths({idx, lines, directives}){
        const directiveName = _directiveOf(lines[idx])
        switch(directiveName){
            case DIRECTIVES.STREAM_INFO:
                const playlists = {}
                const match = directives.find((directive) => directive.line === lines[idx])

                if(match){
                    const resourcePath = lines[idx+1]
                    if(resourcePath.includes('.m3u8')){
                        playlists[match.value[DIRECTIVES.resolution.height]] = resourcePath
                    } else if(IsDirectiveLine(resourcePath)){
                        throw new Error(`Missing Resource Path: m3u8 file is missing a resource path, ${DIRECTIVES.STREAM_INFO} tag must be followed by a resource.`)
                    } else {
                        throw new Error('Invalid M3u8: m3u8 file may be formatted incorrectly.')
                    }
                }
                break

            case DIRECTIVES.VERSION:
                // For uses cases concerning the HLS protocol and new
                // features, e.g. floating point durations for playback.
                break
        }

        return expectPlaylists
    }

    /**
     * Extracts all directive lines within a m3u8 string.
     * 
     * @param   {String}  m3u8  The contents of the m3u8as as string.
     * @returns {Array}         An Array of directives.
     */
    static _getDirectives(lines){
        if(typeof m3u8 !== 'array'){
            throw new TypeError(`Expected an Array type input. Given type '${typeof m3u8}'.`)
        }
        
        lines = lines.filter(line => IsDirectiveLine(line) && !M3U8_SIGNITURE)
        const directives = []
        for(const line in lines){
            const directive = this._directiveOf(line)
            const value = directive === DIRECTIVES.STREAM_INFO ? this._getParams(line, DIRECTIVES.STREAM_INFO) : this._valueOf(line);
            directives.push({directive, value, line})
        }
        return directives
    }

    /**
     * Indicates the directive of the given m3u8 line.
     * 
     * @param    {String}  line  A m3u8 line contain a single directive.
     * @returns  {String}        The directive name
     */
    static _directiveOf(line){
        if(typeof line !== 'string'){
            throw new TypeError(`Expected a String type input. Give type '${typeof line}'.`)
        }

        if(!IsDirectiveLine(line)){
            throw new TypeError('Not a valid m3u8 directive line.')
        }

        const directiveEnd = line.indexOf(':')
        const directive = line.substring(1, directiveEnd)
        return directive
    }

    /**
     * Extracts the directive parameters from a m3u8 directive value if there are any.
     * If no parameters are found the return value with be empty. Use the optional parameter
     * to specify the expected directive for verification reasons.
     * 
     * @param    {String}  line       A string containing a single directive-value pair.
     * @param    {String}  directive  (Optional) Specified directive the function should expect.
     * @returns  {Object || None}     An object with The key-value parameters.
     */
    static _getParams(line, directive = undefined){
        if(typeof line !== 'string'){
            throw new TypeError(`Expected a String type input. Give type '${typeof line}'.`)
        }
        else if(!IsDirectiveLine(line)){
            throw new TypeError('Not a valid m3u8 directive line.')
        }
        else if(directive && !line.includes(DIRECTIVES.STREAM_INFO)){
            throw new Error('Unexpected directive! Directive does not match line.')
        }

        if(!line.includes('=')) return;

        if(directive === DIRECTIVES.STREAM_INFO){
            const kv = this._valueOf(line).split(',').map((kvString) => kvString.split('='))
            const params = Object.fromEntries(new Map(kv))
            
            if(params[DIRECTIVE_PARAMS.resolution]){
                const res = params[DIRECTIVE_PARAMS.resolution].split('x')
                params[DIRECTIVE_PARAMS.resolution] = {height: res[1], width: res[0]}
            }
            return params
        }
    }

    /**
     * Returns the value of the directive in the given line as a string.
     * 
     * @param    {String}  line  A m3u8 string containing a single directive-value pair.
     * @returns  {String}        The directive value
     */
    static _valueOf(line){
        if(typeof line !== 'string'){
            throw new TypeError(`Expected a String type input. Give type '${typeof line}'.`)
        }

        if(!IsDirectiveLine(line)){
            throw new TypeError('Not a valid m3u8 directive line.')
        }

        const valuestart = line.indexOf(':')
        const value = line.substring(valuestart+1, line.length)
        return value
    }
}

const file = `
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=400000,RESOLUTION=426x240
97703_240p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360
97703_360p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=842x480
97703_480p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720
97703_720p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080
97703_1080p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=10000000,RESOLUTION=3840x2160
97703_2160p.m3u8`

console.log(M3u8Parser.playlists(file, DIRECTIVES.STREAM_INFO))

module.exports = { M3u8Parser }