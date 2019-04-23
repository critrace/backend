const mongoose = require('mongoose')
const Passing = mongoose.model('Passing')
const Event = mongoose.model('Event')
const Rider = mongoose.model('Rider')
const SeriesPromoter = mongoose.model('SeriesPromoter')
const _async = require('async-express')
const auth = require('../middleware/auth')

module.exports = (app) => {
  app.get('/passings', load)
  app.post('/passings', auth, create)
  app.delete('/passings', auth, _delete)
}

const create = _async(async (req, res) => {
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

const load = _async(async (req, res) => {
  const models = await Passing.find({
    eventId: mongoose.Types.ObjectId(req.query.eventId),
  })
    .populate('rider')
    .lean()
    .exec()
  res.json(models)
})

const _delete = _async(async (req, res) => {
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
