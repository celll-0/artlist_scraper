require('dotenv').config()
const express = require('express')
const https = require('https')
const axios = require('axios');

// Optional runtime tracer: when TRACE_URL_WRITES=1, wrap stdout/stderr writes
// and print a stack trace whenever an output contains the resource host.
if (process.env.TRACE_URL_WRITES) {
    const hostMarker = 'cms-public-artifacts.artlist.io'
    const origStdoutWrite = process.stdout.write.bind(process.stdout)
    const origStderrWrite = process.stderr.write.bind(process.stderr)

    function makeWrapper(orig, label) {
        return function (chunk, encoding, cb) {
            try {
                const str = typeof chunk === 'string' ? chunk : chunk.toString(encoding || 'utf8')
                if (str && str.includes(hostMarker)) {
                    // Print a clear marker and stack trace using original write to avoid recursion
                    orig(`\n[TRACE-${label}] ${new Date().toISOString()} detected host marker in output:\n`)
                    orig(new Error().stack + '\n')
                }
            } catch (e) {
                // swallow errors from tracer
            }
            return orig(chunk, encoding, cb)
        }
    }

    process.stdout.write = makeWrapper(origStdoutWrite, 'STDOUT')
    process.stderr.write = makeWrapper(origStderrWrite, ' STDERR')
}


const footageResourceController = require('./src/controllers/footage.resource.controller.js')

const app = express()
const port = 8000

app.use(express.json())

app.post('/footage', footageResourceController)

app.get('/', async (req, res) => {
    res.send('Welcome to the Artlist Scraper API!')
})

app.listen(port, () => console.log(`App is listening on port ${port}!`))