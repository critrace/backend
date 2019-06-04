const mongoose = require('mongoose')
const Passing = mongoose.model('Passing')
const Event = mongoose.model('Event')
const Rider = mongoose.model('Rider')
const SeriesPromoter = mongoose.model('SeriesPromoter')
const asyncExpress = require('async-express')
const auth = require('../middleware/auth')
const multer = require('multer')
const upload = multer({
  storage: multer.memoryStorage(),
})
const csvParse = require('csv-parse')
const moment = require('moment')
const _ = require('lodash')

module.exports = (app) => {
  app.get('/passings', load)
  app.post('/passings', auth, create)
  app.delete('/passings', auth, _delete)
  app.post('/passings/import', auth, upload.single('csv'), importPassings)
}

const importPassings = asyncExpress(async (req, res) => {
  const passingsCSV = req.file.buffer.toString('utf8')
  const data = await new Promise((rs, rj) => {
    csvParse(
      passingsCSV,
      {
        skip_empty_lines: true,
        delimiter: ';',
      },
      (err, output) => {
        if (err) return rj(err)
        rs(output)
      }
    )
  })
  const event = await Event.findOne({
    _id: mongoose.Types.ObjectId(req.body.eventId),
  }).exec()
  const promoter = await SeriesPromoter.findOne({
    promoterId: mongoose.Types.ObjectId(req.promoter._id),
    seriesId: event.seriesId,
  })
    .lean()
    .exec()
  if (!promoter) {
    res.status(401)
    res.json({ message: 'Not authorized to upload passings for event' })
    return
  }
  const passings = _.map(data, (values) => ({
    transponder: values[1],
    date: moment(
      `${values[2]};${values[3]}`,
      'YYYY-MM-DD;HH:mm:ss:SSS'
    ).toDate(),
    eventId: req.body.eventId,
  }))
  const loadedPassings = await Passing.find({
    eventId: mongoose.Types.ObjectId(req.body.eventId),
    transponder: {
      $in: _.map(passings, 'transponder'),
    },
  })
    .lean()
    .exec()
  const passingsByTransponderDate = _.chain(loadedPassings)
    .groupBy('transponder')
    .mapValues((_passings) =>
      _.keyBy(_passings, (passing) => passing.date.toString())
    )
    .value()
  for (const passing of passings) {
    if (
      passingsByTransponderDate[passing.transponder][passing.date.toString()]
    ) {
      continue
    }
    const rider = await Rider.findOne({
      transponder: passing.transponder,
    })
      .lean()
      .exec()
    console.log('creating')
    await Passing.create({
      riderId: rider ? rider._id : undefined,
      seriesId: event.seriesId,
      ...passing,
    })
  }
  res.status(204).end()
})

const create = asyncExpress(async (req, res) => {
  const event = await Event.findOne({
    _id: mongoose.Types.ObjectId(req.body.eventId),
  })
    .lean()
    .exec()
  if (!event) {
    res.status(404).json({
      message: 'Unable to find supplied raceId',
    })
    return
  }
  const seriesPromoter = await SeriesPromoter.findOne({
    seriesId: mongoose.Types.ObjectId(event.seriesId),
    promoterId: mongoose.Types.ObjectId(req.promoter._id),
  })
    .lean()
    .exec()
  if (!seriesPromoter) {
    res.status(401).json({
      message: 'You are not a series promoter for this event',
    })
    return
  }
  const existingPassing = await Passing.findOne({
    eventId: mongoose.Types.ObjectId(req.body.eventId),
    date: req.body.date,
    transponder: req.body.transponder,
  }).exec()
  if (existingPassing) {
    res.status(204).end()
    return
  }
  const rider = await Rider.findOne({
    transponder: req.body.transponder,
  })
    .lean()
    .exec()
  const riderId = rider ? { riderId: rider._id } : {}
  await Passing.create({
    ...riderId,
    seriesId: event.seriesId,
    ...req.body,
  })
  res.status(204).end()
})

const load = asyncExpress(async (req, res) => {
  const models = await Passing.find({
    eventId: mongoose.Types.ObjectId(req.query.eventId),
  })
    .limit(250)
    .populate('rider')
    .lean()
    .exec()
  res.json(models)
})

const _delete = asyncExpress(async (req, res) => {
  const passing = await Passing.findOne({
    _id: mongoose.Types.ObjectId(req.body._id),
  }).exec()
  if (!passing) {
    res.status(404).json({
      message: `Couldn't find passing with _id ${req.body._id}`,
    })
    return
  }
  const seriesPromoter = await SeriesPromoter.findOne({
    seriesId: passing.seriesId,
    promoterId: req.promoter._id,
  })
  if (!seriesPromoter) {
    res.status(401).json({
      message: `You're not a series promoter for this race`,
    })
    return
  }
  await Passing.deleteOne({
    _id: mongoose.Types.ObjectId(req.body._id),
  }).exec()
  res.status(204).end()
})
