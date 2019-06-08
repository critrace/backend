import mongoose from 'mongoose'
import asyncExpress from 'async-express'
import moment from 'moment'
import _ from 'lodash'
import nanoid from 'nanoid'
const Passing = mongoose.model('Passing')
const Rider = mongoose.model('Rider')
const Race = mongoose.model('Race')
const Entry = mongoose.model('Entry')

class Model {
  _id: string
  static wrapDocs<T>(docs: mongoose.Document[]): T[] {
    return docs.map((d) => this.wrapDoc(d))
  }
  static wrapDoc<T>(doc: mongoose.Document): T {
    return (_.pick(doc, _.keys(this)) as unknown) as T
  }
}
class _Race extends Model {
  actualStart: string
  name: string
  eventId: string
  seriesId: string
  lapCount?: number
}

class _Passing extends Model {
  date: string
  transponder: string
  riderId?: string
  eventId: string
  // Optional did not start/finish calculations and timing diff
  dns?: boolean
  dnf?: boolean
  secondsDiff?: number
}

class _Rider extends Model {
  transponder?: string
}

export default (app: any) => {
  app.get('/races/leaderboard', leaderboard)
}

/**
 * Calculate the latest results for a given race
 **/
const leaderboard = asyncExpress(async (req, res) => {
  res.json(await leaderboardByRaceId(req.query.raceId))
})

/**
 * Retrieve an array of riderIds by raceId
 **/
async function ridersByRaceId(_id: string | mongoose.Types.ObjectId) {
  return Entry.find({
    raceId: mongoose.Types.ObjectId(_id.toString()),
  })
    .lean()
    .exec()
    .then((entries) => {
      if (!entries.length) return []
      return Rider.find({
        $or: _.map((entries as unknown) as { riderId: string }[], (entry) => ({
          _id: entry.riderId,
        })),
      })
        .lean()
        .exec()
        .then((docs) => Model.wrapDocs<_Rider>(docs))
    })
}

/**
 * Calculates results from the given transponder from the target lap
 **/
function resultsForLap(number: number, passings: _Passing[]) {
  const passingsByTransponder = _.chain(passings)
    .sortBy('date')
    .groupBy('transponder')
    .value()
  return _.chain(passingsByTransponder)
    .map((passes) => {
      const passCount = passes.length
      // The latest pass we should evaluate for the race
      const passIndex = Math.min(passCount - 1, number - 1)
      return {
        ...passes[passIndex],
        lapCount: Math.min(passCount, number),
      }
    })
    .sortBy('date')
    .reverse()
    .sortBy('lapCount')
    .reverse()
    .value()
}

/**
 * Return format
 * {
 *   passings: Passing[],
 *   isFinished: boolean,
 *   leaderFinishTime: ISODate,
 *  }
 **/
export const leaderboardByRaceId = async (raceId: string) => {
  // Load the race and entered riders
  const [enteredRiders, race] = await Promise.all([
    ridersByRaceId(raceId),
    Race.findOne({
      _id: mongoose.Types.ObjectId(raceId),
    })
      .exec()
      .then((doc) => Model.wrapDoc<_Race>(doc)),
  ])
  // Load passings with riderId's retroactively applied by matching transponder to rider
  const passings = await Passing.find({
    eventId: race.eventId,
    date: {
      $gte: race.actualStart || new Date(0),
    },
  })
    .lean()
    .exec()
    .then((docs) => Model.wrapDocs<_Passing>(docs))
    .then((passings) =>
      Promise.all(
        passings.map((pass) => {
          if (pass.riderId) return Promise.resolve(pass)
          return Rider.findOne({
            transponder: pass.transponder,
          })
            .lean()
            .exec()
            .then((rider = {}) => ({ ...pass, riderId: rider && rider._id }))
        })
      )
    )
  const passingsByTransponder = _.chain(passings)
    .sortBy('date')
    .groupBy('transponder')
    .value()

  const results = resultsForLap(race.lapCount || Number.MAX_VALUE, passings)
  const enteredRiderIds = _.chain(enteredRiders)
    .map('_id')
    .map(_.toString)
    .value()
  // Add some lap metadata to each passing and order in leaderboard position for
  // criterium race, should probably version this or clean it up or something
  // you lazy fuck
  const finalResults = _.chain(results)
    .map((pass) => {
      if (
        !pass.riderId ||
        enteredRiderIds.indexOf(pass.riderId.toString()) === -1
      ) return false
      if (pass.lapCount <= 1) return pass
      const lapLeaderboard = resultsForLap(pass.lapCount, passings)
      const leaderTransponder = _.first(lapLeaderboard).transponder
      const leaderPass =
        passingsByTransponder[leaderTransponder][pass.lapCount - 1]
      const secondsDiff =
        moment(pass.date).unix() - moment(leaderPass.date).unix()
      return {
        ...pass,
        secondsDiff,
      }
    })
    .compact()
    .value()
  // Generate the list of transponders that don't have riderIds
  enteredRiders.forEach((rider) => {
    const pass = _.find(
      finalResults,
      (passing) =>
        passing.riderId && passing.riderId.toString() === rider._id.toString()
    )
    if (pass) return
    finalResults.push({
      _id: nanoid(),
      transponder: 'XXXX00',
      date: new Date(0).toISOString(),
      riderId: rider._id,
      seriesId: race.seriesId,
      eventId: race.eventId,
      raceId: race._id,
      dns: true,
    })
  })
  const [leaderPass] = finalResults
  return {
    isFinished:
      race.lapCount && leaderPass && race.lapCount <= leaderPass.lapCount,
    leaderFinishTime: (leaderPass && leaderPass.date) || undefined,
    passings: finalResults.map((passing) => ({
      raceId,
      // DNF riders whose final lap is more than 10 mins behind leader finish time
      dnf:
        !passing.dns &&
        moment(leaderPass.date).diff(moment(passing.date), 'minutes') > 10,
      ...passing,
    })),
  }
}
