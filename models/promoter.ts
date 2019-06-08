import mongoose from 'mongoose'

const PromoterSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      required: true,
    },
  },
  {
    collection: 'promoters',
  }
)

mongoose.model('Promoter', PromoterSchema)
