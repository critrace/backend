const mongoose = require('mongoose');
const Bib = mongoose.model('Bib');
const Entry = mongoose.model('Entry');
const _async = require('async-express');
const auth = require('../middleware/auth');

module.exports = (app) => {
  app.get('/bibs', auth, getBibs);
  app.post('/bibs', auth, create);
  app.delete('/bibs', auth, deleteBib);
};

const create = _async(async (req, res) => {
  const existingBib = await Bib.findOne({
    seriesId: mongoose.Types.ObjectId(req.body.seriesId),
    riderId: mongoose.Types.ObjectId(req.body.riderId)
  }).lean().exec();
  if (existingBib) {
    res.status(400).json({
      message: 'This rider already has a bib'
    });
    return;
  }
  const created = await Bib.create(req.body);
  res.json(created);
});

const getBibs = _async(async (req, res) => {
  if (req.query.seriesId) {
    const bibs = await Bib.find({
      seriesId: mongoose.Types.ObjectId(req.query.seriesId)
    }).populate('rider').populate('series').lean().exec();
    res.json(bibs);
    return;
  }
  res.json(await Bib.find({}).populate('rider').lean().exec());
});

const deleteBib = _async(async (req, res) => {
  await Bib.deleteOne({
    _id: mongoose.Types.ObjectId(req.body._id)
  }).exec();
  await Entry.deleteMany({
    bibId: mongoose.Types.ObjectId(req.body._id)
  }).exec();
  res.status(204).end();
});
