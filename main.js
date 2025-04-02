require('dotenv').config()
const express = require('express')

const { resourceController } = require('./controllers/resourceController.js')

const app = express()
const port = 8000

app.use(express.json())

app.post('/', resourceController)

app.listen(port, ()=> console.log(`App is listening on port ${port}!`))