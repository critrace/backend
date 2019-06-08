import mongoose, { Document } from 'mongoose'

export interface _Passing extends Document {
  date: string
  transponder: string
  riderId?: string
  eventId: string
  // Optional did not start/finish calculations and timing diff
  lapCount?: number
  dns?: boolean
  dnf?: boolean
  secondsDiff?: number
}

const PassingSchema = new mongoose.Schema(
  {
    transponder: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    riderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    seriesId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    raceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
  },
  {
    collection: 'passings',
  }
)

PassingSchema.virtual('rider', {
  ref: 'Rider',
  localField: 'riderId',
  foreignField: '_id',
  justOne: true,
})

PassingSchema.virtual('race', {
  ref: 'Race',
  localField: 'raceId',
  foreignField: '_id',
  justOne: true,
})

PassingSchema.virtual('event', {
  ref: 'Event',
  localField: 'eventId',
  foreignField: '_id',
  justOne: true,
})

export default mongoose.model<_Passing>('Passing', PassingSchema)
