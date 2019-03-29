const mongoose = require('mongoose');
const Race = mongoose.model('Race');
const Event = mongoose.model('Event');
const _async = require('async-express');
const auth = require('../middleware/auth');

module.exports = (app) => {
  app.get('/races', getRace);
  app.post('/races', auth, create);
};

const create = _async(async (req, res) => {
  const event = await Event.findOne({
    _id: mongoose.Types.ObjectId(req.body.eventId)
  }).lean().exec()
  if (!event) {
    res.status(404).json({
      message: 'Supplied eventId does not exist'
    });
    return;
  }
  const created = await Race.create(req.body);
  res.json(created);
});

const getRace = _async(async (req, res) => {
  const race = await Race.findOne({
    _id: mongoose.Types.ObjectId(req.query._id)
  }).lean().exec();
  res.json(race);
});
