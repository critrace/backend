const mongoose = require('mongoose');
const Event = mongoose.model('Event');
const Race = mongoose.model('Race');
const _async = require('async-express');
const auth = require('../middleware/auth');

module.exports = (app) => {
  app.get('/events', getEvents);
  app.get('/events/upcoming', upcomingEvents);
  app.post('/events', auth, create);
  app.get('/events/races', getEventRaces);
};

const create = _async(async (req, res) => {
  const created = await Event.create(req.body);
  res.json(created);
});

const getEvents = _async(async (req, res) => {
  const event = await Event.findOne({
    _id: mongoose.Types.ObjectId(req.query._id)
  }).lean().exec();
  res.json(event);
});

const upcomingEvents = _async(async (req, res) => {
  const events = await Event.find({
    startDate: {
      $gte: new Date()
    }
  }).lean().exec();
  res.json(events);
});

const getEventRaces = _async(async (req, res) => {
  const races = await Race.find({
    eventId: mongoose.Types.ObjectId(req.query._id)
  }).lean().exec();
  res.json(races);
})
