import mongoose from 'mongoose'
import asyncExpress from 'async-express'
import auth from '../middleware/auth'
import _ from 'lodash'
import multer from 'multer'
import moment from 'moment'
import csvParse from 'csv-parse'
import nanoid from 'nanoid'
const Rider = mongoose.model('Rider')
const upload = multer({
  storage: multer.memoryStorage(),
})

export default (app: any) => {
  app.get('/riders', getRiders)
  app.post('/riders', auth, create)
  app.get('/riders/search', search)
  app.put('/riders', auth, update)
  app.post('/riders/byId', byId)
  app.post('/riders/import', auth, upload.single('csv'), importRiders)
}

const importRiders = asyncExpress(async (req, res) => {
  if (req.promoter._id.toString() !== '5c9b27726be36765d827bc4f') {
    res.status(401)
    res.json({ message: 'Not authorized to import rider data' })
    return
  }
  const ridersCSV = req.file.buffer.toString('utf8')
  // Verify csv validity by looking at first line
  const currentSchema =
    'Suspension,license#,last name,first name,city,state,zip,gender,racing age,exp date,Rdclub,Rdteam,Trackclub,Trackteam,MTNclub,MTNteam,CXclub,CXteam,IntlTeam,Collclub,Road Cat,Track Cat, XC Cat, DH Cat, OT Cat, MX Cat, Cross Cat,birthdate,citizen,RD Club id,RD Team id,Track Clubid,Track Teamid,MTN Clubid,MTN Teamid,CX Clubid,CX Team id,Coll Clubid,UCI Code,CX Rank,HS Club,HS Team,HS Club id,HS Team id, UCI ID, UCI Category, Nationality, Citizenship, BMX'
  if (ridersCSV.indexOf(currentSchema) !== 0) {
    res.status(400)
    res.json({ message: 'Schema change detected, aborting import' })
    return
  }
  // Parse the csv to an array of array
  const data = await new Promise((rs, rj) => {
    csvParse(
      ridersCSV,
      {
        skip_empty_lines: true,
      },
      (err, output) => {
        if (err) return rj(err)
        rs(output)
      }
    )
  })
  // Strip the first row and map to objects
  const riders = _.chain(data)
    .tail()
    .map((values) => ({
      licenseStatus: values[0] || 'Active',
      // Remove leading 0's
      license: `${+values[1]}`,
      lastname: values[2],
      firstname: values[3],
      racingAge: values[8],
      licenseExpirationDate: values[9]
        ? moment(values[9], 'MM/DD/YYYY').toISOString()
        : '',
      teamName: values[11],
      racingCategoryRoad: values[20],
      teamId: values[30],
    }))
    .value()
  for (const [index, rider] of riders.entries()) {
    try {
      const result = await Rider.updateOne(
        {
          license: rider.license,
        },
        rider
      ).exec()
      if (result.n === 0) {
        // Need to create the rider
        await Rider.create(rider)
      }
      index % 50 === 0 &&
        console.log(`${index}/${riders.length} riders updated`)
    } catch (err) {
      console.log('Error updating rider', rider, err)
    }
  }
  res.status(204).end()
})

const byId = asyncExpress(async (req, res) => {
  if (req.body._ids && req.body._ids.length === 0) {
    res.json([])
    return
  }
  const riders = await Rider.find({
    $or: req.body._ids.map((_id) => ({
      _id,
    })),
  })
  res.json(riders)
})

const create = asyncExpress(async (req, res) => {
  if (!req.body.license && !req.body.licenseExpirationDate) {
    // It's a one day, set the license expiration 1 day forward
    const licenseExpirationDate = new Date()
    licenseExpirationDate.setDate(licenseExpirationDate.getDate() + 1)
    req.body.licenseExpirationDate = licenseExpirationDate
  }
  req.body.license = req.body.license || nanoid(10)
  const created = await Rider.create(req.body)
  res.json(created)
})

const getRiders = asyncExpress(async (req, res) => {
  const query = {}
  if (req.query.license) {
    query.license = req.query.license
  } else if (req.query._id) {
    query._id = mongoose.Types.ObjectId(req.query._id)
  }
  if (Object.keys(query).length === 0) {
    // Mass find
    const models = await Rider.find(query)
    res.json(models)
    return
  }
  const model = await Rider.findOne(query)
    .lean()
    .exec()
  if (!model) {
    res.status(404).json({
      message: 'No model found',
    })
    return
  }
  res.json(model)
})

const search = asyncExpress(async (req, res) => {
  const searchString = req.query.search || ''
  if (!searchString.length) {
    res.json([])
    return
  }
  // Limit to 3 search terms
  const strings = searchString.split(' ').slice(0, 3)
  const searchRegexes = strings.map((s) => new RegExp(`^${s}`, 'i'))
  // And each of these or clauses
  const orClauses = searchRegexes.map((regex) => ({
    $or: [
      {
        license: {
          $regex: regex,
        },
      },
      {
        firstname: {
          $regex: regex,
        },
      },
      {
        lastname: {
          $regex: regex,
        },
      },
    ],
  }))
  const riders = await Rider.find({})
    .and(orClauses)
    .populate('bibs')
    .limit(20)
    .lean()
    .exec()
  res.json(riders)
})

const update = asyncExpress(async (req, res) => {
  if (!req.body.where) {
    res.status(400).json({
      message: 'No where clause supplied',
    })
    return
  }
  await Rider.updateOne(req.body.where, req.body.changes).exec()
  res.status(204).end()
})
