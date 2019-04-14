import test from 'ava'
import supertest from 'supertest'
import app from '..'

const TEST_EMAIL = 'test@email.com'
const TEST_PASSWORD = 'password'

test.serial('should create promoter', async (t) => {
  await supertest(app)
    .post('/promoters')
    .send({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    })
    .expect(200)
  t.pass()
})

test.serial('should fail to create duplicate email', async (t) => {
  await supertest(app)
    .post('/promoters')
    .send({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    })
    .expect(400)
  t.pass()
})

test.serial('should login with promoter', async (t) => {
  await supertest(app)
    .post('/promoters/login')
    .send({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    })
    .expect(200)
  t.pass()
})

test('should fail with invalid email', async (t) => {
  await supertest(app)
    .post('/promoters')
    .send({
      email: 'this is not a valid email',
      password: 'password',
    })
    .expect(400)
  t.pass()
})

test('should fail with invalid password', async (t) => {
  await supertest(app)
    .post('/promoters')
    .send({
      email: 'valid@email.com',
      password: 'pass',
    })
    .expect(400)
  t.pass()
})
