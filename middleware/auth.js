const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')

module.exports = (req, res, next) => {
  const promoter = loadPromoter(req, res)
  if (!promoter) {
    res.status(401)
    res.send('No authentication token supplied in body or query.')
    return
  }
  req.promoter = promoter
  next()
}

module.exports.notRequired = (req, res, next) => {
  const promoter = loadPromoter(req, res)
  req.promoter = promoter || {}
  next()
}

const loadPromoter = (req, res) => {
  const token = req.body.token || req.query.token
  if (!token) return
  try {
    const promoter = jwt.verify(token, process.env.WEB_TOKEN_SECRET)
    if (promoter._id) {
      promoter._id = mongoose.Types.ObjectId(promoter._id)
    }
    return promoter
  } catch (err) {
    // console.log('Error decoding token', err)
    res.status(500)
    res.send(err.toString())
  }
}
