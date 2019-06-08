import test from 'ava'
import supertest from 'supertest'
import app from '../build'
import randomObjectId from 'random-objectid'
import {
  createPromoter,
  createSeries,
  createRider,
  createRace,
  createBib,
  getBibs,
  createEvent,
  deleteBib,
} from './api'

test.before(async (t) => {
  const { body: promoter } = await createPromoter(app)
  t.context.promoter = promoter
})

test('should create a bib', async (t) => {
  const { token } = t.context.promoter
  const { body: series } = await createSeries(token)
  const { body: rider } = await createRider(token)
  await createBib(token, {
    seriesId: series._id,
    riderId: rider._id,
  })
  t.pass()
})

test('should fail to create duplicate bib for rider', async (t) => {
  const { token } = t.context.promoter
  const { body: series } = await createSeries(token)
  const { body: rider } = await createRider(token)
  await createBib(token, {
    seriesId: series._id,
    riderId: rider._id,
  })
  await createBib(token, {
    seriesId: series._id,
    riderId: rider._id,
  }).expect(400)
  t.pass()
})

test('should fail to create bib if not promoter', async (t) => {
  const { token } = t.context.promoter
  const { body: promoter } = await createPromoter(token)
  const { body: series } = await createSeries(token)
  const { body: rider } = await createRider(token)
  await createBib(promoter.token, {
    riderId: rider._id,
    seriesId: series._id,
  }).expect(401)
  t.pass()
})

test('should fail to create bib if number is used', async (t) => {
  const { token } = t.context.promoter
  const { body: series } = await createSeries(token)
  const { body: rider } = await createRider(token)
  const { body: rider2 } = await createRider(token)
  await createBib(token, {
    riderId: rider._id,
    seriesId: series._id,
    bibNumber: 1,
  })
  await createBib(token, {
    riderId: rider2._id,
    seriesId: series._id,
    bibNumber: 1,
  }).expect(400)
  t.pass()
})

test('should load bibs for series', async (t) => {
  const { token } = t.context.promoter
  const { body: series } = await createSeries(token)
  const { body: rider } = await createRider(token)
  await createBib(token, {
    seriesId: series._id,
    riderId: rider._id,
  })
  const { body: bibs } = await getBibs(token, {
    seriesId: series._id,
  })
  t.true(bibs.length === 1)
  t.pass()
})

test('should load bibs for race', async (t) => {
  const { token } = t.context.promoter
  const { body: series } = await createSeries(token)
  const { body: rider } = await createRider(token)
  const { body: event } = await createEvent(token, {
    seriesId: series._id,
  })
  const { body: race } = await createRace(token, {
    eventId: event._id,
  })
  await createBib(token, {
    seriesId: series._id,
    riderId: rider._id,
  })
  const { body: bibs } = await getBibs(token, {
    raceId: race._id,
  })
  t.true(bibs.length === 1)
  t.pass()
})

test('should return 204 for empty bib load', async (t) => {
  await getBibs()
  t.pass()
})

test('should fail to load bibs for bad race id', async (t) => {
  const { token } = t.context.promoter
  await getBibs(token, {
    raceId: await randomObjectId(),
  }).expect(400)
  t.pass()
})

test('should load bib by id', async (t) => {
  const { token } = t.context.promoter
  const { body: series } = await createSeries(token)
  const { body: rider } = await createRider(token)
  const { body: bib } = await createBib(token, {
    seriesId: series._id,
    riderId: rider._id,
  })
  const { body: loadedBib } = await getBibs(undefined, {
    _id: bib._id,
  })
  t.true(loadedBib._id === bib._id)
  t.pass()
})

test('should delete bib by id', async (t) => {
  const { token } = t.context.promoter
  const { body: series } = await createSeries(token)
  const { body: rider } = await createRider(token)
  const { body: bib } = await createBib(token, {
    seriesId: series._id,
    riderId: rider._id,
  })
  await deleteBib(token, {
    _id: bib._id,
  })
  t.pass()
})

test('should fail to delete bib if not promoter', async (t) => {
  const { token } = t.context.promoter
  const { body: promoter } = await createPromoter()
  const { body: series } = await createSeries(promoter.token)
  const { body: rider } = await createRider(promoter.token)
  const { body: bib } = await createBib(promoter.token, {
    seriesId: series._id,
    riderId: rider._id,
  })
  await deleteBib(token, {
    _id: bib._id,
  }).expect(401)
  t.pass()
})

test('should fail to delete non-existent bib', async (t) => {
  const { token } = t.context.promoter
  await deleteBib(token, {
    _id: await randomObjectId(),
  }).expect(404)
  t.pass()
})

test('should update bib number', async (t) => {
  const { token } = t.context.promoter
  const { body: series } = await createSeries(token)
  const { body: rider } = await createRider(token)
  const { body: bib } = await createBib(token, {
    seriesId: series._id,
    riderId: rider._id,
  })
  await supertest(app)
    .put('/bibs')
    .send({
      token,
      where: {
        _id: bib._id,
      },
      changes: {
        bibNumber: 1,
      },
    })
  t.pass()
})

test('should fail to update bib if not series promoter', async (t) => {
  const { token } = t.context.promoter
  const { body: series } = await createSeries(token)
  const { body: rider } = await createRider(token)
  const { body: bib } = await createBib(token, {
    seriesId: series._id,
    riderId: rider._id,
  })
  const { body: promoter } = await createPromoter(token)
  await supertest(app)
    .put('/bibs')
    .send({
      token: promoter.token,
      where: {
        _id: bib._id,
      },
      changes: {
        bibNumber: 1,
      },
    })
    .expect(401)
  t.pass()
})

test('should fail to update bib with bad where clause', async (t) => {
  const { token } = t.context.promoter
  await supertest(app)
    .put('/bibs')
    .send({
      token,
      changes: {
        bibNumber: 1,
      },
    })
    .expect(400)
  await supertest(app)
    .put('/bibs')
    .send({
      token,
      where: {
        _id: await randomObjectId(),
      },
      changes: {
        bibNumber: 1,
      },
    })
    .expect(404)
  t.pass()
})
