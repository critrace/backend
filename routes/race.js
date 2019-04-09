const mongoose = require('mongoose')
const Race = mongoose.model('Race')
const Event = mongoose.model('Event')
const Entry = mongoose.model('Entry')
const Bib = mongoose.model('Bib')
const SeriesPromoter = mongoose.model('SeriesPromoter')
const Passing = mongoose.model('Passing')
const Rider = mongoose.model('Rider')
const _async = require('async-express')
const auth = require('../middleware/auth')
const { isSeriesPromoter } = require('./series')
const groupby = require('lodash.groupby')

module.exports = (app) => {
  app.get('/races', auth.notRequired, getRaces)
  app.post('/races', auth, create)
  app.post('/races/start', auth, start)
  app.post('/races/entry', auth, createEntry)
  app.get('/races/entries', getEntries)
  app.delete('/races/entries', auth, removeEntry)
  app.delete('/races', auth, _delete)
  app.get('/races/leaderboard', leaderboard)
}

const leaderboard = _async(async (req, res) => {
  const race = await Race.findOne({
    _id: mongoose.Types.ObjectId(req.query.raceId),
  }).exec()
  const passings = await Passing.find({
    raceId: race._id,
    date: {
      $gte: race.actualStart || new Date(0),
    },
  })
    .lean()
    .exec()
  const passingsByTransponder = groupby(passings, 'transponder')
  const results = Object.keys(passingsByTransponder)
    .map((transponder) => {
      const passes = passingsByTransponder[transponder].sort((p1, p2) => {
        if (p1.date > p2.date) return 1
        return -1
      })
      const passCount = passes.length
      const passIndex = Math.min(
        passes.length - 1,
        race.lapCount - 1 || Number.MAX_VALUE
      )
      return {
        ...passes[passIndex],
        lapCount: Math.min(passCount, race.lapCount || Number.MAX_VALUE),
      }
    })
    .sort((p1, p2) => {
      if (p1.lapCount < p2.lapCount) {
        return 1
      } else if (p1.lapCount > p2.lapCount) {
        return -1
      } else if (p1.date > p2.date) {
        return 1
      } else if (p1.date < p2.date) {
        return -1
      }
      return 0
    })
  // Retroactively load associated transponders if not mapped to riderId
  const loadedRiderIdResults = await Promise.all(
    results.map((pass) => {
      if (pass.riderId) return Promise.resolve(pass)
      return Rider.findOne({
        transponder: pass.transponder,
      })
        .lean()
        .exec()
        .then((rider) => (rider ? { ...pass, riderId: rider._id } : pass))
    })
  )
  res.json(loadedRiderIdResults)
})

const create = _async(async (req, res) => {
  const event = await Event.findOne({
    _id: mongoose.Types.ObjectId(req.body.eventId),
  })
    .lean()
    .exec()
  if (!event) {
    res.status(404).json({
      message: 'Supplied eventId does not exist',
    })
    return
  }
  const created = await Race.create({ ...req.body, seriesId: event.seriesId })
  res.json(created)
})

const _delete = _async(async (req, res) => {
  const race = await Race.findOne({
    _id: mongoose.Types.ObjectId(req.body._id),
  })
    .populate('event')
    .lean()
    .exec()
  if (!race) {
    res.status(404).json({
      message: "Couldn't find specified race id",
    })
    return
  }
  if (!(await isSeriesPromoter(race.seriesId, req.promoter._id))) {
    res.status(401).json({
      message: "You can only delete a race if you're the promoter",
    })
    return
  }
  await Race.deleteOne({
    _id: mongoose.Types.ObjectId(req.body._id),
  }).exec()
  await Entry.deleteMany({
    raceId: mongoose.Types.ObjectId(req.body._id),
  }).exec()
  res.status(204).end()
})

const start = _async(async (req, res) => {
  const race = await Race.findOne({
    _id: mongoose.Types.ObjectId(req.body._id),
  }).exec()
  const seriesPromoter = await SeriesPromoter.findOne({
    seriesId: race.seriesId,
    promoterId: mongoose.Types.ObjectId(req.promoter._id),
  }).exec()
  if (!seriesPromoter) {
    res.status(401).json({
      message: 'You are not authorized to start this race',
    })
    return
  }
  if (race.actualStart) {
    res.status(400).json({
      message: 'This race already has an actualStart',
    })
    return
  }
  await Race.updateOne(
    {
      _id: mongoose.Types.ObjectId(req.body._id),
    },
    {
      actualStart: req.body.actualStart,
    }
  )
  res.status(204).end()
})

const getEntries = _async(async (req, res) => {
  const entries = await Entry.find({
    raceId: mongoose.Types.ObjectId(req.query._id),
  })
    .populate('rider')
    .populate('race')
    .populate('bib')
    .lean()
    .exec()
  res.json(entries)
})

const getRaces = _async(async (req, res) => {
  if (req.query.eventId) {
    const races = await Race.find({
      eventId: mongoose.Types.ObjectId(req.query.eventId),
    })
      .populate('entries')
      .lean()
      .exec()
    res.json(races)
  } else if (req.query._id) {
    const race = await Race.findOne({
      _id: mongoose.Types.ObjectId(req.query._id),
    })
      .populate('entries')
      .lean()
      .exec()
    res.json(race)
  } else {
    const promoterId = req.promoter._id
    const series = await SeriesPromoter.find(
      promoterId
        ? {
            promoterId: mongoose.Types.ObjectId(req.promoter._id),
          }
        : {}
    ).exec()
    const races = await Race.find({
      $or: series.map((seriesPromoter) => ({
        seriesId: seriesPromoter.seriesId,
      })),
    })
      .populate('event')
      .populate('series')
      .lean()
      .exec()
    // Sort the races by event startDate descending
    res.json(races.sort((r1, r2) => r1.event.startDate < r2.event.startDate))
  }
})

const createEntry = _async(async (req, res) => {
  const race = await Race.findOne({
    _id: mongoose.Types.ObjectId(req.body.raceId),
  })
    .populate('event')
    .lean()
    .exec()
  if (!(await isSeriesPromoter(race.seriesId, req.promoter._id))) {
    res.status(401).json({
      message: 'You are not authorized to add entries.',
    })
    return
  }
  const existing = await Entry.findOne({
    riderId: mongoose.Types.ObjectId(req.body.riderId),
    raceId: mongoose.Types.ObjectId(req.body.raceId),
  })
    .lean()
    .exec()
  if (existing) {
    res.status(400).json({
      message: 'This rider is already registered for this race.',
    })
    return
  }
  const existingBib = await Bib.findOne({
    _id: mongoose.Types.ObjectId(req.body.bibId),
    seriesId: mongoose.Types.ObjectId(race.event.seriesId),
  })
    .lean()
    .exec()
  if (existingBib && existingBib.riderId.toString() !== req.body.riderId) {
    res.status(401).json({
      message: 'This bib number is already in use',
    })
    return
  } else if (!existingBib) {
    res.status(400).json({
      message: 'Invalid bibId supplied',
    })
    return
  }
  const created = await Entry.create({
    ...req.body,
    eventId: race.eventId,
    seriesId: race.seriesId,
  })
  res.json(created)
})

const removeEntry = _async(async (req, res) => {
  const race = await Race.findOne({
    _id: mongoose.Types.ObjectId(req.body.raceId),
  })
    .populate('event')
    .lean()
    .exec()
  if (!(await isSeriesPromoter(race.seriesId, req.promoter._id))) {
    res.status(401).json({
      message: 'You are not authorized to remove entries.',
    })
    return
  }
  await Entry.deleteOne({
    raceId: mongoose.Types.ObjectId(req.body.raceId),
    riderId: mongoose.Types.ObjectId(req.body.riderId),
  }).exec()
  res.status(204).end()
})
