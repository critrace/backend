const mongoose = require('mongoose');
const Event = mongoose.model('Event');
const asyncHandler = require('express-async-handler');

module.exports = (app) => {
  app.get('/events', asyncHandler(getEvents));
  app.get('/events/upcoming', asyncHandler(upcomingEvents));
};

async function getEvents(req, res) {
  const events = await Event.find({}).lean().exec();
  res.json(events);
}

async function upcomingEvents(req, res) {
  const events = await Event.find({
    startDate: {
      $gte: new Date()
    }
  }).lean().exec();
  res.json(events);
}
