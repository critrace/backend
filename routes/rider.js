const mongoose = require('mongoose');
const Rider = mongoose.model('Rider');
const _async = require('async-express');
const auth = require('../middleware/auth');

module.exports = (app) => {
  app.get('/riders', getRiders);
  app.post('/riders', auth, create);
  app.get('/riders/search', search);
};

const create = _async(async (req, res) => {
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
  const riders = await Rider.find().or([
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
  ]).lean().exec();
  res.json(riders);
});
