const mongoose = require('mongoose')

const RaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    scheduledStartTime: {
      type: String,
      required: true,
    },
    actualStart: {
      type: Date,
      required: false,
    },
    flyerUrl: {
      type: String,
      required: false,
    },
    registrationUrl: {
      type: String,
      required: false,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    seriesId: {
      type: mongoose.Schema.Types.ObjectId,
    },
  },
  {
    collection: 'races',
  }
)

RaceSchema.virtual('event', {
  ref: 'Event',
  localField: 'eventId',
  foreignField: '_id',
  justOne: true,
})

RaceSchema.virtual('entries', {
  ref: 'Entry',
  localField: '_id',
  foreignField: 'raceId',
  options: {
    sort: {
      lastname: -1,
    },
  },
})

mongoose.model('Race', RaceSchema)
