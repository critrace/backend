const mongoose = require('mongoose')
const Passing = mongoose.model('Passing')
const Race = mongoose.model('Race')
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
  const race = await Race.findOne({
    _id: mongoose.Types.ObjectId(req.body.raceId),
  })
    .lean()
    .exec()
  if (!race) {
    res.status(404).json({
      message: 'Unable to find supplied raceId',
    })
    return
  }
  const seriesPromoter = await SeriesPromoter.findOne({
    seriesId: mongoose.Types.ObjectId(race.seriesId),
    promoterId: mongoose.Types.ObjectId(req.promoter._id),
  })
    .lean()
    .exec()
  if (!seriesPromoter) {
    res.status(401).json({
      message: 'You are not a series promoter for this race',
    })
    return
  }
  const existingPassing = await Passing.findOne({
    raceId: mongoose.Types.ObjectId(req.body.raceId),
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
    seriesId: race.seriesId,
    ...req.body,
  }).catch(console.log)
  res.status(204).end()
})

const load = _async(async (req, res) => {
  const race = await Race.findOne({
    _id: mongoose.Types.ObjectId(req.query.raceId),
  })
    .lean()
    .exec()
  const models = await Passing.find({
    date: {
      $gte: race.actualStart || new Date(0),
    },
    raceId: mongoose.Types.ObjectId(req.query.raceId),
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
