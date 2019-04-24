import test from 'ava'
import supertest from 'supertest'
import app from '..'
import randomObjectId from 'random-objectid'
import { createRace, createPromoter, createSeries, createEvent } from './api'

test.before(async (t) => {
  const { body: promoter } = await createPromoter()
  t.context.promoter = promoter
})

test('should fail to create event if not series promoter', async (t) => {
  const { token } = t.context.promoter
  const { body: series } = await createSeries(token)
  const { body: promoter } = await createPromoter()
  await createEvent(promoter.token, {
    seriesId: series._id,
  }).expect(401)
  t.pass()
})

test('should load single event', async (t) => {
  const { token } = t.context.promoter
  const { body: series } = await createSeries(token)
  const { body: event } = await createEvent(token, {
    seriesId: series._id,
  })
  await supertest(app)
    .get('/events')
    .query({
      _id: event._id,
    })
  t.pass()
})

test('should load series events', async (t) => {
  const { token } = t.context.promoter
  const { body: series } = await createSeries(token)
  await createEvent(token, {
    seriesId: series._id,
  })
  const { body } = await supertest(app)
    .get('/events')
    .query({
      seriesId: series._id,
    })
  t.true(body.length === 1)
  t.pass()
})

test('should load own events', async (t) => {
  const { body: promoter } = await createPromoter()
  const { body: emptyEvents } = await supertest(app)
    .get('/events')
    .query({
      token: promoter.token,
    })
  t.true(emptyEvents.length === 0)
  const { body: series } = await createSeries(promoter.token)
  await createEvent(promoter.token, {
    seriesId: series._id,
  })
  const { body: events } = await supertest(app)
    .get('/events')
    .query({
      token: promoter.token,
    })
  t.true(events.length === 1)
  t.pass()
})

test('should fail to load own events if not authenticated', async (t) => {
  await supertest(app)
    .get('/events')
    .expect(401)
  t.pass()
})

test('should load home events', async (t) => {
  await supertest(app).get('/events/home')
  t.pass()
})

test('should delete event', async (t) => {
  const { token } = t.context.promoter
  const { body: series } = await createSeries(token)
  const { body: event } = await createEvent(token, {
    seriesId: series._id,
  })
  await createRace(token, {
    eventId: event._id,
  })
  await supertest(app)
    .delete('/events')
    .send({
      token,
      _id: event._id,
    })
  t.pass()
})

test('should fail to delete event if not promoter', async (t) => {
  const { token } = t.context.promoter
  const { body: promoter } = await createPromoter(token)
  const { body: series } = await createSeries(token)
  const { body: event } = await createEvent(token, {
    seriesId: series._id,
  })
  await supertest(app)
    .delete('/events')
    .send({
      _id: event._id,
    })
    .expect(401)
  await supertest(app)
    .delete('/events')
    .send({
      token,
      _id: await randomObjectId(),
    })
    .expect(404)
  await supertest(app)
    .delete('/events')
    .send({
      token: promoter.token,
      _id: event._id,
    })
    .expect(401)
  t.pass()
})

test('should load event entries', async (t) => {
  const { token } = t.context.promoter
  const { body: series } = await createSeries(token)
  const { body: event } = await createEvent(token, {
    seriesId: series._id,
  })
  await supertest(app)
    .get('/events/entries')
    .query({
      _id: event._id,
    })
  t.pass()
})
