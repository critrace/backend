import express from 'express'
import mongoose from 'mongoose'
const app = express()

// Load models into memory
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

// Setup global express middleware (json parsing and cors)
app.use(express.json())
app.use((_, res, next) => {
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, DELETE, PUT')
  res.set('Access-Control-Allow-Headers', 'content-type')
  next()
})

if (process.env.NODE_ENV === 'test') {
  process.env.WEB_TOKEN_SECRET = 'secret'
  process.env.DB_URI = 'mongodb://127.0.0.1:27017/test'
}
const mongoConnect: express.RequestHandler = async (_1, _2, next: any) => {
  await mongoose.connect(process.env.DB_URI, {
    connectTimeoutMS: 5000,
    useNewUrlParser: true,
  })
  next()
}

const mongoDisconnect: express.RequestHandler = async (_1, _2, next) => {
  await mongoose.disconnect()
  next()
}

/**
 * Establish a connection to the mongo database, then continue the request
 **/
app.use(mongoConnect)

// Load the routes on the express router
require('./routes/event').default(app)
require('./routes/promoter').default(app)
require('./routes/race').default(app)
require('./routes/rider').default(app)
require('./routes/series').default(app)
require('./routes/bib').default(app)
require('./routes/passing').default(app)
require('./routes/leaderboard').default(app)

if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'development') {
  app.use(mongoDisconnect)
}

export default app
