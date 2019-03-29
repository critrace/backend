const mongoose = require('mongoose');
const Event = mongoose.model('Event');
const Race = mongoose.model('Race');
const _async = require('async-express');
const auth = require('../middleware/auth');

module.exports = (app) => {
  app.get('/events', getEvent);
  app.get('/events/upcoming', upcomingEvents);
  app.post('/events', auth, create);
};

const create = _async(async (req, res) => {
  const created = await Event.create(req.body);
  res.json(created);
});

const getEvent = _async(async (req, res) => {
  const event = await Event.findOne({
    _id: mongoose.Types.ObjectId(req.query._id)
  }).populate('races').lean().exec();
  res.json(event);
});

const upcomingEvents = _async(async (req, res) => {
  const events = await Event.find({
    startDate: {
      $gte: new Date()
    }
  }).populate('races').lean().exec();
  res.json(events);
});
