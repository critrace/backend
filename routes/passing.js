const mongoose = require('mongoose')
const Passing = mongoose.model('Passing')
const Event = mongoose.model('Event')
const Rider = mongoose.model('Rider')
const SeriesPromoter = mongoose.model('SeriesPromoter')
const asyncExpress = require('async-express')
const auth = require('../middleware/auth')
const moment = require('moment')

module.exports = (app) => {
  app.get('/passings', load)
  app.post('/passings', auth, create)
  app.delete('/passings', auth, _delete)
  app.post('/passings/import', auth, massImport)
}

const massImport = asyncExpress(async (req, res) => {
  const { passings } = req.body
  const passes = passings.split('\n').map((passing) => {
    const [_, transponder, _date, time] = passing.split(';')
    const date = moment(`${_date};${time}`, 'YYYY-MM-DDHH:mm:ss:SSS').toDate()
    return { transponder, date, eventId: req.body.eventId }
  })
  const event = await Event.findOne({
    _id: mongoose.Types.ObjectId(req.body.eventId),
  }).exec()
  const promises = passes.map((pass) =>
    Passing.findOne({
      eventId: mongoose.Types.ObjectId(pass.eventId),
      date: pass.date,
      transponder: pass.transponder,
    })
      .exec()
      .then((existing) => {
        if (existing) return
        return Rider.findOne({
          transponder: pass.transponder,
        })
          .exec()
          .then((rider) => (rider ? { riderId: rider._id } : {}))
          .then((rider) =>
            Passing.create({
              ...rider,
              seriesId: event.seriesId,
              ...pass,
            })
          )
      })
  )
  await Promise.all(promises)
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
