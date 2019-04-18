import test from 'ava'
import supertest from 'supertest'
import app from '..'
import nanoid from 'nanoid'
import { createPromoter, createSeries, createRace, createEvent } from './api'
import randomObjectId from 'random-objectid'

test.before(async (t) => {
  const { body: promoter } = await createPromoter()
  t.context.promoter = promoter
})

test('should create passing', async (t) => {
  const { token } = t.context.promoter
  const { body: series } = await createSeries(token)
  const { body: event } = await createEvent(token, {
    seriesId: series._id,
  })
  const { body: race } = await createRace(token, {
    eventId: event._id,
  })
  await supertest(app)
    .post('/passings')
    .send({
      token: t.context.promoter.token,
      transponder: nanoid(),
      date: new Date(),
      raceId: race._id,
    })
  t.pass()
})

test('should fail to create passing for non-existant race', async (t) => {
  await supertest(app)
    .post('/passings')
    .send({
      token: t.context.promoter.token,
      transponder: nanoid(),
      date: new Date(),
      raceId: await randomObjectId(),
    })
    .expect(404)
  t.pass()
})

test('should fail to create passing if not series promoter', async (t) => {
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
    .post('/passings')
    .send({
      token: promoter.token,
      transponder: nanoid(),
      date: new Date(),
      raceId: race._id,
    })
    .expect(401)
  t.pass()
})

test('should delete passing', async (t) => {
  const { token } = t.context.promoter
  const { body: series } = await createSeries(token)
  const { body: event } = await createEvent(token, {
    seriesId: series._id,
  })
  const { body: race } = await createRace(token, {
    eventId: event._id,
  })
  const transponder = nanoid()
  await supertest(app)
    .post('/passings')
    .send({
      token: t.context.promoter.token,
      transponder,
      date: new Date(),
      raceId: race._id,
    })
  const { body: passings } = await supertest(app)
    .get('/passings')
    .query({
      raceId: race._id,
    })
  const passing = passings.find(
    (passing) => passing.transponder === transponder
  )
  await supertest(app)
    .delete('/passings')
    .send({
      token,
      _id: passing._id,
    })
  t.pass()
})

test('should fail to delete passing if not series promoter', async (t) => {
  const { token } = t.context.promoter
  const { body: promoter } = await createPromoter()
  const { body: series } = await createSeries(token)
  const { body: event } = await createEvent(token, {
    seriesId: series._id,
  })
  const { body: race } = await createRace(token, {
    eventId: event._id,
  })
  const transponder = nanoid()
  await supertest(app)
    .post('/passings')
    .send({
      token: t.context.promoter.token,
      transponder,
      date: new Date(),
      raceId: race._id,
    })
  const { body: passings } = await supertest(app)
    .get('/passings')
    .query({
      raceId: race._id,
    })
  const passing = passings.find(
    (passing) => passing.transponder === transponder
  )
  await supertest(app)
    .delete('/passings')
    .send({
      token: promoter.token,
      _id: passing._id,
    })
    .expect(401)
  t.pass()
})
