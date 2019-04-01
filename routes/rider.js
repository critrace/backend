const mongoose = require('mongoose')
const Rider = mongoose.model('Rider')
const _async = require('async-express')
const auth = require('../middleware/auth')

module.exports = (app) => {
  app.get('/riders', getRiders)
  app.post('/riders', auth, create)
  app.get('/riders/search', search)
  app.put('/riders', auth, update)
}

const create = _async(async (req, res) => {
  if (req.body.models) {
    const created = await Rider.create(req.body.models)
    res.json(created)
    return
  }
  if (!req.body.license && !req.body.licenseExpirationDate) {
    // It's a one day, set the license expiration 1 day forward
    const licenseExpirationDate = new Date()
    licenseExpirationDate.setDate(licenseExpirationDate.getDate() + 1)
    req.body.licenseExpirationDate = licenseExpirationDate
  }
  const created = await Rider.create(req.body)
  res.json(created)
})

const getRiders = _async(async (req, res) => {
  const query = {}
  if (req.query.license) {
    query.license = req.query.license
  } else if (req.query._id) {
    query._id = mongoose.Types.ObjectId(req.query._id)
  }
  if (Object.keys(query).length === 0) {
    // Mass find
    const models = await Rider.find(query)
    res.json(models)
    return
  }
  const model = await Rider.findOne(query)
    .lean()
    .exec()
  if (!model) {
    res.status(404).json({
      message: 'No model found',
    })
    return
  }
  res.json(model)
})

const search = _async(async (req, res) => {
  const searchRegex = new RegExp(`^${req.query.search}`, 'i')
  const riders = await Rider.find({
    licenseExpirationDate: {
      $gte: new Date(),
    },
  })
    .or([
      {
        license: {
          $regex: searchRegex,
        },
      },
      {
        firstname: {
          $regex: searchRegex,
        },
      },
      {
        lastname: {
          $regex: searchRegex,
        },
      },
    ])
    .populate('bibs')
    .limit(20)
    .lean()
    .exec()
  res.json(riders)
})

const update = _async(async (req, res) => {
  await Rider.updateOne(req.body.where, req.body.changes).exec()
  res.status(204).end()
})
