const mongoose = require('mongoose');

const RaceSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    scheduledStart: {
      type: Date,
      required: true,
    },
    actualStart: {
      type: Date,
      required: true,
    },
  },
  {
    collection: 'races',
  }
);

mongoose.model('Race', RaceSchema);
