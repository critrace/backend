import test from 'ava'
import app from '..'
import nanoid from 'nanoid'
import supertest from 'supertest'
import { createPromoter } from './api'
import jwt from 'jsonwebtoken'

test('should fail to decode invalid token', async (t) => {
  await supertest(app)
    .get('/promoters')
    .query({
      token: nanoid(),
    })
    .expect(500)
  t.pass()
})

// Branch logic test in auth middleware
test('should not wrap non-existent _id', async (t) => {
  const { body: promoter } = await createPromoter()
  const token = jwt.sign({ ...promoter, _id: '' }, process.env.WEB_TOKEN_SECRET)
  await supertest(app)
    .get('/promoters')
    .query({
      token,
    })
  t.pass()
})
