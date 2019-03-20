const mongoose = require('mongoose');

const EntrySchema = new Schema(
  {
    riderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Rider',
      required: true,
    },
    raceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Race',
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

mongoose.model('Entry', EntrySchema);
