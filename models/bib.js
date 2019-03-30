const mongoose = require('mongoose')

const BibSchema = new mongoose.Schema(
  {
    seriesId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    riderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    bibNumber: {
      type: Number,
      required: true,
    },
  },
  {
    collection: 'bibs',
  }
)

BibSchema.virtual('series', {
  ref: 'Series',
  localField: 'seriesId',
  foreignField: '_id',
  justOne: true,
})

BibSchema.virtual('rider', {
  ref: 'Rider',
  localField: 'riderId',
  foreignField: '_id',
  justOne: true,
})

mongoose.model('Bib', BibSchema)
