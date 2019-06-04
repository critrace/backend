const mongoose = require('mongoose')
const Event = mongoose.model('Event')
const Race = mongoose.model('Race')
const Entry = mongoose.model('Entry')
const SeriesPromoter = mongoose.model('SeriesPromoter')
const Bib = mongoose.model('Bib')
const Rider = mongoose.model('Rider')
const asyncExpress = require('async-express')
const auth = require('../middleware/auth')
const { isSeriesPromoter } = require('./series')
const _ = require('lodash')
const csvStringify = require('csv-stringify')
const { leaderboardByRaceId } = require('./leaderboard')
const moment = require('moment')

module.exports = (app) => {
  app.get('/events', auth.notRequired, getEvent)
  app.get('/events/home', homeEvents)
  app.post('/events', auth, create)
  app.delete('/events', auth, deleteEvent)
  app.get('/events/entries', getEntries)
  app.get('/events/csv', auth, generateCSV)
}

/**
 * Result csv download route
 **/
const generateCSV = asyncExpress(async (req, res) => {
  const _event = await Event.findOne({
    _id: mongoose.Types.ObjectId(req.query.eventId),
  })
    .populate('races')
    .exec()
  if (!(await isSeriesPromoter(_event.seriesId, req.promoter._id))) {
    res.status(401)
    res.json({ message: 'Not authorized to generate CSV ' })
    return
  }
  const headers = [
    'Race Date',
    'Race Discipline',
    'Race Category',
    'Race Gender',
    'Race Class',
    'Rider License #',
    'Rider First Name',
    'Rider Last Name',
    'Rider Place',
    'Bib',
    'Team',
  ]
  // Array of Passings representing final race positions
  const leaderboards = await Promise.all(
    _event.races.map((race) => leaderboardByRaceId(race._id))
  )
  // All the passings for the races in a single array
  const resultPassings = _.chain(leaderboards)
    .map((leaderboard) => ({
      ...leaderboard,
      passings: leaderboard.passings.map((passing, index) => ({
        position: index + 1,
        ...passing,
      })),
    }))
    .map((leaderboard) => leaderboard.passings)
    .flatten()
    .value()

  const passingsById = _.keyBy(resultPassings, '_id')

  const racesById = _.keyBy(
    await Race.find({
      _id: {
        $in: _.map(resultPassings, 'raceId'),
      },
    })
      .lean()
      .exec(),
    '_id'
  )

  const ridersById = _.keyBy(
    await Rider.find({
      _id: {
        $in: _.map(resultPassings, (passing) =>
          mongoose.Types.ObjectId(passing.riderId)
        ),
      },
    })
      .lean()
      .exec(),
    '_id'
  )

  const bibsByRiderId = _.keyBy(
    await Bib.find({
      seriesId: mongoose.Types.ObjectId(_event.seriesId),
      riderId: {
        $in: _.map(resultPassings, (passing) =>
          mongoose.Types.ObjectId(passing.riderId)
        ),
      },
    })
      .lean()
      .exec(),
    'riderId'
  )

  const submissionFormatted = _.chain(resultPassings)
    .map((passing) => {
      const _passing = passingsById[passing._id.toString()]
      const _rider = ridersById[passing.riderId]
      const _bib = bibsByRiderId[_rider._id.toString()]
      const _race = racesById[(passing.raceId || '').toString()]
      return {
        ..._passing,
        race: _race || {},
        rider: {
          ..._rider,
          bibNumber: _bib ? _bib.bibNumber : '',
        },
      }
    })
    .map((passing) => [
      moment(passing.race.actualStart).format('MM/DD/YYYY'),
      'CRIT',
      passing.race.category,
      passing.race.gender,
      '',
      passing.rider.license,
      passing.rider.firstname,
      passing.rider.lastname,
      passing.position,
      passing.rider.bibNumber,
      passing.rider.teamName,
    ])
    .value()

  const csvData = await new Promise((rs, rj) =>
    csvStringify([headers, ...submissionFormatted], (err, csv) => {
      if (err) return rj(err)
      rs(csv)
    })
  )

  res.set('Content-Type', 'text/csv')
  res.set(
    'Content-Disposition',
    `attachment; filename="${req.query.eventId}.csv"`
  )
  res.send(csvData)
})

/**
 * Create event route
 **/
const create = asyncExpress(async (req, res) => {
  if (!(await isSeriesPromoter(req.body.seriesId, req.promoter._id))) {
    res.status(401).json({
      message: 'You must be a series promoter to create an event',
    })
    return
  }
  const created = await Event.create({
    promoterId: req.promoter._id,
    ...req.body,
  })
  res.json(created)
})

const getEvent = asyncExpress(async (req, res) => {
  if (req.query._id) {
    const event = await Event.findOne({
      _id: mongoose.Types.ObjectId(req.query._id),
    })
      .populate('races')
      .populate('series')
      .lean()
      .exec()
    res.json(event)
    return
  } else if (req.query.seriesId) {
    const events = await Event.find({
      seriesId: mongoose.Types.ObjectId(req.query.seriesId),
    })
      .sort({ startDate: -1 })
      .lean()
      .exec()
    res.json(events)
    return
  }
  if (!req.promoter._id) {
    res.status(401).json({
      message: 'Authenticate to retrieve owned events',
    })
    return
  }
  const seriesPromoters = await SeriesPromoter.find({
    promoterId: req.promoter._id,
  }).exec()
  if (seriesPromoters.length === 0) return res.json([])
  const events = await Event.find({
    $or: _.map(seriesPromoters, (seriesPromoter) => ({
      seriesId: seriesPromoter.seriesId,
    })),
  })
    .populate('series')
    .lean()
    .exec()
  res.json(events)
})

const homeEvents = asyncExpress(async (req, res) => {
  const events = await Event.find({
    seriesId: {
      $ne: mongoose.Types.ObjectId('5c9f78c12d17216b9edfbb9f'),
    },
  })
    .sort({
      startDate: -1,
    })
    .populate('races')
    .populate('series')
    .lean()
    .exec()
  res.json(events)
})

const deleteEvent = asyncExpress(async (req, res) => {
  const event = await Event.findOne({
    _id: mongoose.Types.ObjectId(req.body._id),
  })
    .lean()
    .exec()
  if (!event) {
    res.status(404).json({
      message: 'Could not find event by id',
    })
    return
  }
  if (!(await isSeriesPromoter(event.seriesId, req.promoter._id))) {
    res.status(401).json({
      message: 'Not authorized to delete event',
    })
    return
  }
  const races = await Race.find({
    eventId: mongoose.Types.ObjectId(req.body._id),
  }).exec()
  await Promise.all([
    Event.deleteOne({ _id: mongoose.Types.ObjectId(req.body._id) }).exec(),
    Race.deleteMany({ eventId: mongoose.Types.ObjectId(req.body._id) }).exec(),
    ...races.map(({ _id }) => Entry.deleteMany({ raceId: _id }).exec()),
  ])
  res.status(204).end()
})

const getEntries = asyncExpress(async (req, res) => {
  const entries = await Entry.find({
    eventId: mongoose.Types.ObjectId(req.query._id),
  })
    .populate('rider')
    .populate('race')
    .populate('bib')
    .lean()
    .exec()
  res.json(entries)
})
