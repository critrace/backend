import test from 'ava'
import supertest from 'supertest'
import app from '..'
import nanoid from 'nanoid'
import moment from 'moment'
import {
  createPromoter,
  createSeries,
  createEvent,
  createRace,
  createRider,
  createBib,
} from './api'
import randomObjectId from 'random-objectid'

test.before(async (t) => {
  const { body: promoter } = await createPromoter()
  t.context.promoter = promoter
})

test('should fail to create with bad event id', async (t) => {
  const { token } = t.context.promoter
  await createRace(token, {
    eventId: await randomObjectId(),
  }).expect(404)
  t.pass()
})

test('should fail to start if not promoter', async (t) => {
  const { token } = t.context.promoter
  const { body: promoter } = await createPromoter()
  const { body: series } = await createSeries(token)
  const { body: event } = await createEvent(token, {
    seriesId: series._id,
  })
  const { body: race } = await createRace(token, {
    eventId: event._id,
  })
  await supertest(app)
    .post('/races/start')
    .send({
      token: promoter.token,
      _id: race._id,
    })
    .expect(401)
  t.pass()
})

test('should start race', async (t) => {
  const { token } = t.context.promoter
  const { body: series } = await createSeries(token)
  const { body: event } = await createEvent(token, {
    seriesId: series._id,
  })
  const { body: race } = await createRace(token, {
    eventId: event._id,
  })
  await supertest(app)
    .post('/races/start')
    .send({
      token,
      _id: race._id,
      actualStart: new Date(),
    })
  // Should fail to start twice
  await supertest(app)
    .post('/races/start')
    .send({
      token,
      _id: race._id,
      actualStart: new Date(),
    })
    .expect(400)
  t.pass()
})

test('should get entries', async (t) => {
  const { token } = t.context.promoter
  const { body: series } = await createSeries(token)
  const { body: event } = await createEvent(token, {
    seriesId: series._id,
  })
  const { body: race } = await createRace(token, {
    eventId: event._id,
  })
  await supertest(app)
    .get('/races/entries')
    .query({
      raceId: race._id,
    })
  t.pass()
})

test('should get races if not authed', async (t) => {
  await supertest(app).get('/races')
  t.pass()
})

test('should get races', async (t) => {
  const { token } = t.context.promoter
  await supertest(app)
    .get('/races')
    .query({
      token,
    })
  t.pass()
})

test('should get race by id', async (t) => {
  const { token } = t.context.promoter
  const { body: series } = await createSeries(token)
  const { body: event } = await createEvent(token, {
    seriesId: series._id,
  })
  const { body: race } = await createRace(token, {
    eventId: event._id,
  })
  const { body: loadedRace } = await supertest(app)
    .get('/races')
    .query({
      _id: race._id,
    })
  t.true(loadedRace._id === race._id)
  t.pass()
})

test('should get races by event', async (t) => {
  const { token } = t.context.promoter
  const { body: series } = await createSeries(token)
  const { body: event } = await createEvent(token, {
    seriesId: series._id,
  })
  const { body: race } = await createRace(token, {
    eventId: event._id,
  })
  const { body: races } = await supertest(app)
    .get('/races')
    .query({
      eventId: event._id,
    })
  t.truthy(races.find((_race) => _race._id === race._id))
  t.pass()
})

test('should create entry', async (t) => {
  const { token } = t.context.promoter
  const { body: rider } = await createRider(token)
  const { body: series } = await createSeries(token)
  const { body: event } = await createEvent(token, {
    seriesId: series._id,
  })
  const { body: race } = await createRace(token, {
    eventId: event._id,
  })
  const { body: bib } = await createBib(token, {
    seriesId: series._id,
    riderId: rider._id,
  })
  await supertest(app)
    .post('/races/entry')
    .send({
      token,
      riderId: rider._id,
      raceId: race._id,
      bibId: bib._id,
    })
  t.pass()
})

test('should fail to create duplicate entry', async (t) => {
  const { token } = t.context.promoter
  const { body: rider } = await createRider(token)
  const { body: series } = await createSeries(token)
  const { body: event } = await createEvent(token, {
    seriesId: series._id,
  })
  const { body: race } = await createRace(token, {
    eventId: event._id,
  })
  const { body: bib } = await createBib(token, {
    seriesId: series._id,
    riderId: rider._id,
  })
  await supertest(app)
    .post('/races/entry')
    .send({
      token,
      riderId: rider._id,
      raceId: race._id,
      bibId: bib._id,
    })
  await supertest(app)
    .post('/races/entry')
    .send({
      token,
      riderId: rider._id,
      raceId: race._id,
      bibId: bib._id,
    })
    .expect(400)
  t.pass()
})

test('should fail to create entry for mismatched bib', async (t) => {
  const { token } = t.context.promoter
  const { body: rider } = await createRider(token)
  const { body: rider2 } = await createRider(token)
  const { body: series } = await createSeries(token)
  const { body: event } = await createEvent(token, {
    seriesId: series._id,
  })
  const { body: race } = await createRace(token, {
    eventId: event._id,
  })
  const { body: bib } = await createBib(token, {
    seriesId: series._id,
    riderId: rider._id,
  })
  await supertest(app)
    .post('/races/entry')
    .send({
      token,
      riderId: rider2._id,
      raceId: race._id,
      bibId: bib._id,
    })
    .expect(401)
  t.pass()
})

test('should fail to create entry for invalid bib', async (t) => {
  const { token } = t.context.promoter
  const { body: rider } = await createRider(token)
  const { body: series } = await createSeries(token)
  const { body: event } = await createEvent(token, {
    seriesId: series._id,
  })
  const { body: race } = await createRace(token, {
    eventId: event._id,
  })
  await supertest(app)
    .post('/races/entry')
    .send({
      token,
      riderId: rider._id,
      raceId: race._id,
      bibId: await randomObjectId(),
    })
    .expect(400)
  t.pass()
})

test('should delete entry', async (t) => {
  const { token } = t.context.promoter
  const { body: series } = await createSeries(token)
  const { body: event } = await createEvent(token, {
    seriesId: series._id,
  })
  const { body: race } = await createRace(token, {
    eventId: event._id,
  })
  const { body: rider } = await createRider(token)
  const { body: bib } = await createBib(token, {
    seriesId: series._id,
    riderId: rider._id,
  })
  await supertest(app)
    .post('/races/entry')
    .send({
      token,
      raceId: race._id,
      riderId: rider._id,
      bibId: bib._id,
    })
  await supertest(app)
    .delete('/races/entries')
    .send({
      token,
      raceId: race._id,
      riderId: rider._id,
    })
  t.pass()
})

test('should fail to delete entry if not promoter', async (t) => {
  const { token } = t.context.promoter
  const { body: series } = await createSeries(token)
  const { body: event } = await createEvent(token, {
    seriesId: series._id,
  })
  const { body: race } = await createRace(token, {
    eventId: event._id,
  })
  const { body: rider } = await createRider(token)
  const { body: bib } = await createBib(token, {
    seriesId: series._id,
    riderId: rider._id,
  })
  const { body: promoter } = await createPromoter()
  await supertest(app)
    .post('/races/entry')
    .send({
      token,
      raceId: race._id,
      riderId: rider._id,
      bibId: bib._id,
    })
  await supertest(app)
    .delete('/races/entries')
    .send({
      token: promoter.token,
      raceId: race._id,
      riderId: rider._id,
    })
    .expect(401)
  t.pass()
})

test('should fail to create entry if not promoter', async (t) => {
  const { token } = t.context.promoter
  const { body: series } = await createSeries(token)
  const { body: event } = await createEvent(token, {
    seriesId: series._id,
  })
  const { body: race } = await createRace(token, {
    eventId: event._id,
  })
  const { body: promoter } = await createPromoter()
  await supertest(app)
    .post('/races/entry')
    .send({
      token: promoter.token,
      raceId: race._id,
    })
    .expect(401)
  t.pass()
})

test('should get leaderboard', async (t) => {
  const { token } = t.context.promoter
  const { body: rider } = await createRider(token)
  const transponder = nanoid()
  const { body: series } = await createSeries(token)
  const { body: event } = await createEvent(token, {
    seriesId: series._id,
  })
  const { body: race } = await createRace(token, {
    eventId: event._id,
  })
  const { body: bib } = await createBib(token, {
    seriesId: series._id,
    riderId: rider._id,
  })
  await supertest(app)
    .post('/races/entry')
    .send({
      token,
      riderId: rider._id,
      raceId: race._id,
      bibId: bib._id,
    })
  // Add 5 laps
  for (let x = 0; x < 5; x += 1) {
    await supertest(app)
      .post('/passings')
      .send({
        token,
        raceId: race._id,
        transponder,
        riderId: x % 2 ? rider._id : undefined,
        date: moment().add(x, 'minutes'),
      })
  }
  await supertest(app)
    .get('/races/leaderboard')
    .query({
      raceId: race._id,
    })
  t.pass()
})

test('should delete a race', async (t) => {
  const { token } = t.context.promoter
  const { body: series } = await createSeries(token)
  const { body: event } = await createEvent(token, {
    seriesId: series._id,
  })
  const { body: race } = await createRace(token, {
    eventId: event._id,
  })
  await supertest(app)
    .delete('/races')
    .send({
      token,
      _id: race._id,
    })
  t.pass()
})

test('should fail to delete non-existant race', async (t) => {
  const { token } = t.context.promoter
  await supertest(app)
    .delete('/races')
    .send({
      token,
      _id: await randomObjectId(),
    })
    .expect(404)
  t.pass()
})

test('should fail to delete race if not promoter', async (t) => {
  const { token } = t.context.promoter
  const { body: series } = await createSeries(token)
  const { body: event } = await createEvent(token, {
    seriesId: series._id,
  })
  const { body: race } = await createRace(token, {
    eventId: event._id,
  })
  const { body: promoter } = await createPromoter()
  await supertest(app)
    .delete('/races')
    .send({
      token: promoter.token,
      _id: race._id,
    })
    .expect(401)
  t.pass()
})
