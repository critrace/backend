const mongoose = require('mongoose');
const Event = mongoose.model('Event');
const _async = require('async-express');

module.exports = (app) => {
  app.get('/events', getEvents);
  app.get('/events/upcoming', upcomingEvents);
};

const getEvents = _async(async (req, res) => {
  const events = await Event.find({}).lean().exec();
  res.json(events);
});

const upcomingEvents = _async(async (req, res) => {
  const events = await Event.find({
    startDate: {
      $gte: new Date()
    }
  }).lean().exec();
  res.json(events);
});
