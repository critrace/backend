import mongoose, { Document } from 'mongoose'

interface _Entry extends Document {
  riderId: string
  raceId: string
  eventId: string
  seriesiId: string
  bibId: string
}

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
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    seriesId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    bibId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
  },
  {
    collection: 'entries',
  }
)

EntrySchema.virtual('bib', {
  ref: 'Bib',
  localField: 'bibId',
  foreignField: '_id',
  justOne: true,
})

EntrySchema.virtual('race', {
  ref: 'Race',
  localField: 'raceId',
  foreignField: '_id',
  justOne: true,
})

EntrySchema.virtual('rider', {
  ref: 'Rider',
  localField: 'riderId',
  foreignField: '_id',
  justOne: true,
})

export default mongoose.model<_Entry>('Entry', EntrySchema)
