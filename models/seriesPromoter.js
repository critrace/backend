const mongoose = require('mongoose')

const SeriesPromoterSchema = new mongoose.Schema(
  {
    promoterId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    seriesId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    creator: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    collection: 'series_promoters',
  }
)

SeriesPromoterSchema.virtual('series', {
  ref: 'Series',
  localField: 'seriesId',
  foreignField: '_id',
  justOne: true,
})

SeriesPromoterSchema.virtual('promoter', {
  ref: 'Promoter',
  localField: 'promoterId',
  foreignField: '_id',
  justOne: true,
})

mongoose.model('SeriesPromoter', SeriesPromoterSchema)
