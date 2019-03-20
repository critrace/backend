const mongoose = require('mongoose');

const PromoterSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      required: true,
    }
  },
  {
    collection: 'promoters',
  }
);

mongoose.model('Promoter', PromoterSchema);
