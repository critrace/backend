import mongoose, { Document } from 'mongoose'

export interface _Rider extends Document {
  transponder?: string
  firstname: string
  lastname: string
}

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
      required: false,
    },
    license: {
      type: String,
      required: false,
      index: true,
      unique: true,
      sparse: true,
    },
    licenseExpirationDate: {
      type: Date,
      required: false,
    },
    licenseStatus: {
      type: String,
      required: false,
    },
    transponder: {
      type: String,
      required: false,
    },
    birthdate: {
      type: Date,
      required: false,
    },
    state: {
      type: String,
      required: false,
    },
    postalCode: {
      type: String,
      required: false,
    },
    gender: {
      type: String,
      required: false,
    },
    racingAge: {
      type: Number,
      required: false,
    },
    racingCategoryRoad: {
      type: Number,
      required: true,
      default: 5,
    },
    teamId: {
      type: Number,
      required: false,
    },
    teamName: {
      type: String,
      required: false,
    },
  },
  {
    collection: 'riders',
  }
)

RiderSchema.virtual('entries', {
  ref: 'Entry',
  localField: '_id',
  foreignField: 'riderId',
  options: {
    sort: {
      lastname: -1,
    },
  },
})

RiderSchema.virtual('bibs', {
  ref: 'Bib',
  localField: '_id',
  foreignField: 'riderId',
})

export default mongoose.model<_Rider>('Rider', RiderSchema)
