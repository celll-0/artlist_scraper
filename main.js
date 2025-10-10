require('dotenv').config()
const express = require('express')
const { trace_url_writes } = require('./src/lib/utils/logging.js')
const footageResourceController = require('./src/controllers/footage.resource.controller.js')

// Optional runtime tracer.
// Usage: set TRACE_URL_WRITES=true.
if (process.env.TRACE_URL_WRITES) trace_url_writes();

const app = express()
const port = 8000

app.use(express.json())

app.post('/footage', footageResourceController)

app.get('/', async (req, res) => {
    res.send('Welcome to the Artlist Scraper API!')
})

app.listen(port, () => console.log(`App is listening on port ${port}!`))