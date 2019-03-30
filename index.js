const mongoose = require('mongoose')
require('./models/entry')
require('./models/event')
require('./models/race')
require('./models/rider')
require('./models/promoter')
require('./models/bib')
require('./models/series')
const express = require('express')
const _async = require('async-express')
const app = express()

app.use(express.json())
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*')
  next()
})

const mongoConnect = _async(async (req, res, next) => {
  res.on('finish', () => {
    mongoose.connection.close()
  })
  await mongoose.connect(process.env.DB_URI, {
    connectTimeoutMS: 5000,
    useNewUrlParser: true,
  })
  next()
})

/**
 * Establish a connection to the mongo database, then continue the request
 **/
app.use(mongoConnect)

require('./routes/event')(app)
require('./routes/promoter')(app)
require('./routes/race')(app)
require('./routes/rider')(app)
require('./routes/series')(app)
require('./routes/bib')(app)

module.exports = app
