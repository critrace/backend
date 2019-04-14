import test from 'ava'
import app from '..'
import nanoid from 'nanoid'
import supertest from 'supertest'

test('should fail to decode invalid token', async (t) => {
  await supertest(app)
    .get('/promoters')
    .query({
      token: nanoid(),
    })
    .expect(500)
  t.pass()
})
