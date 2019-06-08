import test from 'ava'
import supertest from 'supertest'
import app from '../build'
import nanoid from 'nanoid'
import { createPromoter, createRider } from './api'
import randomObjectId from 'random-objectid'

test.before(async (t) => {
  const { body: promoter } = await createPromoter()
  t.context.promoter = promoter
})

test('should create one day rider', async (t) => {
  const { token } = t.context.promoter
  await createRider(token, {
    license: undefined,
    licenseExpirationDate: undefined,
  })
  t.pass()
})

test('should search for empty value', async (t) => {
  const { body } = await supertest(app).get('/riders/search')
  t.true(body.length === 0)
  t.pass()
})

test('should search for rider', async (t) => {
  const { token } = t.context.promoter
  const { body: rider } = await createRider(token)
  const { body } = await supertest(app)
    .get('/riders/search')
    .query({
      search: rider.firstname,
    })
  t.true(body.length !== 0)
  t.pass()
})

test('should load rider', async (t) => {
  const { token } = t.context.promoter
  const { body: rider } = await createRider(token)
  await supertest(app).get('/riders')
  await supertest(app)
    .get('/riders')
    .query({
      _id: rider._id,
    })
  await supertest(app)
    .get('/riders')
    .query({
      license: rider.license,
    })
  t.pass()
})

test('should fail to load rider with bad license', async (t) => {
  await supertest(app)
    .get('/riders')
    .query({
      license: nanoid(),
    })
    .expect(404)
  t.pass()
})

test('should fail to load rider with bad _id', async (t) => {
  await supertest(app)
    .get('/riders')
    .query({
      _id: await randomObjectId(),
    })
    .expect(404)
  t.pass()
})

test('should update rider', async (t) => {
  const { token } = t.context.promoter
  const { body: rider } = await createRider(token)
  await supertest(app)
    .put('/riders')
    .send({
      token,
      where: {
        _id: rider._id,
      },
      changes: {
        firstname: 'jonathan',
      },
    })
  t.pass()
})

test('should fail to update rider with no where', async (t) => {
  const { token } = t.context.promoter
  await supertest(app)
    .put('/riders')
    .send({
      token,
      changes: {
        firstname: 'jonathan',
      },
    })
    .expect(400)
  t.pass()
})

test('should fail to update rider if not authenticated', async (t) => {
  const { token } = t.context.promoter
  const { body: rider } = await createRider(token)
  await supertest(app)
    .put('/riders')
    .send({
      where: {
        _id: rider._id,
      },
      changes: {
        firstname: 'jonathan',
      },
    })
    .expect(401)
  t.pass()
})

test('should load multiple riders', async (t) => {
  const { token } = t.context.promoter
  const { body: rider } = await createRider(token)
  const { body: riders } = await supertest(app)
    .post('/riders/byId')
    .send({
      _ids: [rider._id],
    })
  t.true(riders[0]._id === rider._id)
  t.true(riders.length === 1)
  t.pass()
})

test('should return empty array', async (t) => {
  await supertest(app)
    .post('/riders/byId')
    .send({
      _ids: [],
    })
  t.pass()
})
