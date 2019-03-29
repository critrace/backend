const mongoose = require('mongoose');
const Race = mongoose.model('Race');
const Event = mongoose.model('Event');
const _async = require('async-express');
const auth = require('../middleware/auth');

module.exports = (app) => {
  app.get('/races', getRaces);
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

const getRaces = _async(async (req, res) => {
  if (req.query.eventId) {
    const races = await Race.find({
      eventId: mongoose.Types.ObjectId(req.query.eventId)
    }).populate('entries').lean().exec();
    res.json(races);
  } else if (req.query._id) {
    const race = await Race.findOne({
      _id: mongoose.Types.ObjectId(req.query._id)
    }).populate('entries').lean().exec();
    res.json(race);
  } else {
    res.status(400).json({
      message: 'Supply either an eventId or an _id query field',
    });
  }
});
