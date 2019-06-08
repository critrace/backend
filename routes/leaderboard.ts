import mongoose from 'mongoose'
import asyncExpress from 'async-express'
import moment from 'moment'
import _ from 'lodash'
import nanoid from 'nanoid'
const Passing = mongoose.model('Passing')
const Rider = mongoose.model('Rider')
const Race = mongoose.model('Race')
const Entry = mongoose.model('Entry')

export default (app: any) => {
  app.get('/races/leaderboard', leaderboard)
}

async function ridersByRaceId(_id: string | mongoose.Types.ObjectId) {
  return Entry.find({
    raceId: mongoose.Types.ObjectId(_id.toString()),
  })
    .exec()
    .then((entries) => {
      if (!entries.length) return []
      return Rider.find({
        $or: _.map(entries, (entry) => ({ _id: entry.riderId })),
      })
    })
}

/**
 * Calculate the latest results for a given race
 **/
const leaderboard = asyncExpress(async (req, res) => {
  res.json(await leaderboardByRaceId(req.query.raceId))
})

/**
 * Return format
 * {
 *   passings: Passing[],
 *   isFinished: boolean,
 *   leaderFinishTime: ISODate,
 *  }
 **/
export const leaderboardByRaceId = async (raceId: string) => {
  const [race, enteredRiders] = await Promise.all([
    Race.findOne({
      _id: mongoose.Types.ObjectId(raceId),
    }).exec(),
    ridersByRaceId(raceId),
  ])
  const enteredRiderIds = _.chain(enteredRiders)
    .map('_id')
    .map(_.toString)
    .value()
  const passings = await Passing.find({
    eventId: race.eventId,
    date: {
      $gte: race.actualStart || new Date(0),
    },
  })
    .lean()
    .exec()
  const passingsByTransponder = _.chain(passings)
    .sortBy('date')
    .groupBy('transponder')
    .value()

  // Calculate the leaderboard for a given lap number
  const resultsForLap = (lapNumber) =>
    _.chain(passingsByTransponder)
      .map((passes) => {
        const passCount = passes.length
        // The latest pass we should evaluate for the race
        const passIndex = Math.min(passCount - 1, lapNumber - 1)
        return {
          ...passes[passIndex],
          lapCount: Math.min(passCount, lapNumber),
        }
      })
      .sortBy('date')
      .reverse()
      .sortBy('lapCount')
      .reverse()
      .value()

  const results = resultsForLap(race.lapCount || Number.MAX_VALUE)
  // Retroactively load associated transponders if not mapped to riderId
  const resultPasses = await Promise.all(
    results.map((pass) => {
      if (pass.riderId) return Promise.resolve(pass)
      return Rider.findOne({
        transponder: pass.transponder,
      })
        .lean()
        .exec()
        .then((rider = {}) => ({ ...pass, riderId: rider && rider._id }))
    })
  )
  const finalResults = _.chain(resultPasses)
    .map((pass) => {
      if (
        !pass.riderId ||
        enteredRiderIds.indexOf(pass.riderId.toString()) === -1
      ) return false
      if (pass.lapCount <= 1) return pass
      const lapLeaderboard = resultsForLap(pass.lapCount)
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
      date: new Date(0),
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