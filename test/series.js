import test from 'ava'
import supertest from 'supertest'
import app from '..'
import nanoid from 'nanoid'

test.before(async (t) => {
  const TEST_EMAIL = `${nanoid()}@email.com`
  const { body } = await supertest(app)
    .post('/promoters')
    .send({
      email: TEST_EMAIL,
      password: 'password',
    })
    .expect(200)
  const { body: series } = await supertest(app)
    .post('/series')
    .send({
      token: body.token,
      name: 'The Test Series',
    })
    .expect(200)
  t.context.promoter = body
  t.context.series = series
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

test('should add promoter to series', async (t) => {
  const { body } = await supertest(app)
    .post('/promoters')
    .send({
      email: `${nanoid()}@email.com`,
      password: 'password',
    })
    .expect(200)
  await supertest(app)
    .post('/series/invite')
    .send({
      token: t.context.promoter.token,
      seriesId: t.context.series._id,
      email: body.email,
    })
    .expect(204)
  t.pass()
})

test('should fail to add non-existing promoter', async (t) => {
  await supertest(app)
    .post('/series/invite')
    .send({
      token: t.context.promoter.token,
      seriesId: t.context.series._id,
      email: `${nanoid()}@email.com`,
    })
    .expect(404)
  t.pass()
})

test('should fail to add if not series promoter', async (t) => {
  const { body } = await supertest(app)
    .post('/promoters')
    .send({
      email: `${nanoid()}@email.com`,
      password: 'password',
    })
    .expect(200)
  await supertest(app)
    .post('/series/invite')
    .send({
      token: body.token,
      seriesId: t.context.series._id,
      email: body.email,
    })
    .expect(401)
  t.pass()
})
