import test from 'ava'
import supertest from 'supertest'
import app from '..'
import nanoid from 'nanoid'
import { createPromoter, createSeries, createEvent, createRace } from './api'

test.before(async (t) => {
  const { body: promoter } = await createPromoter()
  t.context.promoter = promoter
})

test('should create series', async (t) => {
  const { token } = t.context.promoter
  await createSeries(token)
  t.pass()
})

test('should load series', async (t) => {
  await supertest(app).get('/series')
  t.pass()
})

test('should load series by id', async (t) => {
  const { token } = t.context.promoter
  const { body: series } = await createSeries(token)
  const { body } = await supertest(app)
    .get('/series')
    .query({
      _id: series._id,
    })
  t.true(series._id === body._id)
  t.pass()
})

test('should load own series', async (t) => {
  const { token } = t.context.promoter
  await supertest(app)
    .get('/series/authenticated')
    .query({
      token,
    })
  t.pass()
})

test('should fail to load own series', async (t) => {
  await supertest(app)
    .get('/series/authenticated')
    .expect(401)
  t.pass()
})

test('should get series promoters', async (t) => {
  const { token } = t.context.promoter
  const { body: series } = await createSeries(token)
  const { body: promoters } = await supertest(app)
    .get('/series/promoters')
    .query({
      token,
      seriesId: series._id,
    })
  t.true(promoters.length === 1)
  t.pass()
})

test('should add promoter to series', async (t) => {
  const { token } = t.context.promoter
  const { body: promoter } = await createPromoter()
  const { body: series } = await createSeries(token)
  await supertest(app)
    .post('/series/invite')
    .send({
      token,
      seriesId: series._id,
      email: promoter.email,
    })
  t.pass()
})

test('should fail to add non-existing promoter', async (t) => {
  const { token } = t.context.promoter
  const { body: series } = await createSeries(token)
  await supertest(app)
    .post('/series/invite')
    .send({
      token,
      seriesId: series._id,
      email: `${nanoid()}@email.com`,
    })
    .expect(404)
  t.pass()
})

test('should fail to add if not series promoter', async (t) => {
  const { token } = t.context.promoter
  const { body: promoter } = await createPromoter()
  const { body: series } = await createSeries(token)
  await supertest(app)
    .post('/series/invite')
    .send({
      token: promoter.token,
      seriesId: series._id,
      email: promoter.email,
    })
    .expect(401)
  t.pass()
})

test('should redirect to latest race', async (t) => {
  const { token } = t.context.promoter
  const { body: series } = await createSeries(token)
  await supertest(app)
    .get('/series/race/latest')
    .expect(400)
  await supertest(app)
    .get('/series/race/latest')
    .query({
      seriesId: series._id,
    })
    .expect(404)
  const { body: event } = await createEvent(token, {
    seriesId: series._id,
  })
  await supertest(app)
    .get('/series/race/latest')
    .query({ seriesId: series._id })
    .expect(404)
  await createRace(token, {
    seriesId: series._id,
    eventId: event._id,
  })
  await supertest(app)
    .get('/series/race/latest')
    .query({
      seriesId: series._id,
    })
    .expect(301)
  t.pass()
})
