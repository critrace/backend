import test from 'ava'
import supertest from 'supertest'
import app from '..'
import casual from 'casual'

const TEST_PASSWORD = 'password'

test('should create promoter', async (t) => {
  const TEST_EMAIL = casual.email
  console.log(TEST_EMAIL)
  await supertest(app)
    .post('/promoters')
    .send({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    })
    .expect(200)
  // Should fail to create duplicate email
  await supertest(app)
    .post('/promoters')
    .send({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    })
    .expect(400)
  // Should login
  await supertest(app)
    .post('/promoters/login')
    .send({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    })
    .expect(200)
  t.pass()
})

test('should fail to create with invalid password', async (t) => {
  const TEST_EMAIL = casual.email
  await supertest(app)
    .post('/promoters')
    .send({
      email: TEST_EMAIL,
      password: 'pass',
    })
    .expect(400)
  t.pass()
})

test('should fail to create with invalid email', async (t) => {
  await supertest(app)
    .post('/promoters')
    .send({
      email: 'not a valid email',
      password: TEST_PASSWORD,
    })
    .expect(400)
  t.pass()
})

test('should fail to login with invalid email', async (t) => {
  await supertest(app)
    .post('/promoters/login')
    .send({
      email: 'this is not a valid email',
      password: TEST_PASSWORD,
    })
    .expect(404)
  t.pass()
})

test('should fail to login with invalid password', async (t) => {
  const TEST_EMAIL = casual.email
  await supertest(app)
    .post('/promoters')
    .send({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    })
    .expect(200)
  await supertest(app)
    .post('/promoters/login')
    .send({
      email: TEST_EMAIL,
      password: 'pass',
    })
    .expect(401)
  t.pass()
})

test('should load promoter by id', async (t) => {
  const TEST_EMAIL = casual.email
  const { body } = await supertest(app)
    .post('/promoters')
    .send({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    })
    .expect(200)
  await supertest(app)
    .get('/promoters')
    .query({
      _id: body._id,
    })
    .expect(401)
  await supertest(app)
    .get('/promoters')
    .query({
      token: body.token,
      _id: body._id,
    })
    .expect(200)
  await supertest(app)
    .get('/promoters')
    .query({
      token: body.token,
    })
    .expect(200)
  t.pass()
})

test('should update promoter', async (t) => {
  const UPDATE_EMAIL = 'update@email.com'
  const DIFF_EMAIL = 'diff@email.com'
  const { body } = await supertest(app)
    .post('/promoters')
    .send({
      email: UPDATE_EMAIL,
      password: TEST_PASSWORD,
    })
    .expect(200)
  await supertest(app)
    .put('/promoters')
    .send({})
    .expect(401)
  await supertest(app)
    .put('/promoters')
    .send({
      token: body.token,
      email: DIFF_EMAIL,
    })
    .expect(204)
  await supertest(app)
    .post('/promoters/login')
    .send({
      email: UPDATE_EMAIL,
      password: TEST_PASSWORD,
    })
    .expect(404)
  await supertest(app)
    .post('/promoters/login')
    .send({
      email: DIFF_EMAIL,
      password: TEST_PASSWORD,
    })
    .expect(200)
  t.pass()
})
