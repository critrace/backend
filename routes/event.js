const mongoose = require('mongoose');
const Event = mongoose.model('Event');
const Race = mongoose.model('Race');
const _async = require('async-express');
const auth = require('../middleware/auth');

module.exports = (app) => {
  app.get('/events', getEvent);
  app.get('/events/upcoming', upcomingEvents);
  app.post('/events', auth, create);
  app.delete('/events', auth, deleteEvent);
};

const create = _async(async (req, res) => {
  const created = await Event.create({
    promoterId: req.promoter._id,
    ...req.body
  });
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

const deleteEvent = _async(async (req, res) => {
  const event = await Event.findOne({
    _id: mongoose.Types.ObjectId(req.body._id)
  }).lean().exec();
  if (!event) {
    res.status(404).json({
      message: 'Could not find event by id',
    });
    return;
  }
  if (event.promoterId.toString() !== req.promoter._id.toString()) {
    res.status(401).json({
      message: 'Not authorized to delete event'
    });
    return;
  }
  await Promise.all([
    Event.deleteOne({ _id: mongoose.Types.ObjectId(req.body._id)}).exec(),
    Race.deleteMany({ eventId: mongoose.Types.ObjectId(req.body._id) }).exec()
  ]);
  res.status(204).end();
});