const mongoose = require('mongoose');
const Series = mongoose.model('Series');
const _async = require('async-express');
const auth = require('../middleware/auth');

module.exports = (app) => {
  app.get('/series', auth, getSeries);
  app.post('/series', auth, create);
  app.get('/series/authenticated', auth, getOwnSeries);
};

const create = _async(async (req, res) => {
  const created = await Series.create({promoterId: req.promoter._id, ...req.body});
  res.json(created);
});

const getSeries = _async(async (req, res) => {
  if (req.query._id) {
    const series = await Series.findOne({
      _id: mongoose.Types.ObjectId(req.query._id)
    }).populate('promoter').lean().exec();
    res.json(series);
    return;
  }
  res.json(await Series.find({}).populate('promoter').lean().exec());
});

const getOwnSeries = _async(async (react, res) => {
  const series = await Series.find({
    promoterId: mongoose.Types.ObjectId(req.promoter._id)
  }).populate('promoter').lean().exec();
  res.json(series);
})
