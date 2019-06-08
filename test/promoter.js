import test from 'ava'
import supertest from 'supertest'
import app from '../build'
import nanoid from 'nanoid'
import { createPromoter } from './api'
import randomObjectId from 'random-objectid'

test('should create promoter', async (t) => {
  await createPromoter()
  t.pass()
})

test('should fail to create promoter with existing email', async (t) => {
  const email = `${nanoid()}@email.com`
  await createPromoter(undefined, {
    email,
  })
  // Should fail to create duplicate email
  await createPromoter(undefined, {
    email,
  }).expect(400)
  t.pass()
})

test('should login', async (t) => {
  const { body: promoter } = await createPromoter()
  const { token } = promoter
  await supertest(app)
    .post('/promoters/login')
    .send({
      token,
      email: promoter.email,
      password: 'password',
    })
  t.pass()
})

test('should fail to create with invalid password', async (t) => {
  await createPromoter(undefined, {
    password: 'pass',
  }).expect(400)
  t.pass()
})

test('should fail to create with invalid email', async (t) => {
  await createPromoter(undefined, {
    email: 'not a valid email',
  }).expect(400)
  t.pass()
})

test('should fail to login with invalid email', async (t) => {
  await supertest(app)
    .post('/promoters/login')
    .send({
      email: 'this is not a valid email',
      password: 'password',
    })
    .expect(404)
  t.pass()
})

test('should fail to login with invalid password', async (t) => {
  const { body: promoter } = await createPromoter()
  await supertest(app)
    .post('/promoters/login')
    .send({
      email: promoter.email,
      password: 'pass',
    })
    .expect(401)
  t.pass()
})

test('should load promoter by id', async (t) => {
  const { body: promoter } = await createPromoter()
  const { token } = promoter
  await supertest(app)
    .get('/promoters')
    .query({
      _id: promoter._id,
    })
    .expect(401)
  await supertest(app)
    .get('/promoters')
    .query({
      token,
      _id: promoter._id,
    })
  await supertest(app)
    .get('/promoters')
    .query({
      token,
    })
  t.pass()
})

test('should fail to load invalid promoter', async (t) => {
  const { body: promoter } = await createPromoter()
  const { token } = promoter
  await supertest(app)
    .get('/promoters')
    .query({
      token,
      _id: await randomObjectId(),
    })
    .expect(404)
  t.pass()
})

test('should 404 on bad login', async (t) => {
  await supertest(app)
    .post('/promoters/login')
    .send({
      email: `${nanoid()}@email.com`,
      password: 'password',
    })
    .expect(404)
  t.pass()
})

test('should update promoter email', async (t) => {
  const UPDATE_EMAIL = 'update@email.com'
  const { body: promoter } = await createPromoter()
  await supertest(app)
    .put('/promoters')
    .send({})
    .expect(401)
  await supertest(app)
    .put('/promoters')
    .send({
      token: promoter.token,
      email: UPDATE_EMAIL,
    })
  await supertest(app)
    .post('/promoters/login')
    .send({
      email: UPDATE_EMAIL,
      password: 'password',
    })
  t.pass()
})

test('should fail to update password if no oldPassword', async (t) => {
  const { body: promoter } = await createPromoter()
  await supertest(app)
    .put('/promoters')
    .send({
      token: promoter.token,
      _id: promoter._id,
      password: 'new_password',
    })
    .expect(400)
  t.pass()
})

test('should fail to update password if oldPassword is invalid', async (t) => {
  const { body: promoter } = await createPromoter()
  await supertest(app)
    .put('/promoters')
    .send({
      token: promoter.token,
      _id: promoter._id,
      oldPassword: 'not the password',
      password: 'new_password',
    })
    .expect(401)
  t.pass()
})

test('should update promoter password', async (t) => {
  const { body: promoter } = await createPromoter()
  await supertest(app)
    .put('/promoters')
    .send({
      token: promoter.token,
      _id: promoter._id,
      oldPassword: 'password',
      password: 'new_password',
    })
  await supertest(app)
    .post('/promoters/login')
    .send({
      email: promoter.email,
      password: 'new_password',
    })
  t.pass()
})
