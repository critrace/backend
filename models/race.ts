import mongoose from 'mongoose'

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
    lapCount: {
      type: Number,
      required: false,
    },
    actualEnd: {
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
      required: true,
    },
    gender: {
      type: String,
      required: false,
    },
    category: {
      type: String,
      required: false,
    },
  },
  {
    collection: 'races',
  }
)

RaceSchema.virtual('series', {
  ref: 'Series',
  localField: 'seriesId',
  foreignField: '_id',
  justOne: true,
})

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
