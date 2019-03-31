const mongoose = require('mongoose')

const SeriesSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
  },
  {
    collection: 'series',
  }
)

SeriesSchema.virtual('events', {
  ref: 'Event',
  localField: '_id',
  foreignField: 'seriesId',
  options: {
    sort: {
      startDate: -1,
    },
  },
})

mongoose.model('Series', SeriesSchema)
