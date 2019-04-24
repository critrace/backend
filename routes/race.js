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
const moment = require('moment')
const _ = require('lodash')

module.exports = (app) => {
  app.get('/races', auth.notRequired, getRaces)
  app.post('/races', auth, create)
  app.post('/races/entry', auth, createEntry)
  app.get('/races/entries', getEntries)
  app.delete('/races/entries', auth, removeEntry)
  app.delete('/races', auth, _delete)
  app.get('/races/leaderboard', leaderboard)
  app.put('/races', auth, update)
}

const leaderboard = _async(async (req, res) => {
  const [race, enteredTransponders] = await Promise.all([
    Race.findOne({
      _id: mongoose.Types.ObjectId(req.query.raceId),
    }).exec(),
    Entry.find({
      raceId: mongoose.Types.ObjectId(req.query.raceId),
    })
      .exec()
      .then((entries) => {
        if (!entries.length) {
          return []
        }
        return Rider.find({
          $or: _.map(entries, (entry) => ({ _id: entry.riderId })),
        })
      })
      .then((riders) => _.map(riders, 'transponder'))
      .then((transponders) => _.compact(transponders)),
  ])
  const passings = await Passing.find({
    eventId: race.eventId,
    date: {
      $gte: race.actualStart || new Date(0),
    },
    $or: _.map(enteredTransponders, (transponder) => ({ transponder })),
  })
    .lean()
    .exec()
  const passingsByTransponder = _.chain(passings)
    .sortBy('date')
    .groupBy('transponder')
    .value()

  // Calculate the leaderboard for a given lap number
  const resultsForLap = (lapNumber) =>
    _.chain(passingsByTransponder)
      .map((passes) => {
        const passCount = passes.length
        // The latest pass we should evaluate for the race
        const passIndex = Math.min(passCount - 1, lapNumber - 1)
        return {
          ...passes[passIndex],
          lapCount: Math.min(passCount, lapNumber),
        }
      })
      .sortBy('date')
      .reverse()
      .sortBy('lapCount')
      .reverse()
      .value()

  const results = resultsForLap(race.lapCount || Number.MAX_VALUE)
  // Retroactively load associated transponders if not mapped to riderId
  const resultPasses = await Promise.all(
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
  const finalResults = _.map(resultPasses, (pass) => {
    if (pass.lapCount <= 1) return pass
    const lapLeaderboard = resultsForLap(pass.lapCount)
    const leaderTransponder = _.first(lapLeaderboard).transponder
    const leaderPass =
      passingsByTransponder[leaderTransponder][pass.lapCount - 1]
    const secondsDiff =
      moment(pass.date).unix() - moment(leaderPass.date).unix()
    return {
      ...pass,
      secondsDiff,
    }
  })
  const [leaderPass] = finalResults
  res.json({
    isFinished:
      race.lapCount && leaderPass && race.lapCount <= leaderPass.lapCount,
    leaderFinishTime: (leaderPass && leaderPass.date) || undefined,
    passings: finalResults,
  })
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

const update = _async(async (req, res) => {
  if (!req.body._id) {
    res.status(400).json({
      message: 'No _id supplied',
    })
    return
  }
  const race = await Race.findOne({
    _id: mongoose.Types.ObjectId(req.body._id),
  }).exec()
  const seriesPromoter = await SeriesPromoter.findOne({
    promoterId: req.promoter._id,
    seriesId: race.seriesId,
  }).exec()
  if (!seriesPromoter) {
    res.status(401).json({
      message: 'You are not authorized to update this race',
    })
    return
  }
  await Race.updateOne(
    {
      _id: mongoose.Types.ObjectId(req.body._id),
    },
    req.body.changes
  )
  res.status(204).end()
})
