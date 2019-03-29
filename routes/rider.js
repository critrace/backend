const mongoose = require('mongoose');
const Rider = mongoose.model('Rider');
const _async = require('async-express');
const auth = require('../middleware/auth');

module.exports = (app) => {
  app.get('/riders', getRiders);
  app.post('/riders', auth, create);
  app.get('/riders/search', search);
  app.put('/riders', auth, update);
};

const create = _async(async (req, res) => {
  if (req.body.models) {
    const created = await Rider.create(req.body.models);
    res.json(created);
    return;
  }
  const created = await Rider.create(req.body);
  res.json(created);
});

const getRiders = _async(async (req, res) => {
  const rider = await Rider.findOne({
    _id: mongoose.Types.ObjectId(req.query._id)
  }).lean().exec();
  res.json(rider);
});

const search = _async(async (req, res) => {
  const searchRegex = new RegExp(`^${req.query.search}`, 'i')
  const riders = await Rider.find({
    licenseExpirationDate: {
      $gte: new Date()
    }
  }).or([
    {
      license: {
        $regex: searchRegex,
      }
    }, {
      firstname: {
        $regex: searchRegex
      }
    }, {
      lastname: {
        $regex: searchRegex
      }
    }
  ]).populate('bibs').limit(20).lean().exec();
  res.json(riders);
});

const update = _async(async (req, res) => {
  await Rider.updateOne(
    req.body.where,
    req.body.changes
  ).exec();
  res.status(204).end();
});
