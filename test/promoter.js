import test from 'ava'
import supertest from 'supertest'
import app from '..'

test('should create promoter', async (t) => {
  await supertest(app)
    .post('/promoters')
    .send({
      email: 'test@email.com',
      password: 'password',
    })
  t.pass()
})
