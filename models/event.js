const mongoose = require('mongoose')

const EventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: false,
    },
    seriesId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    promoterId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
  },
  {
    collection: 'events',
  }
)

EventSchema.virtual('series', {
  ref: 'Series',
  localField: 'seriesId',
  foreignField: '_id',
  justOne: true,
})

EventSchema.virtual('races', {
  ref: 'Race',
  localField: '_id',
  foreignField: 'eventId',
  options: {
    sort: {
      startTime: -1,
    },
  },
})

mongoose.model('Event', EventSchema)
