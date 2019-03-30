const mongoose = require('mongoose')
const Promoter = mongoose.model('Promoter')
const _async = require('async-express')
const emailValidator = require('email-validator')
const bcrypt = require('bcrypt')
const auth = require('../middleware/auth')
const jwt = require('jsonwebtoken')

module.exports = (app) => {
  app.post('/promoters', create)
  app.post('/promoters/login', login)
  app.get('/promoters', auth, load)
}

const load = _async(async (req, res) => {
  const promoter = await Promoter.findOne({
    _id: mongoose.Types.ObjectId(req.query._id || req.promoter._id),
  })
  if (!promoter) {
    res.status(404).json({
      message: 'The model could not be found.',
    })
    return
  }
  res.json(promoter)
})

const create = _async(async (req, res) => {
  if (!req.body.password || req.body.password.length < 6) {
    res.status(400).json({
      message: 'Please make sure your password is at least 6 characters.',
    })
    return
  }
  if (!emailValidator.validate(req.body.email)) {
    res.status(400).json({
      message: 'Invalid email supplied.',
    })
    return
  }
  const promoter = await Promoter.findOne({
    email: req.body.email,
  })
    .lean()
    .exec()
  if (promoter) {
    res.status(400).json({
      message: 'This email is already registered, please login.',
    })
    return
  }
  const salt = await bcrypt.genSalt(10)
  const passwordHash = await bcrypt.hash(req.body.password, salt)
  const created = await Promoter.create({
    ...req.body,
    passwordHash,
    createdAt: new Date(),
  })
  const token = jwt.sign(
    { ...promoter, passwordHash: '' },
    process.env.WEB_TOKEN_SECRET
  )
  res.json({ ...created, token })
})

const login = _async(async (req, res) => {
  const promoter = await Promoter.findOne({
    email: req.body.email,
  })
    .lean()
    .exec()
  if (!promoter) {
    res.status(400).json({
      message: 'This email is not registered.',
    })
    return
  }
  const passwordMatch = await bcrypt.compare(
    req.body.password,
    promoter.passwordHash
  )
  if (!passwordMatch) {
    res.status(401).json({
      message: 'There was a problem logging you in.',
    })
    return
  }
  const token = jwt.sign(
    { ...promoter, passwordHash: '' },
    process.env.WEB_TOKEN_SECRET
  )
  res.json({ ...promoter, token })
})
