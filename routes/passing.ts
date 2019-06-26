import mongoose from 'mongoose'
import express from 'express'
import auth from '../middleware/auth'
import multer from 'multer'
import csvParse from 'csv-parse'
import moment from 'moment'
import _ from 'lodash'
import { isSeriesPromoter } from './series'
const Passing = mongoose.model('Passing')
const Event = mongoose.model('Event')
const Rider = mongoose.model('Rider')
const SeriesPromoter = mongoose.model('SeriesPromoter')
const upload = multer({
  storage: multer.memoryStorage(),
})

export default (app: express.Application) => {
  app.get('/passings', load)
  app.post('/passings', auth, create)
  app.delete('/passings', auth, _delete)
  app.post('/passings/import', auth, upload.single('csv'), importPassings)
  app.post('/passings/associate', auth, associateTranspondersByEvent)
}

const importPassings = async (req: express.Request, res: express.Response) => {
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
  if (!(await isSeriesPromoter(event.seriesId, req.promoter._id))) {
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
      _.get(
        passingsByTransponderDate,
        `[${passing.transponder}][${passing.date.toString()}]`
      )
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
}

const create = async (req: express.Request, res: express.Response) => {
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
}

const load = async (req: express.Request, res: express.Response) => {
  const models = await Passing.find({
    eventId: mongoose.Types.ObjectId(req.query.eventId),
  })
    .limit(250)
    .populate('rider')
    .lean()
    .exec()
  res.json(models)
}

const _delete = async (req: express.Request, res: express.Response) => {
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
}

/**
 * Accepts transponder, eventId, riderId
 **/
const associateTranspondersByEvent = async (req: express.Request, res: express.Response) => {
  const { transponder, eventId, riderId } = req.body
  if (!transponder) {
    return res.status(400).json({ message: 'Missing transponder parameter' })
  } else if (!eventId) {
    return res.status(400).json({ message: 'Missing eventId parameter' })
  } else if (!riderId) {
    return res.status(400).json({ message: 'Missing riderId to parameter' })
  }
  const event = await Event.findOne({
    _id: mongoose.Types.ObjectId(eventId),
  }).exec()
  const rider = await Rider.findOne({
    _id: mongoose.Types.ObjectId(riderId),
  }).exec()
  if (!event) {
    return res
      .status(404)
      .json({ message: `Unable to find event by id "${eventId}"` })
  } else if (!rider) {
    return res
      .status(404)
      .json({ message: `Unable to find rider by id "${riderId}"` })
  }
  if (!(await isSeriesPromoter(event.seriesId, req.promoter._id))) {
    res.status(401)
    res.json({ message: 'Not authorized to associate rider id for passings' })
    return
  }
  const existing = (await Passing.find({
    eventId: mongoose.Types.ObjectId(eventId),
    transponder,
    riderId: {
      $exists: true,
    },
  }).exec()).filter((pass) => pass.rider && pass.riderId.toString() !== riderId)
  if (existing.length !== 0 && req.body.force !== true) {
    return res.status(422).json({
      message:
        'Existing passings bound to riderId found. Aborting. Pass "force: true" in body to override',
    })
  }
  await Passing.updateMany(
    {
      eventId: mongoose.Types.ObjectId(eventId),
      transponder,
    },
    {
      riderId,
    }
  ).exec()
  res.status(204).end()
}
