const mongoose = require('mongoose');

const RiderSchema = new mongoose.Schema(
  {
    firstname: {
      type: String,
      required: true,
    },
    lastname: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: false,
    },
    phone: {
      type: String,
      required: true,
    },
    license: {
      type: String,
      required: true,
    },
    transponder: {
      type: String,
      required: false,
    },
    birthdate: {
      type: Date,
      required: true,
    },
    team: {
      type: String,
      required: false,
    },
  },
  {
    collection: 'riders',
  }
);

RiderSchema.virtual('entries', {
  ref: 'Entry',
  localField: '_id',
  foreignField: 'riderId',
  options: {
    sort: {
      lastname: -1
    },
  },
});

mongoose.model('Rider', RiderSchema);
