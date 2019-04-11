const mongoose = require('mongoose')

const PassingSchema = new mongoose.Schema(
  {
    transponder: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    riderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    seriesId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    raceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
  },
  {
    collection: 'passings',
  }
)

PassingSchema.virtual('rider', {
  ref: 'Rider',
  localField: 'riderId',
  foreignField: '_id',
  justOne: true,
})

PassingSchema.virtual('race', {
  ref: 'Race',
  localField: 'raceId',
  foreignField: '_id',
  justOne: true,
})

mongoose.model('Passing', PassingSchema)