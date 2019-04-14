import test from 'ava'
import supertest from 'supertest'
import app from '..'
import casual from 'casual'

test.before(async (t) => {
  const TEST_EMAIL = casual.email
  const { body } = await supertest(app)
    .post('/promoters')
    .send({
      email: TEST_EMAIL,
      password: 'password',
    })
    .expect(200)
  t.context.promoter = body
})

test('should create series', async (t) => {
  await supertest(app)
    .post('/series')
    .send({
      token: t.context.promoter.token,
      name: 'test series',
    })
    .expect(200)
  t.pass()
})

test('should load series', async (t) => {
  await supertest(app)
    .get('/series')
    .expect(200)
  t.pass()
})

test('should load own series', async (t) => {
  await supertest(app)
    .get('/series/authenticated')
    .query({
      token: t.context.promoter.token,
    })
    .expect(200)
  t.pass()
})

test('should fail to load own series', async (t) => {
  await supertest(app)
    .get('/series/authenticated')
    .expect(401)
  t.pass()
})

test('should get series promoters', async (t) => {
  const { body } = await supertest(app)
    .post('/series')
    .send({
      token: t.context.promoter.token,
      name: 'test series',
    })
    .expect(200)
  const { body: body2 } = await supertest(app)
    .get('/series/promoters')
    .query({
      token: t.context.promoter.token,
      seriesId: body._id,
    })
    .expect(200)
  t.true(body2.length === 1)
  t.pass()
})
