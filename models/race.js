const mongoose = require('mongoose');

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
      ref: 'Event',
      required: true,
    },
  },
  {
    collection: 'races',
  }
);

mongoose.model('Race', RaceSchema);
