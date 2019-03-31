const mongoose = require('mongoose')
const Series = mongoose.model('Series')
const SeriesPromoter = mongoose.model('SeriesPromoter')
const Promoter = mongoose.model('Promoter')
const _async = require('async-express')
const auth = require('../middleware/auth')

module.exports = (app) => {
  app.get('/series', getSeries)
  app.post('/series', auth, create)
  app.get('/series/authenticated', auth, getOwnSeries)
  app.post('/series/invite', auth, addPromoter)
}

module.exports.isSeriesPromoter = isSeriesPromoter

async function isSeriesPromoter(seriesId, promoterId) {
  const model = await SeriesPromoter.findOne({
    promoterId: mongoose.Types.ObjectId(promoterId),
    seriesId: mongoose.Types.ObjectId(seriesId),
  })
  return !!model
}

const create = _async(async (req, res) => {
  const created = await Series.create({
    promoterId: req.promoter._id,
    ...req.body,
  })
  res.json(created)
})

const getSeries = _async(async (req, res) => {
  if (req.query._id) {
    const series = await Series.findOne({
      _id: mongoose.Types.ObjectId(req.query._id),
    })
      .populate('promoter')
      .lean()
      .exec()
    res.json(series)
    return
  }
  res.json(
    await Series.find({})
      .populate('promoter')
      .lean()
      .exec()
  )
})

const getOwnSeries = _async(async (req, res) => {
  const series = await Series.find({
    promoterId: mongoose.Types.ObjectId(req.promoter._id),
  })
    .populate('promoter')
    .lean()
    .exec()
  res.json(series)
})

const addPromoter = _async(async (req, res) => {
  const promoter = await Promoter.findOne({
    email: req.body.email,
  })
    .lean()
    .exec()
  if (!promoter) {
    res.status(404).json({
      message: 'Could not find promoter to add',
    })
    return
  }
  if (!(await isSeriesPromoter(req.body.seriesId, req.promoter._id))) {
    res.status(401).json({
      message: 'You must be a series promoter to do this',
    })
    return
  }
  await SeriesPromoter.create({ promoterId: promoter._id, ...req.body })
  res.status(204).end()
})
