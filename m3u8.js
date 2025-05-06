const { logger } = require('./logger.js')
const config = require('./config.js')

const M3U8_IDENTIFIER = '#EXTM3U'

// Master Playlist directives
const MASTER_DIRECTIVES = {
    VERSION: 'EXT-X-VERSION',
    STREAM_INFO: 'EXT-X-STREAM-INF',
}

// Other Playlist directives
const DIRECTIVES = {
    // Sequence Directives
    ENDLIST: 'EXT-X-ENDLIST',
    SEQUENCE_NUMBER: 'EXT-X-MEDIA-SEQUENCE',
    SEQUENCE_DURATION: 'EXT-X-TARGETDURATION',
    PLAYLIST_TYPE: 'EXT-X-PLAYLIST-TYPE',

    // Segment Directives
    SEGMENT_DURATION: 'EXTINF',
    BYTERANGE: 'EXT-X-BYTERANGE',
    KEY: 'EXT-X-KEY',
    MAP: 'EXT-X-MAP',
    PROGRAM_DATE_TIME: 'EXT-X-PROGRAM-DATE-TIME',
    DATERANGE: 'EXT-X-DATERANGE',
}

// Attribute names for all playlist directives
const MASTER_DIRECTIVE_ATTRS = {
    resolution: 'RESOLUTION',
    bandwidth: 'BANDWIDTH'
}


const IsValidM3u8 = (m3u8) => m3u8.startsWith(M3U8_IDENTIFIER)
const IsM3u8Master = (m3u8) => IsValidM3u8(m3u8) && m3u8.includes(MASTER_DIRECTIVES.STREAM_INFO) && m3u8.includes('m3u8')
const IsM3u8Sequence = (m3u8) => IsValidM3u8(m3u8) && m3u8.includes(MASTER_DIRECTIVES.SEQUENCE_DURATION) && m3u8.includes(MASTER_DIRECTIVES.SEGMENT_DURATION)
const IsDirectiveLine = (line) => line.startsWith('#EXT')
const IsSequenceDirective = (dir) => dir === DIRECTIVES.SEQUENCE_DURATION || dir === DIRECTIVES.SEQUENCE_NUMBER || dir === DIRECTIVES.PLAYLIST_TYPE || dir === DIRECTIVES.ENDLIST


class M3u8Parser {

    static segments(m3u8){
        if(typeof m3u8 !== 'string'){
            throw new TypeError(`M3u8 must be a string. Given type '${typeof m3u8}'.`)
        }

        if(!IsM3u8Sequence){
            throw new TypeError('Not a valid m3u8 sequence playlist file')
        }

        const lines = m3u8.split('\n').filter(x => x).map(x => x.trim())

        try{
            const URIs = this._getURIs(lines, 'media')
            const sequence = { segments: [] }
            for(let i=0; i < URIs.length; i++){
                const idxOfURI = lines.indexOf(URIs[i])
                const segment = {}
                segment.uri = URIs[i]

                for(let j=idxOfURI-1; j >= 0; j--){
                    // Break if line is not a directive
                    if(!IsDirectiveLine(lines[j])) break;

                    // Break if line is either the M3u8 identifier or M3u8 version directive
                    if(lines[j].includes(M3U8_IDENTIFIER) || lines[j].includes(MASTER_DIRECTIVES.VERSION)) break;

                    const directive = this._directiveOf(lines[j])
                    const key = Object.entries(DIRECTIVES).find((dir) => dir[1] === directive)[0].toLowerCase()
                    
                    if(Object.values(DIRECTIVES).includes(directive)){
                        if(IsSequenceDirective(directive)){
                            sequence[key] = this._valueOf(lines[j])
                        } else {
                            segment[key] = this._valueOf(lines[j])
                        }
                    }
                }

                sequence.segments.push(segment)
            }
            // get all directive preceeding each URI until an inapplicable sequence directive is reached
            return sequence
        } catch(err){
            logger.error('M3u8Parser Error: Failed to parse m3u8 sequence file.', err)
            throw err
        }
    }

    static master(m3u8){
        if(typeof m3u8 !== 'string'){
            throw new TypeError(`M3u8 must be a string. Given type '${typeof m3u8}'.`)
        }

        if(!IsM3u8Master){
            throw new TypeError('Not a valid m3u8 master playlist file')
        }

        const lines = m3u8.split('\n').filter(x => x).map(x => x.trim())

        try{
            const directives = this._getDirectives(lines)
            const masterPlaylist = {}

            for(let i=0; i < lines.length; i++){
                if(IsDirectiveLine(lines[i])){
                    if(!lines[i].includes(M3U8_IDENTIFIER) && !lines[i].includes(MASTER_DIRECTIVES.VERSION)){
                        Object.assign(masterPlaylist, this._packURIs({lines, directives, idx: i, m3u8Type: 'master'}))
                    }
                }
            }
            return masterPlaylist
        } catch(err){
            logger.error('An error occurred while unpacking resource paths', err)
            throw err
        }
    }

    static _packURIs({idx, lines, directives, m3u8Type}){
        const URIs = {}

        switch(m3u8Type){
            case 'master':
                const match = directives.find((directive) => directive.line === lines[idx])
                if(match){
                    const resourcePath = lines[idx+1]
                    if(resourcePath.includes('.m3u8')){
                        URIs[match.value[MASTER_DIRECTIVE_ATTRS.resolution].height] = resourcePath
                    } else if(IsDirectiveLine(resourcePath)){
                        throw new Error(`Missing Resource Path: m3u8 file is missing a resource path, ${MASTER_DIRECTIVES.STREAM_INFO} tag must be followed by a resource.`)
                    } else {
                        throw new Error('Invalid M3u8: m3u8 file may be formatted incorrectly.')
                    }
                } else {
                    throw new Error(`Directive Mismatch: Unable to find line '${lines[idx]}'`)
                }
                break

            case 'sequence':
                
                break
        }
        return URIs
    }

    /**
     * Extracts all directive lines within a m3u8 string.
     * 
     * @param   {String}  m3u8  The contents of the m3u8as as string.
     * @returns {Array}         An Array of directives.
     */
    static _getDirectives(lines){
        if(!Array.isArray(lines)){
            throw new TypeError(`Expected an Array type input. Given type '${typeof lines}'.`)
        }

        try {
            lines = lines.filter(line => IsDirectiveLine(line) && !line.includes(M3U8_IDENTIFIER) && !line.includes(MASTER_DIRECTIVES.VERSION))
            const directives = []
            for(const line of lines){
                const directive = this._directiveOf(line)
                const value = directive === MASTER_DIRECTIVES.STREAM_INFO ? this._getParams(line, MASTER_DIRECTIVES.STREAM_INFO) : this._valueOf(line);
                directives.push({directive, value, line})
            }
            return directives
        } catch(err){
            logger.error('An error occured while parsing M3u8 directives', err)
            throw err
        }
    }

    static _getURIs(lines, type = null){
        if(!Array.isArray(lines)){
            throw new TypeError(`Expected an Array type input. Given type '${typeof lines}'.`)
        }

        try{
            const URIs = lines.filter((line) => {
                if(line.startsWith('#')) return false;
                
                const URIExtension = line.split('.').toReversed()[0]
                if(type && type === 'media'){
                    return config.resources.acceptmediaType.includes(URIExtension)
                } else if(!type){
                    return config.resources.acceptmediaType.includes(URIExtension) || config.resources.acceptFileTypes.includes(URIExtension) ? true : false;
                } 
            })

            return URIs
        } catch(err){
            logger.error("M3u8Parser Error: Failed to get the URI's from M3u8 file.", err)
            throw err
        }
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
        else if(directive && !line.includes(MASTER_DIRECTIVES.STREAM_INFO)){
            throw new Error('Unexpected directive! Directive does not match line.')
        }

        if(!line.includes('=')) return;

        if(directive === MASTER_DIRECTIVES.STREAM_INFO){
            const kv = this._valueOf(line).split(',').map((kvString) => kvString.split('='))
            const params = Object.fromEntries(new Map(kv))
            
            if(params[MASTER_DIRECTIVE_ATTRS.resolution]){
                const res = params[MASTER_DIRECTIVE_ATTRS.resolution].split('x')
                params[MASTER_DIRECTIVE_ATTRS.resolution] = {height: res[1], width: res[0]}
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
        let value = line.substring(valuestart+1, line.length)
        value = value.charAt(-1) === ',' ? value.replace(',', '') : value;
        return value
    }
}

module.exports = { M3u8Parser, MASTER_DIRECTIVES }