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
      required: true,
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
      required: true,
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

mongoose.model('Rider', RiderSchema);
