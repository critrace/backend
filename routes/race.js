const mongoose = require('mongoose');
const Race = mongoose.model('Race');
const Event = mongoose.model('Event');
const Entry = mongoose.model('Entry');
const _async = require('async-express');
const auth = require('../middleware/auth');

module.exports = (app) => {
  app.get('/races', getRaces);
  app.post('/races', auth, create);
  app.post('/races/entry', auth, createEntry);
  app.get('/races/entries', auth, getEntries);
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

const getEntries = _async(async (req, res) => {
  const entries = await Entry.find({
    raceId: mongoose.Types.ObjectId(req.query._id)
  }).populate('rider').populate('race').lean().exec();
  res.json(entries);
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

const createEntry = _async(async (req, res) => {
  const race = await Race.findOne({
    _id: mongoose.Types.ObjectId(req.body.raceId)
  }).populate('event').lean().exec();
  if (race.event.promoterId.toString() !== req.promoter._id.toString()) {
    res.status(401).json({
      message: 'You are not authorized to add entries.'
    });
    return;
  }
  const existing = await Promise.all([
    Entry.findOne({
      riderId: mongoose.Types.ObjectId(req.body.riderId),
      raceId: mongoose.Types.ObjectId(req.body.raceId)
    }).lean().exec(),
    Entry.findOne({
      raceId: mongoose.Types.ObjectId(req.body.raceId),
      bib: req.body.bib,
    }),
  ]);
  if (existing[0]) {
    res.status(400).json({
      message: 'This rider is already registered for this race.',
    });
    return;
  } else if (existing[1]) {
    res.status(400).json({
      message: 'This bib number is already in use'
    });
    return;
  }
  const created = await Entry.create(req.body);
  res.json(created);
});
