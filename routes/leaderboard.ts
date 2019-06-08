import mongoose from 'mongoose'
import asyncExpress from 'async-express'
import moment from 'moment'
import _ from 'lodash'
import nanoid from 'nanoid'
import Passing, { _Passing } from '../models/passing'
import Rider, { _Rider } from '../models/rider'
import Race from '../models/race'
import Entry from '../models/entry'

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
async function ridersByRaceId(
  _id: string | mongoose.Types.ObjectId
): Promise<_Rider[]> {
  const entries = await Entry.find({
    raceId: mongoose.Types.ObjectId(_id.toString()),
  })
    .lean()
    .exec()
  if (!entries.length) return []
  return await Rider.find({
    $or: _.map((entries as unknown) as { riderId: string }[], (entry) => ({
      _id: entry.riderId,
    })),
  })
    .lean()
    .exec()
}

/**
 * Calculates results from the given transponder from the target lap
 **/
function resultsForLap(number: number, passings: _Passing[]) {
  const passingsByTransponder = _.chain(passings)
    .sortBy('date')
    .groupBy('transponder')
    .value()
  return (_.chain(passingsByTransponder)
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
    .value() as unknown) as _Passing[]
}

/**
 * Load passings and associate any passings without a transponder with the relevant rider
 **/
async function loadPassings(where: any) {
  const _passings: _Passing[] = await Passing.find(where)
    .lean()
    .exec()
  return await Promise.all(
    _passings.map(async (pass: _Passing) => {
      if (pass.riderId) return pass
      const rider = await Rider.findOne({
        transponder: pass.transponder,
      })
        .lean()
        .exec()
      return { ...pass, riderId: rider && rider._id } as _Passing
    })
  )
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
      .lean()
      .exec(),
  ])
  // Load passings with riderId's retroactively applied by matching transponder to rider
  const passings = await loadPassings({
    eventId: race.eventId,
    date: {
      $gte: race.actualStart || new Date(0),
    },
  })
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
    finalResults.push(({
      _id: nanoid(),
      transponder: 'XXXX00',
      date: new Date(0).toISOString(),
      riderId: rider._id,
      seriesId: race.seriesId,
      eventId: race.eventId,
      raceId: race._id,
      dns: true,
    } as unknown) as _Passing)
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
