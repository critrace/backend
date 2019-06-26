import mongoose from 'mongoose'
import express from 'express'
import auth, { authNotRequired } from '../middleware/auth'
import { isSeriesPromoter } from './series'
const Race = mongoose.model('Race')
const Event = mongoose.model('Event')
const Entry = mongoose.model('Entry')
const Bib = mongoose.model('Bib')
const SeriesPromoter = mongoose.model('SeriesPromoter')

export default (app: express.Application) => {
  app.get('/races', authNotRequired, getRaces)
  app.post('/races', auth, create)
  app.post('/races/entry', auth, createEntry)
  app.get('/races/entries', getEntries)
  app.delete('/races/entries', auth, removeEntry)
  app.delete('/races', auth, _delete)
  app.put('/races', auth, update)
}

const create = async (req: express.Request, res: express.Response) => {
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
}

const _delete = async (req: express.Request, res: express.Response) => {
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
}

const getEntries = async (req: express.Request, res: express.Response) => {
  const entries = await Entry.find({
    raceId: mongoose.Types.ObjectId(req.query._id),
  })
    .populate('rider')
    .populate('race')
    .populate('bib')
    .lean()
    .exec()
  res.json(entries)
}

const getRaces = async (req: express.Request, res: express.Response) => {
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
}

const createEntry = async (req: express.Request, res: express.Response) => {
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
}

const removeEntry = async (req: express.Request, res: express.Response) => {
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
}

const update = async (req: express.Request, res: express.Response) => {
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
}
