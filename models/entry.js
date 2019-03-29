const mongoose = require('mongoose');

const EntrySchema = new mongoose.Schema(
  {
    riderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    raceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    bib: {
      type: Number,
      required: true,
    },
  },
  {
    collection: 'entries'
  }
);

EntrySchema.virtual('race', {
  ref: 'Race',
  localField: 'raceId',
  foreignField: '_id',
  justOne: true,
});

EntrySchema.virtual('rider', {
  ref: 'Rider',
  localField: 'riderId',
  foreignField: '_id',
  justOne: true,
});

mongoose.model('Entry', EntrySchema);
