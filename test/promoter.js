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
