const mongoose = require('mongoose')
const Event = mongoose.model('Event')
const Race = mongoose.model('Race')
const Entry = mongoose.model('Entry')
const _async = require('async-express')
const auth = require('../middleware/auth')
const { isSeriesPromoter } = require('./series')

module.exports = (app) => {
  app.get('/events', getEvent)
  app.get('/events/upcoming', upcomingEvents)
  app.post('/events', auth, create)
  app.delete('/events', auth, deleteEvent)
  app.get('/events/entries', getEntries)
}

const create = _async(async (req, res) => {
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

const getEvent = _async(async (req, res) => {
  const event = await Event.findOne({
    _id: mongoose.Types.ObjectId(req.query._id),
  })
    .populate('races')
    .populate('series')
    .lean()
    .exec()
  res.json(event)
})

const upcomingEvents = _async(async (req, res) => {
  const events = await Event.find({
    startDate: {
      $gte: new Date(),
    },
  })
    .populate('races')
    .populate('series')
    .lean()
    .exec()
  res.json(events)
})

const deleteEvent = _async(async (req, res) => {
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

const getEntries = _async(async (req, res) => {
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
