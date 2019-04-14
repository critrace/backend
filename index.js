const mongoose = require('mongoose')
mongoose.set('useCreateIndex', true)
require('./models/entry')
require('./models/event')
require('./models/race')
require('./models/rider')
require('./models/promoter')
require('./models/bib')
require('./models/series')
require('./models/seriesPromoter')
require('./models/passing')
const express = require('express')
const _async = require('async-express')
const app = express()

app.use(express.json())
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, DELETE, PUT')
  res.set('Access-Control-Allow-Headers', 'content-type')
  next()
})

if (process.env.NODE_ENV === 'test') {
  process.env.WEB_TOKEN_SECRET = 'secret'
  process.env.DB_URI = 'mongodb://127.0.0.1:27017/test'
}

const mongoConnect = _async(async (req, res, next) => {
  await mongoose.connect(process.env.DB_URI, {
    connectTimeoutMS: 5000,
    useNewUrlParser: true,
  })
  next()
})

const mongoDisconnect = _async(async (req, res, next) => {
  await mongoose.disconnect()
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
require('./routes/passing')(app)

if (process.env.NODE_ENV !== 'test') {
  app.use(mongoDisconnect)
}

module.exports = app
