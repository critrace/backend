import asyncExpress from 'async-express'
import auth from '../middleware/auth'
import { isSeriesPromoter } from './series'
import mongoose from 'mongoose'
const Bib = mongoose.model('Bib')
const Entry = mongoose.model('Entry')
const SeriesPromoter = mongoose.model('SeriesPromoter')
const Race = mongoose.model('Race')

export default (app: any) => {
  app.get('/bibs', getBibs)
  app.post('/bibs', auth, create)
  app.delete('/bibs', auth, deleteBib)
  app.put('/bibs', auth, update)
}

const create = asyncExpress(async (req, res) => {
  const existingBib = await Bib.findOne({
    seriesId: mongoose.Types.ObjectId(req.body.seriesId),
    riderId: mongoose.Types.ObjectId(req.body.riderId),
  })
    .lean()
    .exec()
  if (existingBib) {
    res.status(400).json({
      message: 'This rider already has a bib',
    })
    return
  }
  if (!(await isSeriesPromoter(req.body.seriesId, req.promoter._id))) {
    res.status(401).json({
      message: 'Must be a series promoter to add a bib',
    })
    return
  }

  const existingNumber = await Bib.findOne({
    seriesId: mongoose.Types.ObjectId(req.body.seriesId),
    bibNumber: req.body.bibNumber,
  })
    .lean()
    .exec()
  if (existingNumber) {
    res.status(400).json({
      message: 'This bib number is already in use',
    })
    return
  }
  const created = await Bib.create(req.body)
  res.json(created)
})

const getBibs = asyncExpress(async (req, res) => {
  if (req.query.seriesId) {
    const bibs = await Bib.find({
      seriesId: mongoose.Types.ObjectId(req.query.seriesId),
    })
      .populate('rider')
      .populate('series')
      .lean()
      .exec()
    res.json(bibs)
    return
  } else if (req.query.raceId) {
    const race = await Race.findOne({
      _id: mongoose.Types.ObjectId(req.query.raceId),
    }).exec()
    if (!race) {
      res.status(400).json({
        message: 'Could not find the requested race',
      })
      return
    }
    const bibs = await Bib.find({
      seriesId: mongoose.Types.ObjectId(race.seriesId),
    })
      .lean()
      .exec()
    res.json(bibs)
    return
  } else if (req.query._id) {
    const bib = await Bib.findOne({
      _id: mongoose.Types.ObjectId(req.query._id),
    })
      .populate('rider')
      .populate('series')
      .lean()
      .exec()
    res.json(bib)
    return
  }
  res.status(204).end()
})

const deleteBib = asyncExpress(async (req, res) => {
  const bib = await Bib.findOne({
    _id: mongoose.Types.ObjectId(req.body._id),
  })
    .lean()
    .exec()
  if (!bib) {
    res.status(404).json({
      message: 'Unable to find by to delete',
    })
    return
  }
  if (!(await isSeriesPromoter(bib.seriesId, req.promoter._id))) {
    res.status(401).json({
      message: 'Must be a series promoter to delete a bib',
    })
    return
  }
  await Bib.deleteOne({
    _id: mongoose.Types.ObjectId(req.body._id),
  }).exec()
  await Entry.deleteMany({
    bibId: mongoose.Types.ObjectId(req.body._id),
  }).exec()
  res.status(204).end()
})

const update = asyncExpress(async (req, res) => {
  if (!req.body.where) {
    res.status(400).json({
      message: 'No where clause supplied',
    })
    return
  }
  const bib = await Bib.findOne(req.body.where)
    .lean()
    .exec()
  if (!bib) {
    res.status(404).json({
      message: 'Unable to find bib to update',
    })
    return
  }
  if (req.body.changes.bibNumber) {
    const existingBib = await Bib.findOne({
      bibNumber: req.body.changes.bibNumber,
      seriesId: mongoose.Types.ObjectId(bib.seriesId),
    }).exec()
    if (existingBib) {
      res.status(400).json({
        message: 'Bib number is taken',
      })
      return
    }
  }
  const seriesPromoter = await SeriesPromoter.findOne({
    seriesId: mongoose.Types.ObjectId(bib.seriesId),
    promoterId: mongoose.Types.ObjectId(req.promoter._id),
  })
    .lean()
    .exec()
  if (!seriesPromoter) {
    res.status(401).json({
      message: 'You are not authorized to update this bib',
    })
    return
  }
  await Bib.updateOne(req.body.where, req.body.changes).exec()
  res.status(204).end()
})
