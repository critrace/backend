import test from 'ava'
import supertest from 'supertest'
import app from '..'
import nanoid from 'nanoid'

test.before(async (t) => {
  const TEST_EMAIL = `${nanoid()}@email.com`
  const { body: promoter } = await supertest(app)
    .post('/promoters')
    .send({
      email: TEST_EMAIL,
      password: 'password',
    })
    .expect(200)
  const { body: series } = await supertest(app)
    .post('/series')
    .send({
      token: promoter.token,
      name: 'A Test Series',
    })
    .expect(200)
  const { body: event } = await supertest(app)
    .post('/events')
    .send({
      token: promoter.token,
      name: 'A Test Event',
      startDate: new Date(),
      seriesId: series._id,
    })
  Object.assign(t.context, {
    promoter,
    series,
    event,
  })
})

test('should load single event', async (t) => {
  await supertest(app)
    .get('/events')
    .query({
      _id: t.context.event._id,
    })
    .expect(200)
  t.pass()
})

test('should load series events', async (t) => {
  const { body } = await supertest(app)
    .get('/events')
    .query({
      seriesId: t.context.series._id,
    })
    .expect(200)
  t.true(body.length === 1)
  t.pass()
})

test('should load home events', async (t) => {
  await supertest(app)
    .get('/events/home')
    .expect(200)
  t.pass()
})

test('should delete event', async (t) => {
  const { body } = await supertest(app)
    .post('/events')
    .send({
      token: t.context.promoter.token,
      name: 'Another Event',
      startDate: new Date(),
      seriesId: t.context.series._id,
    })
    .expect(200)
  await supertest(app)
    .delete('/events')
    .send({
      token: t.context.promoter.token,
      _id: body._id,
    })
    .expect(204)
  t.pass()
})

test('should fail to delete event', async (t) => {
  const { body } = await supertest(app)
    .post('/events')
    .send({
      token: t.context.promoter.token,
      name: 'Another Event',
      startDate: new Date(),
      seriesId: t.context.series._id,
    })
    .expect(200)
  await supertest(app)
    .delete('/events')
    .send({
      _id: body._id,
    })
    .expect(401)
  await supertest(app)
    .delete('/events')
    .send({
      token: t.context.promoter.token,
      // Use the series id which should not be found (because it's not an event id)
      _id: t.context.series._id,
    })
    .expect(404)
  const { body: promoter } = await supertest(app)
    .post('/promoters')
    .send({
      email: `${nanoid()}@email.com`,
      password: 'password',
    })
    .expect(200)
  await supertest(app)
    .delete('/events')
    .send({
      token: promoter.token,
      // Use the series id which should not be found (because it's not an event id)
      _id: body._id,
    })
    .expect(401)
  t.pass()
})

test('should load event entries', async (t) => {
  await supertest(app)
    .get('/events/entries')
    .query({
      _id: t.context.event._id,
    })
    .expect(200)
  t.pass()
})
